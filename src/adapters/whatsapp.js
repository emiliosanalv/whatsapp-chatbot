/**
 * Send a plain text chat to WhatsApp.
 *
 * @param {string} to – The person's WhatsApp ID.
 * @param {string} body – The words we want to send.
 * @param {Object} env – Needs WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID.
 */
export async function sendText(to, body, env) {
    const url =
      `https://graph.facebook.com/v22.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        text: { body },
      }),
    });
  }
  
  /**
   * Show "typing…" and mark the chat as read.
   *
   * @param {string} messageId – The message ID we got from the user.
   * @param {Object} env – Needs WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID.
   */
  export async function sendTypingIndicator(messageId, env) {
    const url =
      `https://graph.facebook.com/v22.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
        typing_indicator: { type: "text" },
      }),
    });
  }
  
  /**
   * Read a webhook from WhatsApp and find who wrote and what they said.
   * Gives back `{ from, body, name }` or `null` if we should do nothing.
   */
  export function parseIncoming(payload) {
    const change = payload?.entry?.[0]?.changes?.[0];
    const msg = change?.value?.messages?.[0];
    
    // If it's a status update, just log it and stop.
    if (change?.value?.statuses) {
      console.log("Received status update:", JSON.stringify({
        type: "status_update",
        status: change.value.statuses[0]?.status,
        message_id: change.value.statuses[0]?.id
      }));
      return null;
    }
    
    if (!msg) return null;
  
    // Voice note (audio message)
    if (msg.type === "audio") {
      return {
        id:   msg.id,
        from: msg.from,
        type: "audio",
        mediaId: msg.audio.id,
        mime:    msg.audio.mime_type,   // Given by WhatsApp
        name: change?.value?.contacts?.[0]?.profile?.name || "User"
      };
    }
  
    if (msg.type !== "text") return null;
    
    // Try to get the contact name.
    const contacts = change?.value?.contacts;
    const contact = contacts?.[0];
    const name = contact?.profile?.name || "User";
    
    return {
      id:   msg.id,
      from: msg.from,
      body: msg.text.body.trim(),
      name,
    };
  }
  
  /**
   * Ask WhatsApp for the download link of a media file.
   * We will use it later to fetch the real bytes.
   */
  export async function fetchMediaInfo(mediaId, env) {
    const res = await fetch(`https://graph.facebook.com/v22.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` }
    });
    if (!res.ok) throw new Error(`WA media lookup ${res.status}`);
    // Returns { url, mime_type, ... }
    return await res.json();
  }
  
  export async function downloadMedia(mediaId, env) {
    const { url, mime_type } = await fetchMediaInfo(mediaId, env);
    const bin = await (await fetch(url, {
      headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` }
    })).arrayBuffer();
    // Give back the bytes and the type so OpenAI can use it.
    return { bin, mime_type };
  } 