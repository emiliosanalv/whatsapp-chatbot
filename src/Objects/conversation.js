// src/objects/Conversation.js
import { DurableObject } from "cloudflare:workers";

export class ConversationDemo extends DurableObject {
  /** @type {DurableObjectStorage} */
  storage;

  constructor(ctx, env) {
    super(ctx, env);
    this.storage = ctx.storage;
    this.env = env;
  }

  /** ‑‑‑ internal helper to atomically increment turn counter ‑‑‑ */
  async _nextTurn() {
    return await this.storage.transaction(async txn => {
      const current = (await txn.get("turn")) ?? 0;
      const next    = current + 1;
      await txn.put("turn", next);
      return next;
    });
  }

  /** Return full history array (may be empty). */
  async getHistory() {
    const messages = (await this.storage.get("messages")) || [];
    // Strip the turn number before sending to LLM
    return messages.map(({ t, ...rest }) => rest);
  }

  /** Accepts either (role, content) OR (msgObject) */
  async append(roleOrMsg, maybeContent) {
    const [history = [], currentTurn = 0] = await Promise.all([
      this.storage.get("messages"),
      this.storage.get("turn"),
    ]);

    const entry =
      typeof roleOrMsg === "object" ? { ...roleOrMsg } : { role: roleOrMsg, content: maybeContent };

    let turn = currentTurn;
    if (entry.role === "user") turn = await this._nextTurn();
    entry.t = turn;

    history.push(entry);

    const kept = history.filter(
      (m) => m.role === "system" || (m.t !== undefined && m.t >= turn - 2)
    );

    await this.storage.put("messages", kept);
    return true;
  }
} 