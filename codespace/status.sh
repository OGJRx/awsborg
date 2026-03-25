#!/bin/bash
# status.sh - Verificación rápida del estado del sistema
# Este script es llamado remotamente para verificar el estado

WAR_DIR="${WORKSPACE_DIR:-/workspaces/stunning-pixel-borg}/.war-machine"

echo "═══════════════════════════════════════════════════════════════"
echo "📊 ESTADO DEL SISTEMA"
echo "═══════════════════════════════════════════════════════════════"

# Verificar estructura
if [ -d "$WAR_DIR" ]; then
    echo "✅ Estructura .war-machine: EXISTE"
else
    echo "❌ Estructura .war-machine: NO EXISTE"
    echo "   Ejecutar: bash .devcontainer/setup.sh"
    exit 1
fi

# Verificar binarios
if [ -f "$WAR_DIR/bin/llama-server" ]; then
    SIZE=$(du -h "$WAR_DIR/bin/llama-server" | cut -f1)
    echo "✅ llama-server: $SIZE"
else
    echo "❌ llama-server: NO COMPILADO"
fi

if [ -f "$WAR_DIR/bin/cloudflared" ]; then
    echo "✅ cloudflared: INSTALADO"
else
    echo "❌ cloudflared: NO INSTALADO"
fi

# Verificar modelo
if [ -f "$WAR_DIR/models/qwen35-4b.gguf" ]; then
    SIZE=$(du -h "$WAR_DIR/models/qwen35-4b.gguf" | cut -f1)
    echo "✅ Modelo Qwen: $SIZE"
else
    echo "❌ Modelo Qwen: NO DESCARGADO"
fi

# Verificar proceso servidor
if pgrep -f "llama-server" > /dev/null; then
    echo "🟢 Servidor LLM: CORRIENDO"
    PORT=$(netstat -tlnp 2>/dev/null | grep llama-server | awk '{print $4}' | cut -d: -f2)
    echo "   Puerto: $PORT"
else
    echo "🔴 Servidor LLM: DETENIDO"
fi

# Verificar túnel
if pgrep -f "cloudflared" > /dev/null; then
    echo "🟢 Túnel Cloudflare: ACTIVO"
else
    echo "🔴 Túnel Cloudflare: DETENIDO"
fi

echo "═══════════════════════════════════════════════════════════════"
