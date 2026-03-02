# Remediation Report — learlify-backend

> **Fecha:** 2 de marzo de 2026  
> **Rama base:** `main`  
> **Alcance:** Implementación de todos los hallazgos P0 y P1 del audit técnico inicial

---

## Índice

1. [Resumen ejecutivo](#resumen-ejecutivo)
2. [P0 — Seguridad crítica](#p0--seguridad-crítica)
3. [P1 — Mejoras funcionales](#p1--mejoras-funcionales)
4. [Archivos modificados](#archivos-modificados)
5. [Archivos creados](#archivos-creados)
6. [Dependencias añadidas](#dependencias-añadidas)
7. [Variables de entorno requeridas](#variables-de-entorno-requeridas)
8. [Pasos post-despliegue](#pasos-post-despliegue)

---

## Resumen ejecutivo

| Prioridad | Ítems | Estado |
|-----------|-------|--------|
| P0 | 8 | ✅ Completado |
| P1 | 10 | ✅ Completado |
| **Total** | **18** | **✅ 100%** |

---

## P0 — Seguridad crítica

Todos los ítems P0 fueron implementados en una sola sesión antes de mover cambios a Docker.

### P0-01 · CORS permisivo → lista blanca explícita

**Archivo:** `src/middlewares/rootMiddlware.js`

**Problema:** `cors()` sin opciones aceptaba cualquier origen, permitiendo peticiones cross-origin arbitrarias.

**Solución:**
```js
const corsOptions = {
  origin: config.AUTHORIZED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}
app.use(cors(corsOptions))
```

`AUTHORIZED_ORIGINS` definido en `src/config/index.js` con los cuatro dominios del proyecto.

---

### P0-02 · Rate limiting ausente

**Archivos:** `src/middlewares/rateLimit.js` (nuevo), `src/middlewares/rootMiddlware.js`, `src/api/authentication/authentication.routes.js`

**Problema:** Sin límite de peticiones; endpoints de auth expuestos a fuerza bruta.

**Solución:**
- `globalLimiter`: 200 req / 15 min por IP — aplicado a todas las rutas
- `authLimiter`: 5 req / 15 min por IP — aplicado a `/register`, `/login`, `/forgot`

---

### P0-03 · JWT sin expiración

**Archivos:** `src/api/jwt/jwt.service.js`, `src/api/authentication/authentication.service.js`

**Problema:** `jwt.sign(payload, secret)` sin `expiresIn` generaba tokens que nunca caducaban.

**Solución:** Todos los paths de firma incluyen `{ expiresIn: provider.JWT_EXPIRATION }` (valor: `'30d'`).

---

### P0-04 · JWT_SECRET sin validación al arranque

**Archivo:** `src/config/index.js`

**Problema:** La app arrancaba sin error aunque `JWT_SECRET` no estuviese definido; todos los tokens firmados con `undefined` eran válidos entre sí.

**Solución:** Guard al final del módulo de config:
```js
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}
```

---

### P0-05 · Multer sin límites de tamaño/cantidad de ficheros

**Archivo:** `src/middlewares/index.js`

**Problema:** Subidas de ficheros sin `fileSize` ni límite de items, expuesto a DoS por ficheros grandes.

**Solución:** `limits: { fileSize: config.MULTIPART_FORMDATA.FILESIZE }` + `maxCount: config.MULTIPART_FORMDATA.ITEMS` (5 MB / 5 ficheros).

---

### P0-06 · Manejadores de proceso ausentes

**Archivo:** `src/index.js`

**Problema:** Sin `unhandledRejection`, `uncaughtException` ni `SIGTERM`, el proceso podía terminar silenciosamente o sin cerrar el servidor.

**Solución:**
```js
process.on('unhandledRejection', reason => { logger.error(...); process.exit(1) })
process.on('uncaughtException', err => { logger.error(...); process.exit(1) })
process.on('SIGTERM', () => { server.close(() => process.exit(0)) })
```

---

### P0-07 · `console.log` / `console.error` en producción

**Archivo:** `src/middlewares/handlers.js`

**Problema:** El error handler usaba `console.log` y `console.error`, emitiendo stack traces no estructurados en producción.

**Solución:** Reemplazado por `logger.error(err.message, { stack: err.stack })`.

---

### P0-08 · Bug `isNotified: false` en tarea de paquetes

**Archivo:** `src/tasks/packages.tasks.js`

**Problema:** La condición `isNotified: false` en el update marcaba paquetes como no notificados en lugar de notificados, causando notificaciones duplicadas en cada ciclo del cron.

**Solución:** `isNotified: true`.

---

## P1 — Mejoras funcionales

### P1-01 · Socket.io sin autenticación en handshake

**Archivo:** `src/gateways/socket.js`

**Problema:** Cualquier cliente podía conectarse al WebSocket sin credenciales; la "autenticación" se realizaba mediante el evento `USER_ASSERT` post-conexión, permitiendo acceso temporal sin validar.

**Solución:** Middleware `stream.use()` ejecutado antes de cualquier evento:
```js
this.stream.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token
  if (!token) return next(new Error('unauthorized'))
  jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('unauthorized'))
    socket.user = decoded
    next()
  })
})
```

Clientes que no envíen token o envíen token inválido son rechazados en el handshake, antes de establecer la conexión.

---

### P1-02 · Webhook de Stripe inexistente

**Archivos:** `src/api/stripe/stripe.webhook.js` (nuevo), `src/index.js`

**Problema:** Sin endpoint de webhook, los eventos asíncronos de Stripe (pagos confirmados, suscripciones canceladas, etc.) no se procesaban. La app dependía únicamente del flujo síncrono, que puede fallar si el cliente cierra la conexión antes de respuesta.

**Solución:**
- Nuevo router montado en `/webhooks/stripe`
- Usa `express.raw({ type: 'application/json' })` para preservar el body crudo necesario para la verificación de firma
- Montado en `src/index.js` **antes** del middleware `json()` global
- Responde 400 ante firma inválida, 200 ante evento procesado/duplicado
- Idempotencia via tabla `stripe_events` (ver P1-04)

**Eventos manejados:**
| Evento | Acción |
|--------|--------|
| `payment_intent.succeeded` | Log + extensión futura |
| `payment_intent.payment_failed` | Log de warning |
| `customer.subscription.deleted` | Log + extensión futura |

---

### P1-03 · Stripe sin idempotency keys

**Archivo:** `src/api/stripe/stripe.service.js`

**Problema:** Las llamadas a la API de Stripe se realizaban sin `idempotencyKey`. Un reintento en caso de timeout podía crear duplicados de clientes o cobros dobles.

**Solución:** Idempotency keys derivadas deterministamente con SHA-256:

| Método | Clave |
|--------|-------|
| `addCustomer` | `SHA256("addCustomer:{email}")` |
| `addIntentPayment` | `SHA256("addIntentPayment:{paymentMethodId}:{amount}:{customerId}")` |

---

### P1-04 · Transacciones de base de datos con rollback incorrecto

**Archivo:** `src/api/packages/packages.service.js`

**Problema:** `createTransactionablePackage` usaba `knex.transaction()`, pero el bloque `try/catch` estaba **dentro** del callback de la transacción. Al capturar la excepción y hacer `return { error: true }`, la transacción **comiteaba** aunque hubiese fallado, dejando la base de datos en estado inconsistente.

**Solución:** El `try/catch` se movió **fuera** del callback. Cualquier `throw` dentro hace que Knex ejecute el rollback automáticamente. El catch externo devuelve `{ error: true }` al controller sin suprimir el rollback.

```js
// ANTES (rollback no funcionaba)
const trx = await knex.transaction(async trx => {
  try { ... } catch (err) { return { error: true } }  // ← comitea igual
})

// DESPUÉS (rollback correcto)
try {
  const result = await knex.transaction(async trx => {
    // throw aquí → rollback automático
  })
  return result
} catch (err) {
  return { error: true }  // ← después del rollback
}
```

---

### P1-05 · Logs en formato texto no estructurado

**Archivo:** `src/utils/logger.js`

**Problema:** Winston usaba `printf` con formato de texto libre, incompatible con agregadores de logs (Datadog, CloudWatch, Loki) que esperan JSON.

**Solución:** Formato cambiado a `combine(errors({ stack: true }), timestamp, json())`. Los logs de consola mantienen `colorize + simple` para legibilidad en desarrollo.

---

### P1-06 · Sin rotación de logs

**Archivo:** `src/utils/logger.js`

**Problema:** El transport `File` de Winston acumulaba un único fichero `logs.log` sin límite efectivo, con rotación manual por tamaño (`maxsize`/`maxFiles`) que no comprimía ni respetaba fechas.

**Solución:** Transporte reemplazado por `winston-daily-rotate-file`:

| Parámetro | Valor |
|-----------|-------|
| Patrón | `app-YYYY-MM-DD.log` |
| Compresión | gzip (`.gz`) |
| Retención | 14 días |
| Tamaño máximo | 20 MB por fichero |

---

### P1-07 · Typo `SENDGRIND_API_KEY` con ventana de deprecación

**Archivo:** `src/config/index.js`

**Problema:** La variable de entorno estaba definida como `SENDGRIND_API_KEY` (typo). Renombrarla directamente rompería configuraciones existentes en producción sin periodo de transición.

**Solución:**
```js
SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || process.env.SENDGRIND_API_KEY
```

- Si sólo existe `SENDGRIND_API_KEY` → se usa el valor y se emite `console.warn` de deprecación
- Si no existe ninguna → `throw new Error(...)` en arranque
- `SENDGRIND_API_KEY` puede eliminarse del `.env` cuando se haya migrado

---

### P1-08 · bcrypt síncrono bloqueando el event loop

**Archivos:** `src/api/authentication/authentication.service.js`, `src/api/authentication/authentication.controller.js`, `src/api/admin/admin.controller.js`, `src/api/users/users.controller.js`

**Problema:** `bcrypt.hashSync` y `bcrypt.compareSync` bloquean el hilo de Node.js durante el cálculo del hash (factor de coste 10 ≈ 100 ms). Bajo carga, esto degrada todas las rutas concurrentes.

**Solución:**
- `hash()`, `compareHash()`, `generateRandomPassword()` → `async`
- Todos los callers actualizados con `await`

**Callers actualizados:**

| Archivo | Método |
|---------|--------|
| `authentication.controller.js` | `signUp` (hash password) |
| `authentication.controller.js` | `signIn` (compareHash) |
| `authentication.controller.js` | `resetPassword` (hash password) |
| `authentication.controller.js` | `googleSignIn` (generateRandomPassword) |
| `authentication.controller.js` | `facebookSignIn` (generateRandomPassword) |
| `admin.controller.js` | `createUser` (generateRandomPassword) |
| `users.controller.js` | `update` (hash password) |

---

### P1-09 · Path de dotenv hardcodeado en knexfile

**Archivo:** `src/config/knexfile.js`

**Problema:** `require('dotenv').config({ path: '../../.env' })` usa una ruta relativa hardcodeada al directorio del fichero. En CI (donde el working directory puede ser diferente), el `.env` no se carga y las migraciones fallan con credenciales vacías.

**Solución:**
```js
const dotenvPath =
  process.env.DOTENV_CONFIG_PATH ||
  require('path').resolve(process.cwd(), '.env')
require('dotenv').config({ path: dotenvPath })
```

En CI basta con exportar `DOTENV_CONFIG_PATH=/workspace/.env` (o el path correspondiente).

---

### P1-10 · Sin validación de variables de entorno al arranque

**Archivo:** `src/config/index.js`

**Problema:** Variables críticas como `STRIPE_API_KEY`, `TWILIO_*` o `AWS_*` no tenían ninguna validación. La app arrancaba y fallaba en tiempo de ejecución (primera petición que necesitase el servicio), en lugar de fallar inmediatamente al arrancar.

**Solución:** Validación al carga del módulo `config`:
- `JWT_SECRET`: `throw` — sin esto la app no puede arrancar de forma segura
- `SENDGRID_API_KEY`: `throw` — el envío de mails es parte del flujo de registro
- `STRIPE_API_KEY`, `TWILIO_*`, `AWS_*`: `console.warn` — permiten arrancar en entornos que no usen todos los servicios (p.ej. staging sin Stripe)

---

## Archivos modificados

| Archivo | P0 | P1 | Cambio principal |
|---------|----|----|-----------------|
| `src/middlewares/rootMiddlware.js` | ✅ | ✅ | CORS lista blanca, globalLimiter, requestId |
| `src/api/jwt/jwt.service.js` | ✅ | — | `expiresIn` en sign() |
| `src/api/authentication/authentication.service.js` | ✅ | ✅ | expiresIn JWT, bcrypt async |
| `src/api/authentication/authentication.controller.js` | — | ✅ | await en hash/compareHash/generateRandomPassword |
| `src/api/authentication/authentication.routes.js` | ✅ | — | authLimiter en /register, /login, /forgot |
| `src/api/admin/admin.controller.js` | — | ✅ | await generateRandomPassword |
| `src/api/users/users.controller.js` | — | ✅ | await hash |
| `src/api/packages/packages.service.js` | — | ✅ | try/catch fuera de knex.transaction |
| `src/api/stripe/stripe.service.js` | — | ✅ | Idempotency keys SHA-256 |
| `src/gateways/socket.js` | — | ✅ | Middleware JWT en handshake |
| `src/middlewares/handlers.js` | ✅ | — | console.log → logger.error |
| `src/tasks/packages.tasks.js` | ✅ | — | isNotified: true (bug fix) |
| `src/utils/logger.js` | — | ✅ | JSON format, DailyRotateFile |
| `src/config/index.js` | ✅ | ✅ | JWT_SECRET guard, SENDGRID typo, env validation |
| `src/config/knexfile.js` | ✅ | ✅ | try/catch @babel/register, DOTENV_CONFIG_PATH |
| `src/index.js` | ✅ | ✅ | process handlers, stripeWebhook mount |

---

## Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `src/middlewares/rateLimit.js` | globalLimiter + authLimiter (express-rate-limit) |
| `src/middlewares/requestId.js` | Middleware UUID por petición, header X-Request-Id |
| `src/api/stripe/stripe.webhook.js` | Endpoint POST /webhooks/stripe con verificación de firma e idempotencia |
| `src/migrations/20250618000001_create_stripe_events_table.js` | Tabla `stripe_events` para idempotencia de webhooks |
| `Dockerfile` | Multi-stage build, node:18-alpine, usuario no-root |
| `.dockerignore` | Exclusiones para imagen Docker |
| `docker-compose.yml` | App + MySQL 8.0, healthcheck, volumen db/init |
| `AUDIT.md` | Audit técnico inicial (12 hallazgos) |
| `UPGRADE_PLAN.md` | Plan de upgrade de 26 dependencias en 3 waves |

---

## Dependencias añadidas

```json
{
  "uuid": "^9.x",
  "winston-daily-rotate-file": "^4.x"
}
```

---

## Variables de entorno requeridas

Las siguientes variables son nuevas o cambian de nombre respecto al estado anterior.

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `JWT_SECRET` | **Sí** | Secreto de firma JWT |
| `SENDGRID_API_KEY` | **Sí** | API key de SendGrid (reemplaza `SENDGRIND_API_KEY`) |
| `STRIPE_WEBHOOK_SECRET` | **Sí*** | Secreto para verificar firmas del webhook de Stripe |
| `DOTENV_CONFIG_PATH` | No | Path explícito al `.env` para knex CLI en CI |
| `STRIPE_API_KEY` | Recomendada | Sin ella los pagos fallan en runtime |
| `TWILIO_API_ACCOUNT_SID` | Recomendada | Sin ella las clases online fallan |
| `TWILIO_API_KEY_SID` | Recomendada | — |
| `TWILIO_API_KEY_SECRET` | Recomendada | — |
| `AWS_ACCESS_KEY` | Recomendada | Sin ella las subidas a S3 fallan |
| `AWS_SECRET_KEY` | Recomendada | — |

> `SENDGRIND_API_KEY` sigue siendo aceptada como fallback durante la ventana de deprecación, pero emitirá un `[DEPRECATION]` warning al arranque.

---

## Pasos post-despliegue

1. **Ejecutar migración** para crear la tabla de idempotencia de Stripe:
   ```bash
   npx knex migrate:latest --knexfile src/config/knexfile.js
   ```

2. **Añadir `STRIPE_WEBHOOK_SECRET`** al `.env` de producción. Obtenerlo del dashboard de Stripe → Webhooks → endpoint `/webhooks/stripe`.

3. **Registrar el endpoint de webhook** en el dashboard de Stripe apuntando a `https://<dominio>/webhooks/stripe` con los eventos:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.deleted`

4. **Renombrar `SENDGRIND_API_KEY` → `SENDGRID_API_KEY`** en todos los entornos (`.env`, variables en CI/CD, secrets de producción).

5. **Clientes de Socket.io**: deben enviar el JWT en `socket.handshake.auth.token` al conectar:
   ```js
   const socket = io(SERVER_URL, { auth: { token: jwtToken } })
   ```

6. **Crear directorio de logs** si no existe:
   ```bash
   mkdir -p src/logs
   ```
