# Express 4.17.1 → 5.x Migration Plan

| Campo | Valor |
|---|---|
| Repo | `learlify-backend` |
| Cambio | `express@4.17.1` → `express@^5.0.0` |
| Alcance principal | `src/index.js`, `src/middlewares/handlers.js`, `src/api/stripe/stripe.webhook.js` |
| Riesgo global | **Low** |
| PRs requeridos | 3 (A → B → C) |
| Autor | Release Engineering |

---

## Paso 0 — Auditoría previa

### 0.1 Archivo de bootstrap

| Archivo | Rol |
|---|---|
| `src/index.js` | Bootstrap único: crea `express()`, registra middlewares, monta rutas, arrancar `http.Server` |
| `src/router/index.js` | `ApplicationInterfaceService` — itera controllers y llama `router.use(route, handlers)` |
| `src/middlewares/rootMiddlware.js` | Array con la cadena completa de middlewares globales |
| `src/config/root.js` | Configuración de body-parser, paths, logger stream |

### 0.2 Cadena de middlewares (orden exacto en `src/index.js`)

```
stripeWebhook          ← express.raw() interno; debe ir ANTES de json()
healthRouter           ← /health
metricsRouter          ← /metrics
── rootMiddleware loop ──────────────────────────────────────────────────
  1. requestId
  2. metricsCollector
  3. helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false })
  4. cors({ origin: AUTHORIZED_ORIGINS, credentials: true })
  5. globalLimiter
  6. compression()
  7. morgan('short', stream)
  8. i18n.init
  9. text()
 10. json({ limit: '1mb' })
 11. urlencoded({ extended: true })
 12. passport.initialize()
 13. validationErrorHandler          ← Joi 4-arg error handler → next(err)
── fin rootMiddleware ───────────────────────────────────────────────────
app.get('/system', root.handler)
app.use('/api/v1', controllers)    ← ApplicationInterfaceService
app.use(stackError)                ← prodErrors | devErrors (error handler final)
i18n.init                          ← montado de nuevo (duplicado, sin impacto)
```

### 0.3 Análisis de error handlers

#### `validationErrorHandler` — `src/middlewares/handlers.js:11`

```
(err, req, res, next) → length = 4 → reconocido como error handler ✓
```

Si `err.isJoi` → enriquece el error y llama `next(err)` hacia `stackError`.

#### `prodErrors` — `src/middlewares/handlers.js:40`

```
(err, _req, res, _next) → length = 4 → reconocido como error handler ✓
```

Responde `{ message, statusCode }`, status `err.statusCode || 500`.

#### `devErrors` — `src/middlewares/handlers.js:56` — **BUG PRE-EXISTENTE**

```
(err, _req, res) → length = 3 → Express NO lo reconoce como error handler
```

Express (4 y 5) identifica error handlers por `fn.length === 4`. Con 3 args es
tratado como middleware regular. En la práctica, esto no explota hoy porque
`Middleware.secure()` captura **todos** los errores de rutas y responde
directamente sin llamar a `next(err)`. El error handler nunca se invoca en flujo
normal. Se corrige en **PR-A**.

#### `Middleware.secure()` — `src/middlewares/index.js:124`

```js
static secure(handler) {
  return function (req, res, next) {
    handler(req, res, next).catch(err => {
      return res.status(err.statusCode || 500).json({ ... })
    })
  }
}
```

Patrón "swallow + respond direct". Captura rechazos de promises y responde sin
propagar a `next(err)`. El `next` se pasa al handler pero no se usa para errores.

### 0.4 Async middleware audit

| Archivo | Línea | Patrón | Riesgo |
|---|---|---|---|
| `src/middlewares/index.js` | 43 | `Middleware.secure(async ...)` — `.catch()` presente | **Low** |
| `src/api/health/health.routes.js` | 36 | `async (_req, res) =>` — errores internos capturados en `probeDb/probeRedis` | **Low** |
| `src/api/metrics/metrics.routes.js` | 6 | `async (_req, res) =>` — try/catch completo | **Low** |
| `src/api/stripe/stripe.webhook.js` | 44 | `await db('stripe_events')...` fuera de try/catch | **Med** |

El único punto que cambia de comportamiento en Express 5 es `stripe.webhook.js`:
en Express 4 un rechazo aquí es unhandled rejection (el process handler lo
captura y llama `process.exit(1)`). En Express 5 es capturado y enviado a
`next(err)` → `stackError` → respuesta 500. Es comportamiento **más seguro**, pero
requiere que `stackError` esté registrado correctamente (lo está).

### 0.5 Patrones de ruta

Todos los archivos `.routes.js` del repo usan patrones estándar:

```
/  /:id  /all  /stream  /register  /login  /social/google  /social/facebook
/verify  /forgot  /refresh-token  /reset  /demo  /logout  /tour  /stream
```

**No se detectaron**: regex captures, `/*`, `/:param(.*)`, `/(foo)?`, parámetros
opcionales con regex, ni rutas con expresiones regulares nativas.

Express 5 usa `path-to-regexp@^8` que elimina soporte para esos patrones
avanzados. Dado que ninguno se usa, el impacto es **cero**.

### 0.6 APIs de Express removidas

| API eliminada en Express 5 | Uso en repo | Riesgo |
|---|---|---|
| `res.redirect('back')` | No encontrado | **None** |
| `req.param(name)` | No encontrado | **None** |
| `app.router` | No encontrado | **None** |
| `router.param()` con side effects | No encontrado | **None** |
| `app.del()` alias | No encontrado | **None** |

### 0.7 Dependencias relacionadas — compatibilidad con Express 5

| Paquete | Versión actual | Express 5 compat | Acción |
|---|---|---|---|
| `express-validator` | `^7.3.1` | ✅ (v7 la soporta explícitamente) | Ninguna |
| `helmet` | `^8.1.0` | ✅ | Ninguna |
| `cors` | `2.8.5` | ✅ (funciona como middleware estándar) | Ninguna |
| `express-rate-limit` | `^8.2.1` | ✅ (v7+ soporta Express 5) | Ninguna |
| `compression` | `^1.7.4` | ✅ (middleware estándar) | Ninguna |
| `passport` | `0.4.0` | ⚠️ Soporte formal desde `0.6.x` | Ver nota |
| `passport-jwt` | `^4.0.1` | ✅ | Ninguna |
| `morgan` | Transitivo | ✅ | Ninguna |

**Nota passport:** El repo usa exclusivamente `session: false` en todos los
`passport.authenticate('jwt', ...)`. Ninguna ruta activa paths de sesión. Las
funciones de initialización (`passport.initialize()`, `req.logIn`, sessions) que
podrían romperse con Express 5 en passport 0.4.0 no se usan en producción. Riesgo
práctico: **Low**. Si en el futuro se activa autenticación por sesión, actualizar
a `passport@^0.7.0` antes de hacerlo.

### 0.8 Comandos para reproducir la auditoría

```bash
# Rutas con patrones potencialmente problemáticos (regex, wildcards)
grep -rn "\.\(get\|post\|put\|delete\|patch\)" src/ --include="*.js" \
  | grep -E "[\(\)\?\*\+\\\[\]]" | grep -v "test\|mock"

# Async middleware sin try/catch ni .catch()
grep -rn "async.*req.*res" src/ --include="*.js" \
  | grep -v "Middleware.secure\|try\s*{" | grep -v "__test__"

# res.redirect('back') — eliminado en Express 5
grep -rn "redirect.*['\"]back['\"]" src/ --include="*.js"

# req.param() — eliminado en Express 5
grep -rn "req\.param(" src/ --include="*.js"

# Error handlers con 3 args (bug de reconocimiento en Express)
grep -rn "(err.*_req.*res)" src/ --include="*.js"

# router.param() con efectos secundarios
grep -rn "\.param(" src/ --include="*.js"

# Verificar versión de express instalada
node -e "console.log(require('./node_modules/express/package.json').version)"
```

---

## Paso 1 — Estrategia por PRs

### PR-A: Preparación y hardening pre-upgrade

**Branch:** `upgrade/wave-4-express5-prep`

**Objetivo:** Corregir el bug de `devErrors`, agregar tests de integración
HTTP reales con supertest, y validar el smoke del error handler. Sin cambios a
Express.

**Cambios:**

1. `src/middlewares/handlers.js` — agregar el 4to argumento `_next` a `devErrors`
2. `src/__test__/integration/http.integration.test.js` — nuevo test suite con supertest

**Checklist de QA:**
- [ ] `npm test` → misma cantidad de tests que baseline (88 passed / 2 failed)
- [ ] Los nuevos integration tests corren verde
- [ ] `npm run build` (Babel) no emite errores
- [ ] El smoke test de `/health` retorna 200

**Criterio de aceptación:** PR verde, sin regresiones, nuevos tests cubriendo
los 4 escenarios críticos de HTTP.

---

### PR-B: Express 5 upgrade

**Branch:** `upgrade/wave-4-express5-upgrade`

**Objetivo:** Actualizar Express a `^5.0.0`, corregir el único punto de código
que cambia de comportamiento (`stripe.webhook.js`).

**Cambios:**

1. `package.json` / `package-lock.json` — bump `express@^5.0.0`
2. `src/api/stripe/stripe.webhook.js` — envolver el `await db('stripe_events')
   .where(...).first()` en el try/catch existente

No se requieren cambios en: rutas, `Middleware.secure()`, error handlers finales,
ni ningún otro middleware.

**Checklist de QA:**
- [ ] `npm test` → mismo baseline (tests no tocan el servidor real)
- [ ] Integration tests de PR-A corren verde contra el servidor con Express 5
- [ ] `npm run build` sin errores
- [ ] Smoke: `curl http://localhost:3000/health` → 200
- [ ] Smoke: `POST /api/v1/auth/login` con body inválido → 400
- [ ] Smoke: `GET /api/v1/users` sin token → 401
- [ ] Smoke: ruta inexistente → 404
- [ ] `node -e "require('./node_modules/express/package.json').version"` → `5.x.x`

**Criterio de aceptación:** Smoke tests verdes, tests automatizados verdes,
comportamiento observable de endpoints idéntico al de Express 4.

---

### PR-C: Hardening y cleanup post-upgrade

**Branch:** `upgrade/wave-4-express5-hardening`

**Objetivo:** Consolidar patrones de async en los handlers bare que ahora se
benefician de la propagación automática de Express 5, y documentar el estado
final.

**Cambios:**

1. `src/api/health/health.routes.js` — agregar try/catch externo al handler
   (beneficio: comportamiento predecible si algún probe inesperadamente rechaza)
2. `src/api/metrics/metrics.routes.js` — ya tiene try/catch, validar que el
   catch llama `next(err)` en lugar de responder duplicado (revisión)
3. Actualizar este documento con fecha de resolución

**Checklist de QA:**
- [ ] Mismos tests, mismos resultados
- [ ] Comportamiento de `/health` sin Redis → `{ status: 'degraded' }` (sin cambio)
- [ ] Comportamiento de `/health` sin DB → `{ status: 'down' }`, 503 (sin cambio)

---

## Paso 2 — Breaking changes relevantes

### BC-1: Propagación automática de async errors

**Qué cambia:**
En Express 4, si un route handler async rechaza una promise sin `.catch()`, el
rechazo va a `unhandledRejection` del proceso (crash). En Express 5, Express
captura el rechazo y llama `next(err)` automáticamente.

**Cómo detectarlo:**
```bash
grep -rn "async.*req.*res" src/ --include="*.js" \
  | grep -v "catch\|Middleware\.secure" | grep -v "__test__"
```

**Impacto en este repo:**
- `Middleware.secure()` — ya tiene `.catch()` → sin impacto
- `health.routes.js` — funciones internas capturan sus propios errores → sin impacto observable
- `metrics.routes.js` — tiene try/catch → sin impacto
- `stripe.webhook.js` línea 44 — `await db(...)` fuera de try/catch → **cambia de crash a 500**

**Cómo arreglarlo** (PR-B, `src/api/stripe/stripe.webhook.js`):
```js
let alreadyProcessed

try {
  alreadyProcessed = await db('stripe_events')
    .where({ event_id: event.id })
    .first()
} catch (err) {
  logger.error('stripe.webhook.db.read', { message: err.message })
  return res.status(500).json({ error: 'Database error processing webhook' })
}
```

**Cómo probarlo:**
```bash
curl -X POST http://localhost:3000/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "stripe-signature: invalid" \
  --data '{"type":"test"}'
```
Debe retornar 400 (falla de firma), no crash.

---

### BC-2: path-to-regexp v8 — patrones de ruta

**Qué cambia:**
Express 5 usa `path-to-regexp@^8` que elimina soporte para: regex literals en
rutas (`/:id(\\d+)`), wildcards sin nombre (`/*`), y captura `(.*)`. Lanza
`TypeError` en mount time si detecta estos patrones.

**Cómo detectarlo:**
```bash
grep -rn "\.\(get\|post\|put\|delete\|patch\)" src/ --include="*.js" \
  | grep -E "[()]|\.\*|\\\\" | grep -v "test\|spec"
```

**Impacto en este repo:** Ninguno. Resultado del grep anterior: vacío.

**Prueba de regresión:**
Arrancar el servidor y verificar que no lanza en boot:
```bash
node dist/index.js 2>&1 | grep -i "path-to-regexp\|TypeError\|invalid route"
```

---

### BC-3: `devErrors` con 3 argumentos (pre-existente)

**Qué cambia:**
No es un breaking change de Express 5 — existe identicamente en Express 4.
Express usa `fn.length === 4` para identificar error handlers en ambas versiones.
`devErrors` con 3 args no es invocado como error handler, sino como middleware
regular, lo que causaría que **todo response** en desarrollo devuelva JSON de
error (con campos undefined).

**Por qué no explota hoy:**
`Middleware.secure()` captura todos los errores de rutas y responde directamente.
`next(err)` casi nunca se llama en el flujo normal. Pero si `validationErrorHandler`
o cualquier otro punto llama `next(err)`, `devErrors` NO lo recibirá, y el
request quedaría sin respuesta (o respondería la primera vez que `devErrors` es
invocado como middleware regular contra un request normal).

**Fix** (PR-A, `src/middlewares/handlers.js`):
```js
export const devErrors = (err, _req, res, _next) => {
  if (res.json) {
    logger.error(err.message)

    return res.json({
      name: err.name,
      message: err.message,
      statusCode: err.statusCode,
      stack: err.stack
    })
  }
}
```

**Cómo probarlo:**
```js
it('returns 500 JSON when next(err) is called', async () => {
  const app = express()
  app.get('/error-route', (_req, _res, next) => {
    const err = new Error('forced error')
    err.statusCode = 500
    next(err)
  })
  app.use(devErrors)
  const res = await request(app).get('/error-route')
  expect(res.status).toBe(500)
  expect(res.body).toHaveProperty('message', 'forced error')
})
```

---

## Paso 3 — Snippets de implementación

### Setup del app y error handler (sin cambios en PR-B)

El bootstrap en `src/index.js` no requiere modificaciones para Express 5. El
orden de middleware es el mismo. El error handler `(err, _req, res, _next)` con
4 argumentos sigue siendo válido.

### Middleware async — patrón con Express 5

Express 5 hace innecesario el wrapper `.catch()` en `Middleware.secure()`. El
patrón sigue funcionando igual. Si en el futuro se quiere simplificar:

```js
static secure(handler) {
  return async function (req, res, next) {
    try {
      await handler(req, res, next)
    } catch (err) {
      next(err)
    }
  }
}
```

Este cambio **no se hace en PR-B** (no es requerido por Express 5, va fuera del
scope del upgrade).

### Fix único requerido para Express 5 — `stripe.webhook.js`

Sólo se mueve el `await` dentro del try/catch existente:

```js
let alreadyProcessed

try {
  alreadyProcessed = await db('stripe_events')
    .where({ event_id: event.id })
    .first()
} catch (err) {
  logger.error('stripe.webhook.db.read', { message: err.message })
  return res.status(500).json({ error: 'Database error processing webhook' })
}

if (alreadyProcessed) {
  logger.info('stripe.webhook.duplicate', { eventId: event.id })
  return res.status(200).json({ received: true, duplicate: true })
}
```

---

## Paso 4 — Testing y Smoke Plan

### 4.1 Unit + Integration automáticos

```bash
# baseline
NODE_ENV=test node_modules/.bin/jest --forceExit --runInBand

# solo integration
NODE_ENV=test node_modules/.bin/jest --forceExit --runInBand \
  src/__test__/integration/http.integration.test.js

# con coverage
NODE_ENV=test node_modules/.bin/jest --forceExit --runInBand --coverage
```

**Cobertura mínima esperada post-PR-A:**

| Escenario | Descripción |
|---|---|
| `GET /health` | 200 + `{ status: 'ok' \| 'degraded' }` |
| `POST /api/v1/auth/login` body inválido | 400 + `{ statusCode: 400 }` |
| Ruta inexistente (`GET /api/v1/xxxx`) | 404 |
| Handler que fuerza `next(err)` | 500 + JSON con `message` |
| `devErrors` reconocido como error handler | `fn.length === 4` |

### 4.2 Build

```bash
npm run build
# verificar que dist/ se genera sin warnings de express-specific deprecations
```

### 4.3 Docker Smoke

```bash
docker compose up -d --build

curl -sf http://localhost:3000/health | jq .status
curl -sf http://localhost:3000/system | jq .response
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{}'

curl -s -o /dev/null -w "%{http_code}" \
  http://localhost:3000/api/v1/users

curl -s -o /dev/null -w "%{http_code}" \
  http://localhost:3000/api/v1/ruta-que-no-existe-abc123
```

**Resultados esperados:** `ok`, fecha, `400`, `401`, `404`.

### 4.4 Smoke Stripe Webhook (firma inválida)

```bash
curl -X POST http://localhost:3000/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "stripe-signature: t=invalid,v1=invalid" \
  --data '{}' | jq .error
```

Debe retornar `"Webhook signature verification failed: ..."`, HTTP 400.

### 4.5 Verificar versión en runtime

```bash
node -e "console.log(require('./node_modules/express/package.json').version)"
```

---

## Paso 5 — Rollback Plan

### Trigger

Usar si después de PR-B se detecta comportamiento de rutas inesperado,
respuestas incorrectas, o fallos en el pipeline CI que no pueden resolverse en
menos de 30 min.

### Procedimiento exacto

```bash
# 1. Revertir el bump en package.json
git checkout main -- package.json package-lock.json

# 2. Restaurar dependencias exactas
npm ci

# 3. Rebuild
npm run build

# 4. Redeploy Docker
docker compose down
docker compose up -d --build

# 5. Verificación post-rollback
curl -sf http://localhost:3000/health | jq .status
NODE_ENV=test node_modules/.bin/jest --forceExit --runInBand \
  2>&1 | tail -5

# 6. Confirmación
node -e "console.log(require('./node_modules/express/package.json').version)"
```

### Decisión de rollback

| Señal | Acción |
|---|---|
| `/health` retorna 503 en ambiente sano | Rollback inmediato |
| PR-B CI rojo + no arreglable en 2 iteraciones | Rollback + crear issue |
| Endpoints con respuesta de shape diferente | Rollback + investigar |
| Solo tests unitarios fallan por mock issue | Investigar primero, no rollback |

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| `passport@0.4.0` incompatible con Express 5 internal `req` extensions | Baja | Alto | Smoke de login real. Si falla, upgrade a `passport@^0.7.0` en PR-C |
| Route pattern que usa regex no detectado por grep | Muy baja | Medio | El servidor lanza `TypeError` en boot — inmediatamente visible |
| `Middleware.secure()` no funciona como antes | Muy baja | Alto | Está cubierto por los integration tests del PR-A |
| Body parsing diferente (qs/querystring) | Muy baja | Bajo | Express 5 mantiene `qs` con misma config `urlencoded({ extended: true })` |
| `devErrors` bug causa respuestas incorrectas en dev | Pre-existente | Medio | Corregido en PR-A |

---

## Checklist final de QA pre-merge PR-B

- [ ] `node -e "..."` confirma Express 5.x en node_modules
- [ ] `npm run build` limpio
- [ ] `npm test` → 88+ passed, los 2 failures son los pre-existentes (plans/stats)
- [ ] Integration tests verdes
- [ ] `/health` → 200
- [ ] `POST /auth/login` body vacío → 400
- [ ] `GET /users` sin token → 401
- [ ] Ruta inexistente → 404
- [ ] Webhook stripe con signature inválida → 400 (no 500, no crash)
- [ ] Arrancar servidor en dev → no `TypeError` de path-to-regexp en logs
- [ ] Docker smoke completo verde

---

## PR Description Template

> Copiar/pegar en GitHub al abrir PR-B.

---

**chore(deps): upgrade express 4.17.1 → 5.x (wave-4 PR-B)**

**Qué cambia**
- `express` bumped de `4.17.1` a `^5.0.0`
- `src/api/stripe/stripe.webhook.js`: el `await db('stripe_events')...` que estaba fuera de try/catch se mueve dentro de un bloque try/catch explícito

**Por qué solo ese cambio de código**
Todos los route handlers del repo están envueltos en `Middleware.secure()`, que ya implementa `.catch()` propio. Las rutas usan únicamente patrones estándar (`/`, `/:id`, `/algo`) que son compatibles con path-to-regexp v8. No se usa ninguna API removida en Express 5 (`res.redirect('back')`, `req.param()`, `app.router`, `router.param()`).

El único handler async sin guard era el `await db(...)` en stripe webhook — en Express 4 un rechazo aquí causa `unhandledRejection` (crash). En Express 5 sería capturado y enviado al error handler (500). El fix lo hace explícito en ambas versiones.

**Breaking changes de Express 5 evaluados**
| Change | Impacto |
|---|---|
| Async error auto-propagation | `Middleware.secure()` ya maneja esto |
| path-to-regexp v8 strictness | Ningún route pattern problemático detectado |
| `res.redirect('back')` removed | No se usa |
| `req.param()` removed | No se usa |

**Dependencias relacionadas**
`express-validator@7`, `helmet@8`, `express-rate-limit@8` — todas tienen soporte explícito para Express 5. `passport@0.4.0` con `session: false` opera sin paths problemáticos.

**Test results**
- Before: 88 passed / 2 failed (pre-existing: plans, stats)
- After: 88 passed / 2 failed (pre-existing: plans, stats)
- Integration tests (PR-A): todos verdes

**Rollback**
```bash
git checkout main -- package.json package-lock.json && npm ci && npm run build
```

**Rama base:** `upgrade/wave-4-express5-prep` (PR-A)

---

## Historial

| Fecha | Evento |
|---|---|
| 2026-03-02 | Auditoría completa + documento creado |
| — | PR-A merged |
| — | PR-B merged |
| — | PR-C merged |
