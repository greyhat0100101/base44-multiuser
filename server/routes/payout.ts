import { supabase } from "../lib/db.ts";
import { decrypt } from "../lib/crypto.ts";
import { verifyJWT } from "../lib/jwt.ts";

export async function payout(req) {
  const auth = req.headers.get("Authorization");
  if (!auth) return Response.json({ error: "Missing token" }, { status: 401 });

  const token = auth.replace("Bearer ", "");
  const payload = await verifyJWT(token);
  const user_id = payload.user_id;

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", user_id)
    .single();

  const paypal_secret = await decrypt(user.paypal_client_secret);

  const authHeader = btoa(user.paypal_client_id + ":" + paypal_secret);

  const tokenRes = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const tokenJson = await tokenRes.json();
  const accessToken = tokenJson.access_token;

  const body = await req.json();

  const payoutRes = await fetch("https://api-m.paypal.com/v1/payments/payouts", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: crypto.randomUUID(),
        email_subject: "Payment received",
      },
      items: [
        {
          recipient_type: "EMAIL",
          amount: { value: String(body.amount), currency: "USD" },
          receiver: body.email,
        },
      ],
    }),
  });

  const payoutJson = await payoutRes.json();
  return Response.json({ success: true, payout: payoutJson });
}