import { register } from "./routes/register.ts";
import { login } from "./routes/login.ts";
import { payout } from "./routes/payout.ts";

Deno.serve((req) => {
  const url = new URL(req.url);

  if (req.method === "POST" && url.pathname === "/register") return register(req);
  if (req.method === "POST" && url.pathname === "/login") return login(req);
  if (req.method === "POST" && url.pathname === "/payout") return payout(req);

  return Response.json({ error: "Not found" }, { status: 404 });
});