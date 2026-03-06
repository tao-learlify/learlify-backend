# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — builder
#   Instala TODAS las dependencias (devDeps incluidas para TypeScript),
#   compila src/ → dist/ usando tsc y resuelve los alias con tsc-alias,
#   por lo que la imagen final no necesita babel-node ni módulos de compilación.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar manifests primero para aprovechar la caché de capas
COPY package*.json ./

RUN npm ci

# Copiar el código fuente y archivos de configuración necesarios
COPY src/ ./src/
COPY tsconfig.json ./
COPY tsconfig.build.json ./

# Compilar con TypeScript y resolver path aliases
# tsc-alias reemplaza los imports con aliases por rutas relativas
RUN npx tsc -p tsconfig.build.json && npx tsc-alias -p tsconfig.build.json


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — producción
#   Imagen mínima: sólo dependencias de producción + dist/ compilado.
#   Sin devDependencies, sin código fuente TypeScript, sin compiladores.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:18-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copiar manifests e instalar sólo dependencias de producción
COPY package*.json ./
RUN npm ci --omit=dev

# Traer el build desde la etapa anterior
COPY --from=builder /app/dist ./dist

# Copiar archivos necesarios para ejecutar migraciones con Railway CLI
COPY --from=builder /app/src/migrations ./src/migrations
COPY --from=builder /app/src/config/knexfile.ts ./src/config/knexfile.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# El logger escribe en __dirname/../logs/logs.log → dist/logs/logs.log
# Se recomienda montar este directorio como volumen externo
RUN mkdir -p dist/logs

# Exponer el puerto por defecto (configurable vía PORT env var)
EXPOSE 3100

# ── Principio de mínimo privilegio ───────────────────────────────────────────
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
  && chown -R appuser:appgroup /app
USER appuser

# Arrancar la aplicación compilada
CMD ["node", "dist/index.js"]
