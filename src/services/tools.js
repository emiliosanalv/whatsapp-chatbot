// Tool rules (strict mode)
export const TOOL_SCHEMAS = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get current temperature for a given location.",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "City and country e.g. Bogotá, Colombia"
          }
        },
        required: ["location"],
        additionalProperties: false
      },
      strict: true
    }
  }
];

/**
 * Simple fake weather helper.
 * It does not call the real internet. It just makes up a number.
 *
 * @param {{ location:string }} args – The city name.
 * @returns {{ location:string, temperature_c:number }} The city and its (fake) temp.
 */
export async function get_weather({ location }) {
  // TODO: Use a real weather service here later.
  const fakeTemp = 22; // Made-up temperature for this demo
  return { location, temperature_c: fakeTemp };
}

// Quick map so we can find the tool by name.
export const TOOL_EXECUTORS = { get_weather };
