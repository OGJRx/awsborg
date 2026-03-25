# 🧠 FRANKENSTEIN ARCHITECTURE

> **$0 Cost LLM-Powered Telegram Bot**

Sistema de IA dual que combina Cloudflare Workers (24/7 gratuito) + GitHub Codespaces (LLM efímero) + Telegram.

## 🏗️ Arquitectura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    TELEGRAM     │────▶│   BORG-ADMIN    │────▶│ GEMINI / LOCAL  │
│   (Interface)   │     │ (CF Worker 24/7)│     │     (LLM)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   BORG-CLIENT   │
                        │  (Mini App API) │
                        └─────────────────┘
```

## 📦 Workers

| Worker | Propósito | Stack |
|--------|-----------|-------|
| **borg-admin** | Bot Telegram principal | grammY, D1, Gemini SDK |
| **borg-client** | Mini App + API REST | Service Binding, D1 |

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Deploy workers
npm run deploy

# Start Codespace LLM (in Codespace)
./codespace/start-frankenstein.sh
```

## 🔐 Secrets Required

```bash
# GitHub Secrets (CI/CD)
CLOUDFLARE_API_TOKEN=cfut_xxx
TELEGRAM_TOKEN=123456:ABC
GEMINI_API_KEY=AIzaxxx
GH_PAT=ghp_xxx
LLAMA_URL=https://xxx.trycloudflare.com

# Cloudflare Worker Secrets (borg-admin)
wrangler secret put TELEGRAM_TOKEN --name borg-admin
wrangler secret put GEMINI_API_KEY --name borg-admin
wrangler secret put LLAMA_URL --name borg-admin
wrangler secret put GH_PAT --name borg-admin
```

## 📁 Estructura

```
awsborg/
├── borg-admin/           # Worker: Telegram Bot
│   ├── src/index.ts
│   ├── wrangler.toml
│   └── package.json
├── borg-client/          # Worker: Mini App
│   ├── src/index.ts
│   ├── webapp/index.html
│   └── wrangler.toml
├── codespace/            # LLM Scripts
│   ├── start-frankenstein.sh
│   └── auto-tunnel-sync.sh
├── migrations/           # D1 Schema
└── .github/workflows/    # CI/CD
```

## ⚠️ PROHIBICIONES

- ❌ NO KV
- ❌ NO R2
- ✅ D1 Permitido
- ✅ Service Bindings Permitido

## 📊 Comandos

| Comando | Descripción |
|---------|-------------|
| `/start` | Dashboard con selector de modelo |
| `/end` | Terminar sesión actual |
| `/history` | Ver historial de conversación |

## 🔧 Desarrollo

```bash
# Dev mode (local)
npm run dev:admin
npm run dev:client

# Tail logs
npm run tail

# Database
npm run db:migrate
```

## 📈 Estado

```
Progress: 70%
├── ✅ Infrastructure setup
├── ✅ Workers desplegados
├── ✅ Secrets configurados
├── 🔄 Código unificado
└── ⏳ Testing pendiente
```
