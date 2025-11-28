// server/routes/register.ts
import { supabase } from "../lib/db.ts";
import { encrypt } from "../lib/crypto.ts";
import { createToken } from "../lib/jwt.ts";

export async function register(req: Request) {
  try {
    const body = await req.json();

    const {
      email,
      paypal_mode = "sandbox",
      paypal_client_id,
      paypal_client_secret,
      base44_api_key,
    } = body;

    if (!email || !paypal_client_id || !paypal_client_secret || !base44_api_key) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (paypal_mode !== "sandbox" && paypal_mode !== "live") {
      return Response.json(
        { error: "paypal_mode must be 'sandbox' or 'live'" },
        { status: 400 },
      );
    }

    // Encrypt credentials before saving
    const encrypted_client_id = encrypt(paypal_client_id);
    const encrypted_client_secret = encrypt(paypal_client_secret);
    const encrypted_api_key = encrypt(base44_api_key);

    const { data, error } = await supabase.from("users")
      .insert({
        email,
        paypal_mode,
        paypal_client_id: encrypted_client_id,
        paypal_client_secret: encrypted_client_secret,
        base44_api_key: encrypted_api_key,
      })
      .select("*")
      .single();

    if (error) {
      return Response.json({ error }, { status: 500 });
    }

    // FIX: await token creation
    const token = await createToken(data.id);

    return Response.json({ success: true, token });
  } catch (err) {
    return Response.json(
      { error: err.message || "Unknown error" },
      { status: 500 },
    );
  }
}
