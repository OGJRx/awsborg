export const handlePulse = async (request: Request, env: { DB: D1Database }) => {
  const data = await request.json<{ id: string, load: number, zram: number }>();
  if (data.load > 98) return new Response("Overloaded", { status: 503 });
  
  await env.DB.prepare(
    "UPDATE nodes SET load = ?, zram = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(data.load, data.zram, data.id).run();
  return new Response(null, { status: 204 });
};
