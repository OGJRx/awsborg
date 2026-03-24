import { Bot, InlineKeyboard } from "grammy";
import { GoogleGenAI } from "@google/genai";

interface Env {
  TELEGRAM_TOKEN: string;
  GEMINI_API_KEY: string;
  LLAMA_URL: string;
  GH_PAT: string;
  DB: D1Database;
}

interface LlamaResponse {
  content: string;
  tokens_predicted: number;
  model: string;
}

interface CodespaceStatus {
  state: string;
  name: string;
}

// ============ CODESPACE CONTROL ============
const CODESPACE_NAME = "redesigned-space-giggle-r479rw76gq57fjq6";

async function getCodespaceStatus(token: string): Promise<CodespaceStatus> {
  const response = await fetch(
    `https://api.github.com/user/codespaces/${CODESPACE_NAME}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Accept': 'application/vnd.github+json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return await response.json() as CodespaceStatus;
}

async function wakeCodespace(token: string): Promise<{ success: boolean; state: string }> {
  const response = await fetch(
    `https://api.github.com/user/codespaces/${CODESPACE_NAME}/start`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Accept': 'application/vnd.github+json'
      }
    }
  );

  if (!response.ok) {
    return { success: false, state: 'error' };
  }

  const data = await response.json() as CodespaceStatus;
  return { success: true, state: data.state };
}

async function checkLLMHealth(llamaUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${llamaUrl}/health`, {
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

// ============ GEMINI API v1.46.0 (2026) ============
async function callGemini(apiKey: string, prompt: string, history: Array<{role: string, text: string}> = []): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });

  // Construir historial de chat
  const chatHistory = history.map(h => ({
    role: h.role === 'user' ? 'user' : 'model',
    parts: [{ text: h.text }]
  }));

  try {
    // Usar Gemini 3.1 Flash Lite Preview si está disponible, sino 2.0 Flash
    const model = ai.getGenerativeModel({
      model: 'gemini-2.0-flash-exp' // Cambiar a gemini-3.1-flash-lite-preview cuando esté disponible
    });

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.8,
      }
    });

    const result = await chat.sendMessage(prompt);
    return result.response.text() || "(sin respuesta)";
  } catch (e) {
    // Fallback a REST API si el SDK falla
    console.error("SDK error, falling back to REST:", e);
    return await callGeminiREST(apiKey, prompt, history);
  }
}

// Fallback REST API
async function callGeminiREST(apiKey: string, prompt: string, history: Array<{role: string, text: string}> = []): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

  const contents = history.map(h => ({
    role: h.role === 'user' ? 'user' : 'model',
    parts: [{ text: h.text }]
  }));

  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "(sin respuesta)";
}

// ============ LLAMA API ============
async function callLlama(llamaUrl: string, prompt: string): Promise<LlamaResponse> {
  const response = await fetch(`${llamaUrl}/completion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: prompt,
      n_predict: 256,
      temperature: 0.8,
      stop: ["\n\n", "</s>"]
    }),
    signal: AbortSignal.timeout(60000)
  });

  if (!response.ok) {
    throw new Error(`llama-server: ${response.status}`);
  }

  return await response.json() as LlamaResponse;
}

// ============ SESSION MANAGEMENT (D1) ============
async function createSession(db: D1Database, chatId: number, model: 'gemini' | 'local'): Promise<void> {
  await db.prepare(`
    INSERT OR REPLACE INTO chat_sessions (chat_id, model, created_at, active)
    VALUES (?, ?, datetime('now'), 1)
  `).bind(chatId, model).run();
}

async function getSession(db: D1Database, chatId: number): Promise<{ model: string; active: number } | null> {
  return await db.prepare(`
    SELECT model, active FROM chat_sessions WHERE chat_id = ?
  `).bind(chatId).first<{ model: string; active: number }>();
}

async function endSession(db: D1Database, chatId: number): Promise<void> {
  await db.prepare(`
    UPDATE chat_sessions SET active = 0 WHERE chat_id = ?
  `).bind(chatId).run();
}

// ============ MESSAGE HISTORY (D1) ============
async function saveMessage(db: D1Database, chatId: number, role: 'user' | 'assistant', content: string): Promise<void> {
  await db.prepare(`
    INSERT INTO message_history (chat_id, role, content, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `).bind(chatId, role, content).run();
}

async function getHistory(db: D1Database, chatId: number, limit: number = 10): Promise<Array<{role: string, content: string}>> {
  const results = await db.prepare(`
    SELECT role, content FROM message_history
    WHERE chat_id = ?
    ORDER BY created_at DESC LIMIT ?
  `).bind(chatId, limit).all<{role: string, content: string}>();

  return results.results.reverse();
}

// ============ MAIN WORKER ============
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const bot = new Bot(env.TELEGRAM_TOKEN);

    // ===== DASHBOARD /start =====
    bot.command("start", async (ctx) => {
      await endSession(env.DB, ctx.chat!.id);

      const keyboard = new InlineKeyboard()
        .text("🌐 Gemini (Cloud)", "select:gemini")
        .text("🖥️ Local (Codespace)", "select:local")
        .row()
        .text("📊 Estado Sistema", "action:status")
        .text("⚡ Wake Codespace", "action:wake");

      await ctx.reply(
        "🏛️ **BORGPTRON TITANIUMCORE v2.1**\n\n" +
        "Selecciona un modelo de IA para iniciar conversación:\n\n" +
        "• **Gemini 2.0 Flash**: Rápido, en la nube\n" +
        "• **Local Qwen3.5-4B**: Sin censura, en Codespace\n\n" +
        "_Tu conversación se mantendrá hasta que cambies de modelo_",
        {
          parse_mode: "Markdown",
          reply_markup: keyboard
        }
      );
    });

    // ===== SELECCIÓN DE MODELO =====
    bot.callbackQuery(/select:(.+)/, async (ctx) => {
      const model = ctx.match![1];
      const chatId = ctx.chat!.id;

      await ctx.answerCallbackQuery();

      if (model === 'local') {
        const statusMsg = await ctx.editMessageText("🔍 Verificando Codespace...");

        try {
          const csStatus = await getCodespaceStatus(env.GH_PAT);

          if (csStatus.state === 'Shutdown' || csStatus.state === 'Unavailable') {
            await ctx.api.editMessageText(
              chatId,
              statusMsg.message_id,
              "⏳ Codespace dormido. Reactivando... (~2 min)"
            );

            const wakeResult = await wakeCodespace(env.GH_PAT);

            if (!wakeResult.success) {
              await ctx.api.editMessageText(
                chatId,
                statusMsg.message_id,
                "❌ Error al reactivar. Usa '⚡ Wake Codespace'"
              );
              return;
            }

            await ctx.api.editMessageText(
              chatId,
              statusMsg.message_id,
              "⏳ Codespace activo. Esperando LLM..."
            );

            let llmReady = false;
            for (let i = 0; i < 36; i++) {
              await new Promise(r => setTimeout(r, 5000));
              if (await checkLLMHealth(env.LLAMA_URL)) {
                llmReady = true;
                break;
              }
            }

            if (!llmReady) {
              await ctx.api.editMessageText(
                chatId,
                statusMsg.message_id,
                "⚠️ LLM no responde. Ejecuta ./start-frankenstein.sh en Codespace."
              );
              return;
            }
          }

          const llmOk = await checkLLMHealth(env.LLAMA_URL);
          if (!llmOk) {
            await ctx.api.editMessageText(
              chatId,
              statusMsg.message_id,
              "⚠️ LLM no responde. Ejecuta ./start-frankenstein.sh"
            );
            return;
          }
        } catch (e) {
          await ctx.api.editMessageText(
            chatId,
            statusMsg.message_id,
            `❌ Error: ${e instanceof Error ? e.message : 'desconocido'}`
          );
          return;
        }

        await createSession(env.DB, chatId, 'local');

        await ctx.api.editMessageText(
          chatId,
          statusMsg.message_id,
          "🖥️ **LLM Local Conectado**\n\n" +
          "_Qwen3.5-4B-Uncensored_\n\n" +
          "Escribe tu mensaje. Usa /start para volver.",
          { parse_mode: "Markdown" }
        );

      } else if (model === 'gemini') {
        await createSession(env.DB, chatId, 'gemini');

        await ctx.editMessageText(
          "🌐 **Gemini Conectado**\n\n" +
          "_Gemini 2.0 Flash Exp_\n\n" +
          "Escribe tu mensaje. Usa /start para volver.",
          { parse_mode: "Markdown" }
        );
      }
    });

    // ===== ACCIONES DEL DASHBOARD =====
    bot.callbackQuery("action:status", async (ctx) => {
      await ctx.answerCallbackQuery();

      let csStatus = "❓ Desconocido";
      let llmStatus = "❓ Desconocido";

      try {
        const cs = await getCodespaceStatus(env.GH_PAT);
        csStatus = cs.state === 'Available' ? '🟢 Activo' :
                   cs.state === 'Running' ? '🟢 Corriendo' :
                   cs.state === 'Shutdown' ? '🔴 Dormido' :
                   `🟡 ${cs.state}`;

        if (cs.state === 'Available' || cs.state === 'Running') {
          llmStatus = await checkLLMHealth(env.LLAMA_URL) ? '🟢 Online' : '🔴 Offline';
        } else {
          llmStatus = '⚪ (Codespace dormido)';
        }
      } catch {
        csStatus = "🔴 Error API";
      }

      await ctx.editMessageText(
        "📊 **Estado del Sistema**\n\n" +
        `🖥️ Codespace: ${csStatus}\n` +
        `🧠 LLM Local: ${llmStatus}\n` +
        `🌐 Worker: 🟢 Activo\n` +
        `💾 Database: 🟢 Conectada`,
        { parse_mode: "Markdown" }
      );
    });

    bot.callbackQuery("action:wake", async (ctx) => {
      await ctx.answerCallbackQuery("Reactivando...");

      try {
        const result = await wakeCodespace(env.GH_PAT);

        if (result.success) {
          await ctx.editMessageText(
            "⚡ **Codespace Reactivado**\n\n" +
            `Estado: ${result.state}\n\n` +
            "Espera ~2 min antes de usar el LLM Local.",
            { parse_mode: "Markdown" }
          );
        } else {
          await ctx.editMessageText(
            "❌ Error al reactivar. Verifica GH_PAT.",
            { parse_mode: "Markdown" }
          );
        }
      } catch (e) {
        await ctx.editMessageText(
          `❌ Error: ${e instanceof Error ? e.message : 'desconocido'}`,
          { parse_mode: "Markdown" }
        );
      }
    });

    // ===== MENSAJES - CONVERSACIÓN CONTINUA =====
    bot.on("message:text", async (ctx) => {
      const chatId = ctx.chat!.id;
      const text = ctx.message.text;

      if (text.startsWith("/")) return;

      const session = await getSession(env.DB, chatId);

      if (!session || session.active !== 1) {
        await ctx.reply(
          "⚠️ No tienes sesión activa.\n\nUsa /start para seleccionar modelo.",
          { parse_mode: "Markdown" }
        );
        return;
      }

      await saveMessage(env.DB, chatId, 'user', text);

      if (session.model === 'gemini') {
        const statusMsg = await ctx.reply("🌐 Procesando con Gemini...");

        try {
          const history = await getHistory(env.DB, chatId, 10);
          const response = await callGemini(env.GEMINI_API_KEY, text, history);

          await saveMessage(env.DB, chatId, 'assistant', response);

          await ctx.api.editMessageText(
            chatId,
            statusMsg.message_id,
            `🌐 ${response}`,
            { parse_mode: "Markdown" }
          );
        } catch (e) {
          await ctx.api.editMessageText(
            chatId,
            statusMsg.message_id,
            `❌ Error: ${e instanceof Error ? e.message : 'desconocido'}`
          );
        }

      } else if (session.model === 'local') {
        const statusMsg = await ctx.reply("🧠 Procesando con Qwen3.5-4B...");

        const llmOk = await checkLLMHealth(env.LLAMA_URL);
        if (!llmOk) {
          await ctx.api.editMessageText(
            chatId,
            statusMsg.message_id,
            "⏳ LLM no disponible. Verificando..."
          );

          const csStatus = await getCodespaceStatus(env.GH_PAT);

          if (csStatus.state === 'Shutdown') {
            await wakeCodespace(env.GH_PAT);
            for (let i = 0; i < 36; i++) {
              await new Promise(r => setTimeout(r, 5000));
              if (await checkLLMHealth(env.LLAMA_URL)) break;
            }
          }
        }

        try {
          const history = await getHistory(env.DB, chatId, 5);
          const contextPrompt = history.length > 0
            ? history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n') + `\nUser: ${text}`
            : text;

          const result = await callLlama(env.LLAMA_URL, contextPrompt);
          const response = result.content || "(sin respuesta)";

          await saveMessage(env.DB, chatId, 'assistant', response);

          await ctx.api.editMessageText(
            chatId,
            statusMsg.message_id,
            `🧠 ${response}`,
            { parse_mode: "Markdown" }
          );
        } catch (e) {
          await ctx.api.editMessageText(
            chatId,
            statusMsg.message_id,
            `❌ Error: ${e instanceof Error ? e.message : 'desconocido'}\n\n` +
            "¿Codespace activo? ¿Túnel corriendo?"
          );
        }
      }
    });

    // ===== COMANDOS ADICIONALES =====
    bot.command("end", async (ctx) => {
      await endSession(env.DB, ctx.chat!.id);
      await ctx.reply("✅ Sesión terminada. Usa /start para nueva sesión.");
    });

    bot.command("history", async (ctx) => {
      const history = await getHistory(env.DB, ctx.chat!.id, 10);

      if (history.length === 0) {
        await ctx.reply("📭 No hay mensajes en historial.");
        return;
      }

      const formatted = history.map(h =>
        `**${h.role === 'user' ? '👤 Tú' : '🤖 IA'}**: ${h.content.substring(0, 100)}...`
      ).join('\n\n');

      await ctx.reply(`📜 **Historial**:\n\n${formatted}`, { parse_mode: "Markdown" });
    });

    // ===== HANDLE WEBHOOK =====
    try {
      const body = await request.json();
      await bot.init();
      await bot.handleUpdate(body);
      return new Response("OK", { status: 200 });
    } catch (e) {
      console.error("Webhook error:", e);
      return new Response(
        JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};

declare module "grammy" {
  interface ContextFlavor {
    env: Env;
  }
}
