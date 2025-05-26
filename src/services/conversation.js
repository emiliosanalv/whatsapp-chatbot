// src/services/conversation.js
export function conversationStub(env, userId) {
    const id   = env.CONVERSATIONSDEMO.idFromName(userId);
    const stub = env.CONVERSATIONSDEMO.get(id);
  
    /** Combine getHistory + append(user) in two calls */
    stub.fetchHistoryAndAppendUser = async (content) => {
      // First get the history
      const history = await stub.getHistory();
      
      // Then append the user message
      await stub.append("user", content);
      
      return history;
    };
  
    return stub;
  } 