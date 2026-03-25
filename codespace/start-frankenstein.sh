#!/bin/bash
# ============================================================
# START-FRANKENSTEIN.SH - LLM Server + Cloudflare Tunnel
# ============================================================
# Usage: ./start-frankenstein.sh
# Starts llama.cpp server and establishes cloudflared tunnel
# Auto-updates LLAMA_URL secret in Cloudflare
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
LLAMA_PORT=8080
MODEL_NAME="Qwen3.5-4B-Uncensored-Q4_K_M.gguf"
MODEL_URL="https://huggingface.co/bartowski/Qwen3.5-4B-Uncensored-GGUF/resolve/main/${MODEL_NAME}"
WORK_DIR="/workspaces/stunning-pixel-borg"
MODEL_DIR="${WORK_DIR}/models"
LLAMA_DIR="${WORK_DIR}/llama.cpp"

# Cloudflare credentials (set these in environment or secrets)
CF_API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
WORKER_NAME="borg-admin"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     🧠 FRANKENSTEIN ARCHITECTURE - STARTING...           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"

# ============================================================
# 1. Download Model if not exists
# ============================================================
echo -e "\n${YELLOW}[1/5] Checking model...${NC}"

mkdir -p "${MODEL_DIR}"
if [ ! -f "${MODEL_DIR}/${MODEL_NAME}" ]; then
    echo -e "${YELLOW}Downloading ${MODEL_NAME}...${NC}"
    wget -q --show-progress -O "${MODEL_DIR}/${MODEL_NAME}" "${MODEL_URL}"
    echo -e "${GREEN}✅ Model downloaded${NC}"
else
    echo -e "${GREEN}✅ Model already exists${NC}"
fi

# ============================================================
# 2. Build llama.cpp if needed
# ============================================================
echo -e "\n${YELLOW}[2/5] Checking llama.cpp...${NC}"

if [ ! -d "${LLAMA_DIR}" ]; then
    echo -e "${YELLOW}Cloning llama.cpp...${NC}"
    git clone https://github.com/ggerganov/llama.cpp.git "${LLAMA_DIR}"
fi

cd "${LLAMA_DIR}"
if [ ! -f "build/bin/llama-server" ]; then
    echo -e "${YELLOW}Building llama.cpp...${NC}"
    mkdir -p build && cd build
    cmake .. -DCMAKE_BUILD_TYPE=Release
    make -j$(nproc) llama-server
fi

echo -e "${GREEN}✅ llama.cpp ready${NC}"

# ============================================================
# 3. Start LLM Server
# ============================================================
echo -e "\n${YELLOW}[3/5] Starting LLM server on port ${LLAMA_PORT}...${NC}"

# Kill any existing server
pkill -f "llama-server" 2>/dev/null || true
sleep 1

# Start server in background
"${LLAMA_DIR}/build/bin/llama-server" \
    --model "${MODEL_DIR}/${MODEL_NAME}" \
    --port ${LLAMA_PORT} \
    --host 0.0.0.0 \
    --ctx-size 4096 \
    --threads $(nproc) \
    --gpu-layers 0 \
    > /tmp/llama.log 2>&1 &

LLAMA_PID=$!
echo "Server PID: ${LLAMA_PID}"

# Wait for server to be ready
echo -e "${YELLOW}Waiting for server...${NC}"
for i in {1..30}; do
    if curl -s "http://localhost:${LLAMA_PORT}/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ LLM server running on port ${LLAMA_PORT}${NC}"
        break
    fi
    sleep 1
done

if ! curl -s "http://localhost:${LLAMA_PORT}/health" > /dev/null 2>&1; then
    echo -e "${RED}❌ LLM server failed to start${NC}"
    tail -20 /tmp/llama.log
    exit 1
fi

# ============================================================
# 4. Start Cloudflare Tunnel
# ============================================================
echo -e "\n${YELLOW}[4/5] Starting cloudflared tunnel...${NC}"

# Check for cloudflared
if ! command -v cloudflared &> /dev/null; then
    echo -e "${YELLOW}Installing cloudflared...${NC}"
    curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o ~/cloudflared
    chmod +x ~/cloudflared
    export PATH="$PATH:~"
fi

# Kill existing tunnel
pkill -f "cloudflared tunnel" 2>/dev/null || true
sleep 1

# Start tunnel and capture URL
echo -e "${YELLOW}Establishing tunnel...${NC}"
TUNNEL_LOG="/tmp/cloudflared.log"
~/cloudflared tunnel --url "http://localhost:${LLAMA_PORT}" > "${TUNNEL_LOG}" 2>&1 &

TUNNEL_PID=$!
echo "Tunnel PID: ${TUNNEL_PID}"

# Extract tunnel URL
TUNNEL_URL=""
for i in {1..30}; do
    TUNNEL_URL=$(grep -oP 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "${TUNNEL_LOG}" 2>/dev/null | head -1)
    if [ -n "${TUNNEL_URL}" ]; then
        break
    fi
    sleep 1
done

if [ -z "${TUNNEL_URL}" ]; then
    echo -e "${RED}❌ Failed to get tunnel URL${NC}"
    cat "${TUNNEL_LOG}"
    exit 1
fi

echo -e "${GREEN}✅ Tunnel URL: ${TUNNEL_URL}${NC}"

# ============================================================
# 5. Update Cloudflare Secret
# ============================================================
echo -e "\n${YELLOW}[5/5] Updating LLAMA_URL secret...${NC}"

if [ -n "${CF_API_TOKEN}" ]; then
    # Use wrangler to update secret
    echo "${TUNNEL_URL}" | npx wrangler secret put LLAMA_URL --name ${WORKER_NAME}
    echo -e "${GREEN}✅ Secret updated in Cloudflare${NC}"
else
    echo -e "${YELLOW}⚠️  CLOUDFLARE_API_TOKEN not set. Manual update required:${NC}"
    echo -e "    wrangler secret put LLAMA_URL --name ${WORKER_NAME}"
    echo -e "    Value: ${TUNNEL_URL}"
fi

# ============================================================
# Summary
# ============================================================
echo -e "\n${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✅ FRANKENSTEIN IS ALIVE!                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "🧠 LLM Server: http://localhost:${LLAMA_PORT}"
echo -e "🔗 Tunnel URL: ${TUNNEL_URL}"
echo -e "📊 Health: ${TUNNEL_URL}/health"
echo ""
echo -e "Logs:"
echo -e "  - LLM: /tmp/llama.log"
echo -e "  - Tunnel: /tmp/cloudflared.log"
echo ""
echo -e "To stop:"
echo -e "  kill ${LLAMA_PID} ${TUNNEL_PID}"
