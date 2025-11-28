// server/routes/login.ts
import { supabase } from "../lib/db.ts";
import { createToken } from "../lib/jwt.ts";

export async function login(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return Response.json({ error: "Missing email" }, { status: 400 });
    }

    // Look up the user
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (error || !data) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Create JWT token (FIX: add await)
    const token = await createToken(data.id);

    return Response.json({ success: true, token });
  } catch (err) {
    return Response.json({ error: err.message || "Unknown login error" }, {
      status: 500,
    });
  }
}
