import { register } from "./routes/register.ts";
import { login } from "./routes/login.ts";
import { payout } from "./routes/payout.ts";

// Render asigna un puerto dinámico en la variable de entorno PORT.
// Si no se usa, Render no puede conectarse y el servidor queda inaccesible.
const port = Number(Deno.env.get("PORT")) || 8080;

console.log("🚀 Server running on port", port);

Deno.serve({ port }, (req) => {
  const url = new URL(req.url);

  // Ruta para registrar usuario y guardar sus claves PayPal/Base44
  if (req.method === "POST" && url.pathname === "/register") {
    return register(req);
  }

  // Ruta para login y generar JWT
  if (req.method === "POST" && url.pathname === "/login") {
    return login(req);
  }

  // Ruta para payout usando credenciales del usuario
  if (req.method === "POST" && url.pathname === "/payout") {
    return payout(req);
  }

  // Ruta por defecto: si no existe
  return Response.json({ error: "Not found" }, { status: 404 });
});
