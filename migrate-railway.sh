#!/bin/bash
set -e

echo "🚀 Ejecutando migraciones en Railway desde local..."
echo ""

# Verificar que el archivo .env.railway exista
if [ ! -f ".env.railway" ]; then
    echo "❌ Error: El archivo .env.railway no existe"
    echo "📝 Crea el archivo con las credenciales de Railway:"
    echo "   cp .env.example .env.railway"
    echo "   # Luego edita .env.railway con las credenciales de Railway"
    exit 1
fi

echo "✅ Archivo .env.railway encontrado"
echo "🔄 Ejecutando migraciones usando credenciales de Railway..."
echo ""

# Cargar variables del archivo .env.railway y ejecutar migraciones
set -a
source .env.railway
set +a

npm run migrate

echo ""
echo "✅ Migraciones completadas exitosamente en Railway"
