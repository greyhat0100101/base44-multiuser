// server/routes/payout.ts
import { supabase } from "../lib/db.ts";
import { decrypt } from "../lib/crypto.ts";
import { verifyToken } from "../lib/jwt.ts";

export async function payout(req: Request) {
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return Response.json({ error: "Missing token" }, { status: 401 });

    const token = auth.replace("Bearer ", "");
    const payload = verifyToken(token);
    if (!payload) return Response.json({ error: "Invalid token" }, { status: 401 });

    const user_id = payload.user_id;

    // Fetch user
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", user_id)
      .single();

    if (error || !user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { email, amount } = body;

    if (!email || !amount) {
      return Response.json({ error: "Missing payout fields" }, { status: 400 });
    }

    // Decrypt credentials
    const client_id = decrypt(user.paypal_client_id);
    const client_secret = decrypt(user.paypal_client_secret);

    const paypal_url = user.paypal_mode === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

    // 1. OAuth TOKEN
    const credentials = btoa(`${client_id}:${client_secret}`);
    const token_res = await fetch(`${paypal_url}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${credentials}`,
      },
      body: "grant_type=client_credentials",
    });

    const token_data = await token_res.json();

    if (!token_res.ok) {
      return Response.json(
        { error: "PayPal auth failed", details: token_data },
        { status: 400 },
      );
    }

    const access_token = token_data.access_token;

    // 2. Create payout
    const payout_body = {
      sender_batch_header: {
        sender_batch_id: `batch_${Date.now()}`,
        email_subject: "Has recibido un pago",
      },
      items: [
        {
          recipient_type: "EMAIL",
          amount: {
            value: amount.toString(),
            currency: "USD",
          },
          receiver: email,
          note: "Pago desde tu app Base44",
        },
      ],
    };

    const payout_res = await fetch(`${paypal_url}/v1/payments/payouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${access_token}`,
      },
      body: JSON.stringify(payout_body),
    });

    const payout_result = await payout_res.json();

    if (!payout_res.ok) {
      return Response.json(
        { error: "Payout failed", details: payout_result },
        { status: 400 },
      );
    }

    return Response.json({ success: true, payout: payout_result });
  } catch (err) {
    return Response.json({ error: err.message || "Unknown error" }, {
      status: 500,
    });
  }
}
