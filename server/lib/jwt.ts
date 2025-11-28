import { create, verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

const JWT_SECRET = Deno.env.get("JWT_SECRET")!;
const key = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(JWT_SECRET),
  { name: "HMAC", hash: "SHA-256" },
  true,
  ["sign", "verify"],
);

export function signJWT(payload) {
  return create({ alg: "HS256", typ: "JWT" }, payload, key);
}

export async function verifyJWT(jwt) {
  return verify(jwt, key);
}