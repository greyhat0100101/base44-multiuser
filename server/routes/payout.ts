import { supabase } from "../lib/db.ts";
import { decrypt } from "../lib/crypto.ts";
import { verifyToken } from "../lib/jwt.ts";

export async function payout(req: Request) {
  try {
    // 1. Token
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer", "").trim();

    if (!token) return Response.json({ error: "Missing token" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.user_id)
      return Response.json({ error: "Invalid token" }, { status: 401 });

    // 2. Buscar usuario
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", payload.user_id)
      .single();

    if (error || !user) return Response.json({ error: "User not found" }, { status: 404 });

    // 3. Desencriptar credenciales
    const client_id = decrypt(user.paypal_client_id);
    const client_secret = decrypt(user.paypal_client_secret);

    // 4. Leer body
    const { amount, currency, email, note } = await req.json();

    if (!amount || !currency || !email) {
      return Response.json({ error: "Missing required payout fields" }, {
        status: 400,
      });
    }

    // 5. Seleccionar modo
    const paypalBase =
      user.paypal_mode === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";

    // 6. OAuth2 para obtener access token
    const auth = btoa(`${client_id}:${client_secret}`);
    const tokenRes = await fetch(`${paypalBase}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${auth}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json();
      return Response.json({ error: "OAuth error", details: err }, {
        status: tokenRes.status,
      });
    }

    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token;

    // 7. Crear payout
    const payoutBody = {
      sender_batch_header: {
        sender_batch_id: `batch_${Date.now()}`,
        email_subject: "Has recibido un pago",
      },
      items: [
        {
          recipient_type: "EMAIL",
          amount: { value: amount, currency },
          receiver: email,
          note,
        },
      ],
    };

    const payoutRes = await fetch(`${paypalBase}/v1/payments/payouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payoutBody),
    });

    const payoutJson = await payoutRes.json();

    return Response.json({ success: true, paypal_response: payoutJson });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
