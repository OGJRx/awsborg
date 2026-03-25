// ============================================================
// BORG-CLIENT - Frontend Cliente IA Worker
// ============================================================
// Telegram Mini App + API REST
// Stack: TypeScript Strict, Cloudflare Workers, D1
// PROHIBITIONS: NO KV, NO R2
// ============================================================

import indexHtml from '../webapp/index.html';

interface Env {
  DB: D1Database;
  ADMIN: Fetcher;
  ENVIRONMENT: string;
}

interface APIResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ============================================================
// ROUTER
// ============================================================
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // STATIC: Mini App
    if (path === '/' || path === '/index.html') {
      return new Response(indexHtml, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // API: Health Check
    if (path === '/api/health') {
      const health = await checkHealth(env);
      return jsonResponse({ success: true, data: health }, corsHeaders);
    }

    // API: Chat - Proxy to Admin
    if (path === '/api/chat' && request.method === 'POST') {
      return handleChat(request, env, corsHeaders);
    }

    // API: Models List
    if (path === '/api/models') {
      return jsonResponse({
        success: true,
        data: [
          { id: 'gemini', name: 'Gemini 2.0 Flash', type: 'cloud' },
          { id: 'local', name: 'Qwen3.5-4B', type: 'local' }
        ]
      }, corsHeaders);
    }

    // API: Status
    if (path === '/api/status') {
      return handleStatus(env, corsHeaders);
    }

    // API: User Settings
    if (path.startsWith('/api/settings/')) {
      return handleSettings(request, env, path, corsHeaders);
    }

    // 404
    return jsonResponse({ success: false, error: 'Not Found' }, corsHeaders, 404);
  }
};

// ============================================================
// HANDLERS
// ============================================================
async function handleChat(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json() as { message: string; model: string; chat_id: number };
    if (!body.message || !body.chat_id) {
      return jsonResponse({ success: false, error: 'Missing message or chat_id' }, corsHeaders, 400);
    }

    const adminResponse = await env.ADMIN.fetch('https://internal/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const result = await adminResponse.json() as APIResponse;
    return jsonResponse(result, corsHeaders);
  } catch (e) {
    return jsonResponse({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }, corsHeaders, 500);
  }
}

async function handleStatus(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const adminResp = await env.ADMIN.fetch('https://internal/status');
    const status = await adminResp.json();
    return jsonResponse({ success: true, data: status }, corsHeaders);
  } catch (e) {
    return jsonResponse({ success: false, error: 'Admin unavailable' }, corsHeaders, 503);
  }
}

async function handleSettings(
  request: Request,
  env: Env,
  path: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const chatId = parseInt(path.split('/').pop() || '0', 10);
  if (!chatId) {
    return jsonResponse({ success: false, error: 'Invalid chat_id' }, corsHeaders, 400);
  }

  if (request.method === 'GET') {
    const settings = await env.DB.prepare(`
      SELECT model, active FROM chat_sessions WHERE chat_id = ?
    `).bind(chatId).first();
    return jsonResponse({ success: true, data: settings }, corsHeaders);
  }

  if (request.method === 'POST') {
    const body = await request.json() as { model: string };
    await env.DB.prepare(`
      INSERT OR REPLACE INTO chat_sessions (chat_id, model, active, created_at)
      VALUES (?, ?, 1, datetime('now'))
    `).bind(chatId, body.model).run();
    return jsonResponse({ success: true }, corsHeaders);
  }

  return jsonResponse({ success: false, error: 'Method not allowed' }, corsHeaders, 405);
}

// ============================================================
// UTILITIES
// ============================================================
async function checkHealth(env: Env): Promise<{ status: string; database: string; admin: string }> {
  let dbStatus = 'unknown';
  let adminStatus = 'unknown';

  try {
    await env.DB.prepare('SELECT 1').first();
    dbStatus = 'ok';
  } catch { dbStatus = 'error'; }

  try {
    const adminResp = await env.ADMIN.fetch('https://internal/health');
    adminStatus = adminResp.ok ? 'ok' : 'error';
  } catch { adminStatus = 'error'; }

  return {
    status: dbStatus === 'ok' && adminStatus === 'ok' ? 'healthy' : 'degraded',
    database: dbStatus,
    admin: adminStatus
  };
}

function jsonResponse(data: APIResponse, corsHeaders: Record<string, string>, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}
