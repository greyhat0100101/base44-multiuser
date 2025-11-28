import { supabase } from "../lib/db.ts";
import { encrypt } from "../lib/crypto.ts";
import { signJWT } from "../lib/jwt.ts";

export async function register(req) {
  const body = await req.json();
  const { email, paypal_client_id, paypal_client_secret, base44_api_key } = body;

  if (!email || !paypal_client_id || !paypal_client_secret)
    return Response.json({ error: "Missing fields" }, { status: 400 });

  const encryptedSecret = await encrypt(paypal_client_secret);
  const encryptedB44 = base44_api_key ? await encrypt(base44_api_key) : null;

  const { data, error } = await supabase
    .from("users")
    .insert({
      email,
      paypal_client_id,
      paypal_client_secret: encryptedSecret,
      base44_api_key: encryptedB44,
    })
    .select()
    .single();

  if (error) return Response.json({ error }, { status: 500 });

  const jwt = await signJWT({ user_id: data.id });
  return Response.json({ success: true, token: jwt });
}