// server/lib/jwt.ts

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

// Create JWT (HS256)
export async function createToken(user_id: string) {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    user_id,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 días
  };

  const headerEncoded = base64url(encoder.encode(JSON.stringify(header)));
  const payloadEncoded = base64url(encoder.encode(JSON.stringify(payload)));

  const unsignedToken = `${headerEncoded}.${payloadEncoded}`;
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(unsignedToken)),
  );

  const signatureEncoded = base64url(signature);

  return `${unsignedToken}.${signatureEncoded}`;
}

// Verify JWT
export async function verifyToken(token: string) {
  try {
    const [headerB64, payloadB64, sigB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !sigB64) return null;

    const unsigned = `${headerB64}.${payloadB64}`;
    const signature = Uint8Array.from(
      atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0),
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      encoder.encode(unsigned),
    );

    if (!valid) return null;

    const payloadJson = atob(
      payloadB64.replace(/-/g, "+").replace(/_/g, "/"),
    );
    const payload = JSON.parse(payloadJson);

    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch (_e) {
    return null;
  }
}
