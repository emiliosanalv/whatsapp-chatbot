// Entry point of the worker.

import { verifySignature } from "./utils/verifySignature.js";
import { handleIncoming } from "./handlers/messageRouter.js";
import { ConversationDemo } from "./Objects/conversation.js";

export { ConversationDemo };



export default {
  /** @param {Request} request – The incoming web request. */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);


    if (request.method === "GET")  return verifyWebhook(request, env);
    if (request.method === "POST") return quickAck(request, env, ctx);
    return new Response("Method Not Allowed", { status: 405 });
  },
};

function verifyWebhook(request, env) {
  const url = new URL(request.url);
  if (
    url.searchParams.get("hub.mode") === "subscribe" &&
    url.searchParams.get("hub.verify_token") === env.VERIFY_TOKEN
  ) {
    return new Response(url.searchParams.get("hub.challenge"), {
      status: 200,
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });
  }
  return new Response("Forbidden", { status: 403 });
}

async function quickAck(request, env, ctx) {
  // Check the signature to block fake events.
  if (!(await verifySignature(request, env))) {
    return new Response("Bad signature", { status: 403 });
  }

  const payload = await request.json().catch(() => ({}));
  ctx.waitUntil(handleIncoming(payload, env, ctx));

  return new Response("EVENT_RECEIVED", { status: 200 });
}
