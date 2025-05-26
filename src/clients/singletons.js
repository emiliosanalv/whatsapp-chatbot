// Shared single-instance helpers.
import OpenAI from "openai";
/**
 * Helper that makes something only one time.
 * The very first call sets it up and later calls reuse it.
 */
function makeLazy(factory) {
  let instance;
  return (...initArgs) => {
    if (!instance) instance = factory(...initArgs);
    return instance;
  };
}

/* ---------- OpenAI ---------- */
export const getOpenAI = makeLazy((env) => 
  new OpenAI({ apiKey: env.OPENAI_API_KEY })
);

