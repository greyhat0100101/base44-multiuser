const secret = Deno.env.get("JWT_SECRET") || "default_secret";
const encoder = new TextEncoder();
const keyData = encoder.encode(secret);

// Generate HMAC key
const key = await crypto.subtle.importKey(
  "raw",
  keyData,
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign", "verify"],
);

function base64url(input: Uint8Array) {
  return btoa(String.fromCharCode(...input))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function createToken(user_id: string) {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    user_id,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  };

  const headerEncoded = base64url(encoder.encode(JSON.stringify(header)));
  const payloadEncoded = base64url(encoder.encode(JSON.stringify(payload)));

  const unsigned = `${headerEncoded}.${payloadEncoded}`;

  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(unsigned)),
  );

  const sigEncoded = base64url(signature);

  return `${unsigned}.${sigEncoded}`;
}

export async function verifyToken(token: string) {
  try {
    const [h, p, s] = token.split(".");
    if (!h || !p || !s) return null;

    const unsigned = `${h}.${p}`;
    const signature = Uint8Array.from(
      atob(s.replace(/-/g, "+").replace(/_/g, "/")),
      c => c.charCodeAt(0),
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      encoder.encode(unsigned),
    );

    if (!valid) return null;

    const payload = JSON.parse(
      atob(p.replace(/-/g, "+").replace(/_/g, "/"))
    );

    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}
