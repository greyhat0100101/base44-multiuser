import { supabase } from "../lib/db.ts";
import { signJWT } from "../lib/jwt.ts";

export async function login(req) {
  const body = await req.json();
  const { email } = body;

  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (!data) return Response.json({ error: "User not found" }, { status: 404 });

  const jwt = await signJWT({ user_id: data.id });
  return Response.json({ token: jwt });
}