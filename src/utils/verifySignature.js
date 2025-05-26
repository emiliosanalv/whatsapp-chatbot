/**
 * Make sure the message is really from Meta.
 *
 * @param {Request} req – The web request we got.
 * @param {EnvBindings} env – Needs APP_SECRET inside.
 * @returns {Promise<boolean>} Yes if the secret is right.
 */
export async function verifySignature(req, env) {
    const sigHeader = req.headers.get("x-hub-signature-256") || "";
    if (!sigHeader.startsWith("sha256=")) return false;
  
    const theirHex = sigHeader.slice(7);           // Remove the "sha256=" part.
    const bodyBuf  = await req.clone().arrayBuffer();
  
    // Step 1: Make an HMAC with APP_SECRET
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(env.APP_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const digest = new Uint8Array(
      await crypto.subtle.sign("HMAC", key, bodyBuf)
    );
  
    // Step 2: Turn the bytes into hex letters.
    const ourHex = [...digest]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  
    // Step 3: Compare slowly so hackers cannot guess timing.
    if (ourHex.length !== theirHex.length) return false;
    let diff = 0;
    for (let i = 0; i < ourHex.length; i++)
      diff |= ourHex.charCodeAt(i) ^ theirHex.charCodeAt(i);
  
    return diff === 0;
  } 