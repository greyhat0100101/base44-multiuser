// server/routes/payout.ts

import { supabase } from "../lib/db.ts";
import { decrypt } from "../lib/crypto.ts";
import { verifyToken } from "../lib/jwt.ts";

export async function payout(req: Request) {
  try {
    // -------------------------------
    // 1. Obtener el token limpiamente
    // -------------------------------
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer", "").trim();

    if (!token) {
      return Response.json({ error: "Missing token" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.user_id) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }

    // -------------------------------
    // 2. Buscar usuario por ID
    // -------------------------------
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", payload.user_id)
      .single();

    if (error || !user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // -------------------------------
    // 3. Desencriptar credenciales
    // -------------------------------
    const client_id = decrypt(user.paypal_client_id);
    const client_secret = decrypt(user.paypal_client_secret);

    // -------------------------------
    // 4. Leer body
    // -------------------------------
    const { amount, currency, note } = await req.json();

    if (!amount || !currency) {
      return Response.json({ error: "Missing amount or currency" }, {
        status: 400,
      });
    }

    // -------------------------------
    // 5. Todo OK
    // -------------------------------

    return Response.json({
      success: true,
      message: "Ready to send payout",
      paypal_mode: user.paypal_mode,
      decrypted: {
        client_id,
        client_secret
      }
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
