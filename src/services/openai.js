// OpenAI service helpers.
import { getOpenAI } from "../clients/singletons.js";
import { TOOL_SCHEMAS, TOOL_EXECUTORS } from "./tools.js";

export class OpenAIClient {
  constructor(env) {
    this.env = env;
    this.client = getOpenAI(env);
  }

  /**
   * Chat with OpenAI with tool support
   */
  async chatWithTools(messages, { persist = () => {}, onChunk = () => {} } = {}, model = "gpt-4.1", env = this.env) {
    while (true) {
      const res = await this.client.chat.completions.create({
        model,
        messages,
        tools: TOOL_SCHEMAS,
        parallel_tool_calls: true,
        tool_choice: "auto",
        max_tokens: 512
      });

      const msg = res.choices[0].message;
      const calls = msg.tool_calls || [];

      // Send text content to user
      if (!msg.tool_calls?.length && msg.content?.trim()) onChunk(msg);

      // No tools requested - we're done
      if (!calls.length) return { ...msg, content: msg.content.trim() };

      // Execute all requested tools
      const outputs = await Promise.all(
        calls.map(async (call) => {
          const { name, arguments: argsStr } = call.function || call;
          let args;
          try   { args = JSON.parse(argsStr); }
          catch { return { error: "bad_json_args" }; }

          const fn = TOOL_EXECUTORS[name];
          if (!fn) return { error: "unknown_tool" };

          try { return await fn(args, env); }
          catch (err) {
            return { error: err.message ?? "executor_failed" };
          }
        })
      );

      // Add bot request and tool responses to conversation
      messages.push(msg);
      persist(msg);
      
      calls.forEach((c, i) => {
        const toolMsg = {
          role: "tool",
          name: c.function?.name ?? c.name,
          tool_call_id: c.id ?? c.call_id,
          content: JSON.stringify(outputs[i])
        };
        messages.push(toolMsg);
        persist(toolMsg);
      });
    }
  }
} 