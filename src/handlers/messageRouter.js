import { OpenAIClient } from "../services/openai.js";
import { parseIncoming, sendText, sendTypingIndicator } from "../adapters/whatsapp.js";
import { conversationStub } from "../services/conversation.js";
import { transcribeVoiceNote } from "../services/audio.js";

/**
 * High‑level orchestration for a single WhatsApp inbound event.
 */
export async function handleIncoming(payload, env, ctx) {
  const userMsg = parseIncoming(payload);
  if (!userMsg) {
    // Not a user message, do nothing
    return;
  }
  
  await processMessage(userMsg, payload, env, ctx);
}

/**
 * Core message processing logic
 */
async function processMessage(userMsg, payload, env, ctx) {
  console.log(`Received message from ${userMsg.from}:`, JSON.stringify(userMsg));

  /* ----------   STEP 0: typing indicator   ---------- */
  // Fire‑and‑forget; no await to keep latency minimal
  sendTypingIndicator(userMsg.id, env).catch(() => {});

  /* ----------  AUDIO BRANCH  ---------- */
  if (userMsg?.type === "audio") {
    // 1⃣ Show typing *early* (same as text branch)
    sendTypingIndicator(userMsg.id, env).catch(()=>{});

    // 2⃣ Transcribe
    const { transcript } = await transcribeVoiceNote({ mediaId: userMsg.mediaId, waId: userMsg.from }, env);

    // 3⃣ Pretend the transcript is the user's text
    userMsg.body  = transcript;
    userMsg.text  = transcript;
    console.log(`Voice note → "${transcript}"`);
  }

  const convo = conversationStub(env, userMsg.from);

  // Get conversation history and append user message
  const userContent = `${userMsg.name}: ${userMsg.body}`;
  const history = await convo.fetchHistoryAndAppendUser(userContent);

  // Build message array for OpenAI
  console.log(`Building LLM prompt for ${userMsg.from}`);
  
  const messages = [
    { role: "system", content: "You are a helpful assistant that can answer questions and help with tasks."},
    ...history,
    { role: "user", content: userContent },
  ];

  const llm = new OpenAIClient(env);
  console.log(`Making OpenAI API call for ${userMsg.from}`);
  
  try {
    const assistantMsg = await llm.chatWithTools(
      messages,
      {
        persist: async (m) => {
          ctx.waitUntil(convo.append(m));
          return true;
        },
        onChunk: (m) => {
          const trimmedContent = m.content?.trim();
          if (trimmedContent) {
            console.log(`Sending chunk response to ${userMsg.from}`);
            ctx.waitUntil(sendText(userMsg.from, trimmedContent, env));
          }
        }
      },
      "gpt-4.1",
      { ...env, __current_wa_id: userMsg.from }
    );

    console.log(`OpenAI conversation complete for ${userMsg.from}`);
    await convo.append(assistantMsg);
  } catch (error) {
    console.error(`Error in OpenAI conversation for ${userMsg.from}:`, error);
    ctx.waitUntil(
      sendText(
        userMsg.from,
        "Hubo un pequeño inconveniente técnico de mi lado. 🛠️ Por favor, inténtalo de nuevo en un momento. ¡Gracias por tu paciencia!",
        env
      )
    );
  }
} 