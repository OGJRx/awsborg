import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import { GoogleGenAI } from "@google/genai";

interface Env {
  TELEGRAM_TOKEN: string;
  GEMINI_API_KEY: string;
  LLAMA_URL: string; // URL del túnel cloudflared -> Codespace
  DB: D1Database;
}

interface LlamaResponse {
  content: string;
  tokens_predicted: number;
  model: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const bot = new Bot(env.TELEGRAM_TOKEN);
    const genAI = new GoogleGenAI(env.GEMINI_API_KEY);

    // --- COMANDO START: EL DASHBOARD ---
    bot.command("start", async (ctx) => {
      const keyboard = new InlineKeyboard()
        .text("🧠 Borg Local (Qwen3.5)", "set_local")
        .text("🌐 AI Search (Gemini)", "set_gemini")
        .row()
        .text("📊 Status Sistema", "check_status");

      await ctx.reply("⚡ **AUGEBORG HÍBRIDO v2.0**\n🏴‍☠️ Arquitectura Frankenstein activa.\n\nSelecciona el motor de procesamiento:", {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
    });

    // --- COMANDO CHAT: TEST DIRECTO ---
    bot.command("chat", async (ctx) => {
      const query = ctx.message?.text?.replace("/chat", "").trim();
      if (!query) {
        await ctx.reply("Usage: /chat <tu mensaje>");
        return;
      }

      const statusMsg = await ctx.reply("🧠 Procesando con Qwen3.5-4B...");

      try {
        const llamaResponse = await fetch(`${env.LLAMA_URL}/completion`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: query,
            n_predict: 150,
            temperature: 0.8,
            stop: ["\n\n", "</s>"]
          }),
          signal: AbortSignal.timeout(30000) // 30s timeout para inferencia
        });

        if (!llamaResponse.ok) {
          throw new Error(`llama-server responded ${llamaResponse.status}`);
        }

        const result = await llamaResponse.json() as LlamaResponse;
        const responseText = result.content || "(sin respuesta)";

        await ctx.api.editMessageText(
          ctx.chat.id,
          statusMsg.message_id,
          `🧠 **Qwen3.5-4B** (${result.tokens_predicted} tokens):\n\n${responseText}`,
          { parse_mode: "Markdown" }
        );
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : "Error desconocido";
        await ctx.api.editMessageText(
          ctx.chat.id,
          statusMsg.message_id,
          `❌ Error en inferencia: ${errorMsg}\n\n¿Codespace activo? ¿Túnel cloudflared corriendo?`
        );
      }
    });

    // --- MANEJO DE PREFERENCIAS (D1) ---
    bot.callbackQuery(/set_(local|gemini)/, async (ctx) => {
      const mode = ctx.match![1];
      await env.DB.prepare("INSERT OR REPLACE INTO user_prefs (user_id, mode) VALUES (?, ?)")
        .bind(ctx.from.id, mode).run();

      const text = mode === "local"
        ? "✅ **Modo Borg Local**: Qwen3.5-4B sin censura activado.\n\nUsa /chat <mensaje> para hablar con el modelo."
        : "✅ **Modo Gemini**: Búsqueda web y respuestas rápidas activadas.";

      await ctx.answerCallbackQuery();
      await ctx.editMessageText(text, { parse_mode: "Markdown" });
    });

    // --- STATUS CHECK ---
    bot.callbackQuery("check_status", async (ctx) => {
      let llamaStatus = "🔴 Offline";
      let latency = 0;

      try {
        const start = Date.now();
        const healthCheck = await fetch(`${env.LLAMA_URL}/health`, {
          method: "GET",
          signal: AbortSignal.timeout(5000)
        });
        latency = Date.now() - start;

        if (healthCheck.ok) {
          llamaStatus = `🟢 Online (${latency}ms)`;
        }
      } catch {
        llamaStatus = "🔴 No responde";
      }

      await ctx.answerCallbackQuery();
      await ctx.editMessageText(
        `📊 **Status del Sistema**\n\n` +
        `🧠 LLM (Codespace): ${llamaStatus}\n` +
        `🌐 Cloudflare Worker: 🟢 Activo\n` +
        `💾 D1 Database: 🟢 Conectada\n\n` +
        `📍 LLAMA_URL: \`${env.LLAMA_URL}\``,
        { parse_mode: "Markdown" }
      );
    });

    // --- PROCESAMIENTO DE MENSAJES ---
    bot.on("message:text", async (ctx) => {
      const userId = ctx.from.id;
      const query = ctx.message.text;

      // Ignorar comandos
      if (query.startsWith("/")) return;

      // 1. State Check
      const pref = await env.DB.prepare("SELECT mode FROM user_prefs WHERE user_id = ?")
        .bind(userId).first<{ mode: string }>();
      const mode = pref?.mode || "local";

      const statusMsg = await ctx.reply(
        mode === "local"
          ? "🧠 Despertando al Borg (Qwen3.5-4B)..."
          : "🌀 Consultando Gemini..."
      );

      if (mode === "gemini") {
        // --- PATH GEMINI ---
        try {
          const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp"
          });

          const result = await model.generateContent(
            "Eres un 'Prompt Spartan'. Respuesta directa y concisa.\n\nPREGUNTA: " + query
          );
          await ctx.api.editMessageText(
            ctx.chat.id,
            statusMsg.message_id,
            result.response.text(),
            { parse_mode: "Markdown" }
          );
        } catch (e) {
          await ctx.api.editMessageText(
            ctx.chat.id,
            statusMsg.message_id,
            "❌ Error en Gemini SDK. Nodo saturado."
          );
        }
      } else {
        // --- PATH BORG: LLAMA SERVER ---
        try {
          const llamaResponse = await fetch(`${env.LLAMA_URL}/completion`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: query,
              n_predict: 200,
              temperature: 0.8,
              stop: ["\n\n", "</s>"]
            }),
            signal: AbortSignal.timeout(45000)
          });

          if (!llamaResponse.ok) {
            throw new Error(`llama-server: ${llamaResponse.status}`);
          }

          const result = await llamaResponse.json() as LlamaResponse;

          await ctx.api.editMessageText(
            ctx.chat.id,
            statusMsg.message_id,
            `🧠 ${result.content}`,
            { parse_mode: "Markdown" }
          );
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : "Error desconocido";
          await ctx.api.editMessageText(
            ctx.chat.id,
            statusMsg.message_id,
            `❌ El Borg no responde: ${errorMsg}\n\n¿Codespace activo? ¿Túnel cloudflared corriendo?`
          );
        }
      }
    });

    return webhookCallback(bot, "cloudflare-pages")(request);
  },
};
