import { validateToken } from "./middleware/auth";
import { handleRegister, handlePulse } from "./handlers/nodes";

export default {
  async fetch(request: Request, env: { DB: D1Database; INTERNAL_API_TOKEN: string }) {
    const url = new URL(request.url);
    
    if (url.pathname.startsWith("/nodes")) {
      if (!validateToken(request, env)) return new Response("Unauthorized", { status: 401 });
      
      if (url.pathname === "/nodes/register" && request.method === "POST") return handleRegister(request, env);
      if (url.pathname === "/nodes/pulse" && request.method === "PATCH") return handlePulse(request, env);
    }
    
    return new Response("Not Found", { status: 404 });
  }
};
