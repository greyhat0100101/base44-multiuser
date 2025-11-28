// server/lib/jwt.ts

import {
  create,
  verify,
  getNumericDate,
  Header,
  Payload,
} from "https://deno.land/x/djwt@v2.8/mod.ts";

const secret = Deno.env.get("JWT_SECRET") || "default_secret";

// Convert secret to Uint8Array
const key = new TextEncoder().encode(secret);

// Create JWT
export async function createToken(user_id: string) {
  const header: Header = {
    alg: "HS256",
    typ: "JWT",
  };

  const payload: Payload = {
    user_id,
    exp: getNumericDate(60 * 60 * 24 * 7), // 7 días
  };

  return await create(header, payload, key);
}

// Verify JWT
export async function verifyToken(token: string) {
  try {
    const result = await verify(token, key, "HS256");
    return result;
  } catch (_e) {
    return null;
  }
}
