# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — builder
#   Instala TODAS las dependencias (devDeps incluidas para Babel),
#   compila src/ → dist/ y resuelve los alias de module-resolver en tiempo
#   de compilación, por lo que la imagen final no necesita babel-node.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar manifests primero para aprovechar la caché de capas
COPY package*.json ./
COPY .babelrc ./

RUN npm ci

# Copiar el código fuente
COPY src/ ./src/

# Compilar: los alias (api/, utils/, etc.) se resuelven a paths relativos
# gracias a babel-plugin-module-resolver, por lo que dist/ es autónomo
RUN npx babel src --out-dir dist --copy-files


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — producción
#   Imagen mínima: sólo dependencias de producción + dist/ compilado.
#   Sin devDependencies, sin código fuente, sin Babel.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:18-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copiar manifests e instalar sólo dependencias de producción
COPY package*.json ./
RUN npm ci --omit=dev

# Traer el build desde la etapa anterior
COPY --from=builder /app/dist ./dist

# El logger escribe en __dirname/../logs/logs.log → dist/logs/logs.log
# Se recomienda montar este directorio como volumen externo
RUN mkdir -p dist/logs

# Exponer el puerto por defecto (configurable vía PORT env var)
EXPOSE 3100

# ── Principio de mínimo privilegio ───────────────────────────────────────────
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
  && chown -R appuser:appgroup /app
USER appuser

# Arrancar la aplicación compilada directamente con Node (sin babel-node)
CMD ["node", "dist/index.js"]
