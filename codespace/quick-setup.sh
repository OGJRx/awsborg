#!/bin/bash
# quick-setup.sh - Setup automático completo

set -e
WAR_DIR="${WORKSPACE_DIR:-/workspaces/stunning-pixel-borg}/.war-machine"
BIN_DIR="$WAR_DIR/bin"
MODELS_DIR="$WAR_DIR/models"
LOG_DIR="$WAR_DIR/logs"

mkdir -p "$BIN_DIR" "$MODELS_DIR" "$LOG_DIR"

exec > >(tee -a "$LOG_DIR/setup.log") 2>&1

echo "═══════════════════════════════════════════════════════════════"
echo "🔥 MÁQUINA DE GUERRA - SETUP AUTOMÁTICO"
echo "═══════════════════════════════════════════════════════════════"
echo "📁 Workspace: $WAR_DIR"

# 1. Instalar dependencias
echo "[1/4] Instalando dependencias..."
sudo apt-get update -qq
sudo apt-get install -y -qq build-essential cmake git wget curl unzip

# 2. Compilar llama.cpp
if [ ! -f "$BIN_DIR/llama-server" ]; then
    echo "[2/4] Compilando llama.cpp (~3 min)..."
    cd /tmp
    rm -rf llama.cpp 2>/dev/null
    git clone --depth 1 https://github.com/ggerganov/llama.cpp.git
    cd llama.cpp
    make llama-server -j$(nproc) 2>&1 | tail -5
    cp llama-server "$BIN_DIR/"
    chmod +x "$BIN_DIR/llama-server"
    echo "✅ llama-server: $(du -h $BIN_DIR/llama-server | cut -f1)"
else
    echo "[2/4] ⚡ llama-server ya existe"
fi

# 3. Descargar modelo (TinyLlama - pequeño y rápido)
MODEL_FILE="$MODELS_DIR/tinyllama-q4.gguf"
if [ ! -s "$MODEL_FILE" ]; then
    echo "[3/4] Descargando modelo TinyLlama (~600MB)..."
    wget -q --show-progress -O "$MODEL_FILE" \
      "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf" || \
    wget -q --show-progress -O "$MODEL_FILE" \
      "https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf"
    echo "✅ Modelo: $(du -h $MODEL_FILE | cut -f1)"
else
    echo "[3/4] ⚡ Modelo ya existe: $(du -h $MODEL_FILE | cut -f1)"
fi

# 4. Cloudflared
if [ ! -f "$BIN_DIR/cloudflared" ]; then
    echo "[4/4] Instalando cloudflared..."
    curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o "$BIN_DIR/cloudflared"
    chmod +x "$BIN_DIR/cloudflared"
    echo "✅ cloudflared instalado"
else
    echo "[4/4] ⚡ cloudflared ya existe"
fi

# AUTO-INICIAR SERVIDOR
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "🚀 INICIANDO SERVIDOR AUTOMÁTICAMENTE"
echo "═══════════════════════════════════════════════════════════════"

# Matar procesos previos
pkill -f "llama-server" 2>/dev/null || true
pkill -f "cloudflared" 2>/dev/null || true
sleep 2

# Iniciar servidor LLM
cd "$WAR_DIR"
nohup "$BIN_DIR/llama-server" \
    -m "$MODEL_FILE" \
    --port 8080 \
    --host 0.0.0.0 \
    --ctx-size 2048 \
    --threads $(nproc) \
    > "$LOG_DIR/llama.log" 2>&1 &
LLAMA_PID=$!
echo "🟢 Servidor LLM iniciado (PID: $LLAMA_PID)"

# Esperar inicio
sleep 5

# Iniciar túnel
nohup "$BIN_DIR/cloudflared" tunnel --url http://localhost:8080 \
    > "$LOG_DIR/tunnel.log" 2>&1 &
TUNNEL_PID=$!
echo "🟢 Túnel iniciado (PID: $TUNNEL_PID)"

# Esperar URL
sleep 10
TUNNEL_URL=$(grep -o 'https://[^"]*\.trycloudflare\.com' "$LOG_DIR/tunnel.log" 2>/dev/null | head -1)

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "💀 MÁQUINA DE GUERRA OPERATIVA"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🌐 Túnel: $TUNNEL_URL"
echo ""
echo "Test: curl -X POST '$TUNNEL_URL/completion' -H 'Content-Type: application/json' -d '{\"prompt\":\"Hola\",\"n_predict\":20}'"
echo ""

# Guardar URL en archivo
echo "$TUNNEL_URL" > "$WAR_DIR/tunnel_url.txt"
