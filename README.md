# 🧠 FRANKENSTEIN ARCHITECTURE

> **Monorepo Unificado**: Telegram Bot + Mini App + LLM Integration
> 
> **Stack**: TypeScript Strict | grammY | Cloudflare Workers | D1 (SQLite) | GitHub Codespaces

---

## 📁 Estructura del Proyecto

```
awsborg-unified/
├── .github/workflows/     # CI/CD Automatizado
│   ├── deploy.yml         # 🚀 Deploy automático
│   ├── test.yml           # 🧪 Testing automatizado
│   ├── logs-monitor.yml   # 📡 Live tail logs (1-9 min)
│   ├── health-check.yml   # 🏥 Health check cada 30 min
│   ├── wake-codespace.yml # ⚡ Reactivar Codespace
│   └── cleanup.yml        # 🧹 Limpieza diaria
├── borg-admin/            # Worker: Telegram Bot + AI Handler
├── borg-client/           # Worker: Mini App + API REST
├── codespace/             # Scripts para Codespace LLM
├── migrations/            # D1 Database migrations
└── package.json           # Workspaces config
```

---

## 🔄 GitHub Actions Workflows

### 🚀 Deploy Frankenstein (`deploy.yml`)

**Triggers**: Push a `main` + Manual

**Micro-pasos automatizados**:
1. Pre-flight checks (detección de cambios)
2. TypeScript compilation check
3. Lint y security scan
4. Deploy borg-admin (paralelo)
5. Deploy borg-client (paralelo)
6. D1 Migrations
7. Telegram Webhook setup
8. Post-deploy health check

```yaml
# Trigger manual con opciones
gh workflow run deploy.yml -f environment=production -f skip_tests=false
```

---

### 🧪 Test Frankenstein (`test.yml`)

**Triggers**: Push, PR, Manual

**Micro-pasos automatizados**:
9. Unit tests setup
10. TypeScript strict check
11. Code quality analysis
12. Wrangler config validation
13. Build test
14. Integration tests (mock)

```yaml
# Ejecutar tests manualmente
gh workflow run test.yml
```

---

### 📡 Logs Monitor Live (`logs-monitor.yml`)

**Trigger**: **SOLO MANUAL** - Tiempo configurable 1-9 minutos

**Micro-pasos automatizados**:
15. Setup y validación
16. Live tail borg-admin
17. Live tail borg-client
18. Filtro de logs opcional
19. Formato pretty/json
20. Timeout automático
21. Summary final

```yaml
# Ejemplos de uso:
gh workflow run logs-monitor.yml -f duration=5 -f worker=both

# Solo borg-admin por 3 minutos
gh workflow run logs-monitor.yml -f duration=3 -f worker=borg-admin

# Con filtro de errores
gh workflow run logs-monitor.yml -f duration=9 -f worker=both -f filter="error|Error|ERROR"
```

---

### 🏥 Health Check (`health-check.yml`)

**Triggers**: Cada 30 min + Manual

**Micro-pasos automatizados**:
22. Workers health check
23. Telegram API health
24. Codespace status
25. D1 database health
26. Webhook verification
27. Alertas automáticas
28. Final health report

```yaml
# Trigger manual con reporte detallado
gh workflow run health-check.yml -f detailed=true
```

---

### ⚡ Wake Codespace (`wake-codespace.yml`)

**Trigger**: **SOLO MANUAL**

**Micro-pasos automatizados**:
29. Check current state
30. Wake Codespace via API
31. Wait for available state
32. Wait for LLM ready

```yaml
# Reactivar Codespace y esperar LLM
gh workflow run wake-codespace.yml -f wait_for_llm=true -f timeout=5
```

---

### 🧹 Cleanup & Maintenance (`cleanup.yml`)

**Triggers**: Diario 3 AM UTC + Manual

**Micro-pasos automatizados**:
33. Clean old sessions (>24h)
34. Clean old messages (>7 days)
35. Database statistics

```yaml
# Ejecutar limpieza manual
gh workflow run cleanup.yml
```

---

## 🔐 Secrets Requeridos

Configurar en GitHub Settings > Secrets and variables > Actions:

| Secret | Descripción |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | Token de Cloudflare para Workers |
| `TELEGRAM_TOKEN` | Token del bot de Telegram |
| `GEMINI_API_KEY` | API Key de Google Gemini |
| `LLAMA_URL` | URL del túnel del Codespace |
| `GH_PAT` | GitHub Personal Access Token |

### Configurar Secrets via CLI:

```bash
# Con gh CLI
gh secret set CLOUDFLARE_API_TOKEN --body "YOUR_CF_TOKEN"
gh secret set TELEGRAM_TOKEN --body "YOUR_BOT_TOKEN"
gh secret set GH_PAT --body "YOUR_GH_PAT"
gh secret set GEMINI_API_KEY --body "YOUR_GEMINI_KEY"
gh secret set LLAMA_URL --body "https://YOUR_TUNNEL_URL"
```

---

## 🚀 Quick Start

### 1. Clonar y configurar
```bash
git clone https://github.com/OGJRx/awsborg.git
cd awsborg
npm ci
```

### 2. Configurar secrets en GitHub
```bash
gh secret set TELEGRAM_TOKEN --body "YOUR_BOT_TOKEN"
gh secret set CLOUDFLARE_API_TOKEN --body "YOUR_CF_TOKEN"
```

### 3. Push para deploy automático
```bash
git add . && git commit -m "Deploy" && git push
```

### 4. Verificar deployment
```bash
gh run list --limit 5
```

---

## 📊 Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     TELEGRAM USER                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  borg-admin Worker                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  grammY Bot  │  │  AI Handler  │  │  D1 Session  │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                  │               │
│         ▼                 ▼                  ▼               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Gemini     │  │ Local LLM    │  │   D1 DB      │       │
│  │   (Cloud)    │  │ (Codespace)  │  │ (SQLite)     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  borg-client Worker                          │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │  Mini App    │  │  API REST    │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚠️ PROHIBITIONS

- ❌ **NO KV** - Solo D1 (SQLite)
- ❌ **NO R2** - Sin almacenamiento de objetos
- ✅ **Solo D1** - Base de datos SQLite serverless

---

## 📈 Status Badges

[![Deploy](https://github.com/OGJRx/awsborg/actions/workflows/deploy.yml/badge.svg)](https://github.com/OGJRx/awsborg/actions/workflows/deploy.yml)
[![Test](https://github.com/OGJRx/awsborg/actions/workflows/test.yml/badge.svg)](https://github.com/OGJRx/awsborg/actions/workflows/test.yml)
[![Health Check](https://github.com/OGJRx/awsborg/actions/workflows/health-check.yml/badge.svg)](https://github.com/OGJRx/awsborg/actions/workflows/health-check.yml)

---

## 🤖 Bot Info

- **Bot**: @TITANgearbot
- **Worker**: borg-admin.awsborg.workers.dev
- **Commands**: `/start`, `/end`, `/history`
