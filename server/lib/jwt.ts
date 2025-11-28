// server/lib/jwt.ts
import { create, verify, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

const JWT_SECRET = Deno.env.get("JWT_SECRET") || "defaultsecret";

export function createToken(user_id: string) {
  return create(
    { alg: "HS256", typ: "JWT" },
    {
      user_id,
      exp: getNumericDate(60 * 60 * 24 * 7), // 7 días
    },
    JWT_SECRET,
  );
}

export function verifyToken(token: string) {
  try {
    return verify(token, JWT_SECRET, "HS256");
  } catch (_e) {
    return null;
  }
}
