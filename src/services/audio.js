import { downloadMedia } from "../adapters/whatsapp.js";

/**
 * Download WA audio ➜ transcribe via ElevenLabs Speech-to-Text without storing the audio.
 * Returns { transcript:string }
 */
export async function transcribeVoiceNote({ mediaId, waId }, env) {
  /* 1. download the raw audio from WhatsApp */
  const { bin, mime_type } = await downloadMedia(mediaId, env);

  /* 2. Prepare multipart/form-data payload for ElevenLabs */
  const blob = new Blob([bin], { type: mime_type || "application/octet-stream" });
  const form = new FormData();
  form.set("file", blob, "voice_note" + (mime_type ? `.${mime_type.split("/")[1]}` : ""));
  form.set("model_id", "scribe_v1");           // currently the only supported model
  form.set("tag_audio_events", "false");       // keep output simple – flip if you need the tags
  form.set("diarize", "false");               // we don't need speaker labels for 1-on-1 WA chats
  form.set("language_code", "spa");   // ISO-639-3 for Spanish (or "es" ISO-639-1)

  /* 3. Call ElevenLabs STT API */
  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: {
      "xi-api-key": env.ELEVENLABS_API_KEY
    },
    body: form
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs STT ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const transcript = (data?.text || "").trim();

  return { transcript };
} 