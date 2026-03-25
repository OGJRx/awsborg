#!/bin/bash
# ============================================================
# AUTO-TUNNEL-SYNC.SH - Monitors tunnel URL and updates secret
# ============================================================
# Runs in background, detects URL changes, updates Cloudflare
# Usage: ./auto-tunnel-sync.sh &
# ============================================================

set -e

# Configuration
TUNNEL_LOG="/tmp/cloudflared.log"
WORKER_NAME="borg-admin"
CF_API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
CHECK_INTERVAL=30

# Current known URL
CURRENT_URL=""

echo "🔄 Auto-tunnel-sync started (PID: $$)"

while true; do
    # Extract current tunnel URL
    NEW_URL=$(grep -oP 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "${TUNNEL_LOG}" 2>/dev/null | tail -1)
    
    if [ -n "${NEW_URL}" ] && [ "${NEW_URL}" != "${CURRENT_URL}" ]; then
        echo "🔄 Tunnel URL changed: ${NEW_URL}"
        
        if [ -n "${CF_API_TOKEN}" ]; then
            echo "${NEW_URL}" | npx wrangler secret put LLAMA_URL --name ${WORKER_NAME}
            echo "✅ Secret updated in Cloudflare"
        else
            echo "⚠️ CLOUDFLARE_API_TOKEN not set"
        fi
        
        CURRENT_URL="${NEW_URL}"
    fi
    
    sleep ${CHECK_INTERVAL}
done
