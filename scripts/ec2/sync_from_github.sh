#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# SCRIPT DE SINCRONIZACIÓN EC2 ← GITHUB
# Ejecutar en EC2 después del push desde local
# ═══════════════════════════════════════════════════════════════════════════

set -e

PROJECT_DIR="${PROJECT_DIR:-/opt/augeborg}"
REPO_URL="https://github.com/OGJRx/super-duper-augeborg.git"
BRANCH="${BRANCH:-super-borg-v0.1}"

echo "═══════════════════════════════════════════════════════════════════════════"
echo "🔄 SINCRONIZACIÓN EC2 ← GITHUB"
echo "═══════════════════════════════════════════════════════════════════════════"

# PASO 1: Verificar/Crear directorio del proyecto
if [ ! -d "$PROJECT_DIR" ]; then
    echo "📁 Creando directorio: $PROJECT_DIR"
    sudo mkdir -p "$PROJECT_DIR"
    sudo chown ubuntu:ubuntu "$PROJECT_DIR"
fi

cd "$PROJECT_DIR"

# PASO 2: Clonar o actualizar repositorio
if [ ! -d ".git" ]; then
    echo "📥 Clonando repositorio..."
    git clone -b "$BRANCH" "$REPO_URL" .
else
    echo "🔄 Actualizando repositorio..."
    git fetch origin
    git reset --hard "origin/$BRANCH"
fi

# PASO 3: Limpiar migraciones huérfanas del Frontend
echo "🧹 Limpiando migraciones huérfanas..."
rm -rf augeborg-frontend/migrations 2>/dev/null || true

# PASO 4: Instalar dependencias
echo "📦 Instalando dependencias..."
npm ci --silent 2>/dev/null || npm install --silent

if [ -d "augeborg-backend" ]; then
    echo "📦 Instalando dependencias Backend..."
    npm ci --prefix augeborg-backend --silent 2>/dev/null || npm install --prefix augeborg-backend --silent
fi

if [ -d "augeborg-frontend" ]; then
    echo "📦 Instalando dependencias Frontend..."
    npm ci --prefix augeborg-frontend --silent 2>/dev/null || npm install --prefix augeborg-frontend --silent
fi

# PASO 5: Compilar proyectos
echo "🔨 Compilando Backend..."
if npm run build --prefix augeborg-backend 2>&1; then
    echo "   ✅ Backend compilado"
else
    echo "   ❌ Error compilando Backend"
    exit 1
fi

echo "🔨 Compilando Frontend..."
if npm run build --prefix augeborg-frontend 2>&1; then
    echo "   ✅ Frontend compilado"
else
    echo "   ❌ Error compilando Frontend"
    exit 1
fi

# PASO 6: Desplegar Workers
echo "🚀 Desplegando en Cloudflare..."

if command -v wrangler &> /dev/null; then
    echo "🚀 Desplegando Backend..."
    npx wrangler deploy --config augeborg-backend/wrangler.toml

    echo "🚀 Desplegando Frontend..."
    npx wrangler deploy --config augeborg-frontend/wrangler.toml
else
    echo "⚠️ Wrangler no instalado. Instalando..."
    npm install -g wrangler
    echo "   Ejecuta manualmente:"
    echo "   npx wrangler deploy --config augeborg-backend/wrangler.toml"
    echo "   npx wrangler deploy --config augeborg-frontend/wrangler.toml"
fi

echo "═══════════════════════════════════════════════════════════════════════════"
echo "✅ SINCRONIZACIÓN COMPLETADA"
echo "═══════════════════════════════════════════════════════════════════════════"
