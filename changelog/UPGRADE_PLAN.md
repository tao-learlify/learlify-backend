# Dependency Upgrade Plan — serverv2

> Generado: 2026-03-02 | Base: package.json actual | Rol: Principal Backend Engineer / Release Engineer

---

## 0) Snapshot actual

### Node.js

```bash
# Detectar versión en el host activo
node -v

# Detectar versión dentro del contenedor Docker
docker exec learlify_app node -v
```

En el entorno de desarrollo actual se detectó **v24.12.0 (host)**.
El Dockerfile usa `node:18-alpine`. **Gap crítico**: en producción corre Node 18 mientras el host usa Node 24.
Estandarizar a **Node 22 LTS** (mantenimiento hasta 2027-04) es la recomendación inmediata.

| Entorno | Versión | Estado |
|---|---|---|
| Host (dev) | v24.x | Current — demasiado adelantado para producción |
| Docker / Prod | v18.x | Maintenance LTS — válido, pero quedará EOL 2025-04 |
| **Recomendado** | **v22 LTS** | Active LTS hasta 2027-04 |

### Package manager

```bash
npm --version   # verificar versión actual
```

Asumido: **npm 10.x** (se entrega con Node 22). Se recomienda mantener `package-lock.json` v3.

### Scripts relevantes

| Script | Comando | Notas |
|---|---|---|
| `build` | `rimraf dist && babel src -D --out-dir dist` | Transpila con Babel, sin typecheck |
| `start` | `nodemon ... babel-node src` | Dev con hot-reload |
| `prod` | `cross-env NODE_ENV=production npm run build` | Build + arranque |
| `test` | `jest --forceExit --runInBand` | Sin coverage por defecto |

### Riesgos detectados solo por versiones (vista rápida)

| Paquete | Versión actual | Estado |
|---|---|---|
| `socket.io` | `^2.3.0` | **EOL** — sin soporte oficial desde 2021 |
| `aws-sdk` | `^2.844.0` | **Deprecated** — migrar a v3 modular |
| `stripe` | `^8.135.0` | **Legacy** — v8 sin actualizaciones de seguridad activas |
| `passport` | `0.4.0` | **Outdated** — 5 major versions de atraso |
| `jsonwebtoken` | `8.5.1` | **4 CVEs activos corregidos en v9** |
| `helmet` | `^4.4.1` | **3 major versions de atraso**, CSP defaults cambiados |
| `multer` | `^1.4.2` | Vulnerabilidades conocidas en versiones sin parche |
| `knex` | `^0.21.17` | 3 major versions de atraso (actual: 3.x) |
| `jest` | `^24.8.0` | **4 major versions de atraso** (actual: 29.x) |
| `nodemon` | `1.19.1` | 2 major versions de atraso |
| `@babel/*` | `7.5.5` | **5+ años sin actualizar** |

---

## 1) Estrategia de actualización (principios)

### Estrategia por fases

```
patch/minor primero → majors de bajo riesgo → majors de alto riesgo
```

1. **Nunca actualizar más de 2–3 paquetes por PR/branch**
2. **Patch y minor: se aplican sin branch de feature** — solo verificar con smoke tests
3. **Majors: un paquete = un branch = un PR**
4. **Deps de seguridad (CVEs activos): se aplican en branch `hotfix/` y se mergean primero**
5. **AWS SDK v2 → v3 y Socket.io v2 → v4 son proyectos separados de 1–3 semanas**

### Estrategia de rollback

Cada wave debe garantizar:

```bash
# Antes de cada wave: crear tag de rollback
git tag pre-wave-1-$(date +%Y%m%d)
git push origin pre-wave-1-$(date +%Y%m%d)

# Si falla: revertir package.json y lockfile
git checkout pre-wave-1-<fecha> -- package.json package-lock.json
npm ci
docker compose up -d --build
```

Para producción: mantener la imagen Docker del deploy anterior en el registry. El rollback es `docker pull <image>:<prev-tag> && docker compose up -d`.

### Branching strategy

```
main
 └─ upgrade/wave-1-security        # jsonwebtoken, helmet, cors patch
 └─ upgrade/wave-2-medium          # express, passport, knex
 └─ upgrade/wave-3-socketio        # socket.io 2→4 (proyecto independiente)
 └─ upgrade/wave-3-aws-sdk-v3      # aws-sdk v2→v3 (proyecto independiente)
 └─ upgrade/wave-3-stripe          # stripe 8→actual
 └─ upgrade/wave-3-babel           # @babel/* toolchain
```

### Cómo medir éxito

| Dimensión | Métrica | Herramienta |
|---|---|---|
| Tests pasan | `npm test` → 0 failed | Jest |
| No nuevos CVEs | `npm audit --production` → 0 high/critical | npm |
| Endpoints críticos responden | Smoke test list (ver §2) | supertest / curl |
| Logs limpios | `docker compose logs app` → 0 `UnhandledRejection` | Winston |
| Build time no aumenta > 20% | Cronometrar `npm run build` antes/después | Shell |
| Tokens JWT válidos | Ciclo sign → verify con nueva versión | Jest unit |

---

## 2) Pre-flight checklist (antes de tocar versiones)

### Hygiene del lockfile

```bash
# 1. Verificar integridad del lockfile actual
npm ci

# 2. Ver qué está desactualizado
npm outdated

# 3. Audit de seguridad solo producción
npm audit --production

# 4. Correr tests actuales (capturar baseline)
npm test

# 5. Capturar baseline de build
time npm run build 2>&1 | tail -5
```

### Smoke test checklist mínimo (antes de cada wave)

Antes de mergear a `main`, verificar manualmente o con curl/supertest:

```
[ ] POST /auth/login        → 200 con token JWT
[ ] POST /auth/register     → 201 (o 400 si email duplicado)
[ ] GET  /courses           → 200 con lista (auth required)
[ ] PUT  /users/:id         → 200 actualización
[ ] POST /stripe/payment    → respuesta de Stripe (puede ser 402 en test)
[ ] GET  /notifications     → 200
[ ] WS  connect             → evento "connection" sin error
[ ] POST /upload (S3)       → 200 con URL (requiere AWS config)
```

### Capturar baseline

```bash
# Tamaño del bundle
du -sh dist/

# Tiempo de arranque del servidor
time node dist/index.js &
sleep 3 && curl -s http://localhost:3100/health | head -c 200

# Resultado de npm audit (guardar para comparar después)
npm audit --production --json > audit-baseline.json
```

---

## 3) Matriz de upgrades por paquete

| Package | Current | Target | Tipo | Riesgo | Breaking changes (resumen) | Beneficios | Requiere ver código | Plan de verificación |
|---|---|---|---|---|---|---|---|---|
| `jsonwebtoken` | 8.5.1 | **9.0.3** | major | **High** | `verify()` rechaza tokens sin firma por defecto; RSA keys deben ser ≥2048 bits; 4 CVEs corregidos | Cierra CVE-2022-23529/40/41/39 | Sí — `jwt.service.js`, `jwt.guard.js` | Unit: sign→verify cycle; smoke: POST /auth/login |
| `helmet` | ^4.4.1 | **8.1.0** | major×4 | **High** | CSP `form-action: 'self'` por defecto; COEP/COOP/CORP habilitados; HSTS sube a 365 días; elimina `Expect-CT`; Node 18+ | Headers de seguridad modernos, COEP/COOP/CORP | Sí — `rootMiddlware.js`, ver si hay CSP custom | Smoke: headers en respuesta HTTP |
| `cors` | 2.8.5 | **2.8.5** | — | None | Sin cambio de versión necesario (ya en latest) | — | No | — |
| `express` | 4.17.1 | **4.22.1** (o 5.2.1) | minor→major | Med/High | v5: Node 18+ req; path-to-regexp v8 (ReDoS); promesas rechazadas capturadas como errores; `res.back()` eliminado; `body-parser extended` default `false` | Async error handling nativo; CVE-2024-45590 | Sí — rutas con regex complejas; middlewares async | Todos los endpoints smoke |
| `passport` | 0.4.0 | **0.7.0** | major | Med | `req.logIn` y `req.logOut` ahora async; `session: false` debe ser explícito en algunos contextos | Seguridad en flujo de sesión | Sí — `authentication.service.js`, passport strategy | Smoke: POST /auth/login con JWT |
| `passport-jwt` | 4.0.0 | **4.0.1** | patch | Low | Solo parche menor | Compatibilidad con passport 0.6+ | No | POST /auth/login |
| `knex` | ^0.21.17 | **3.1.0** | major×3 | **High** | Cambio en snake_case client names; `raw()` API modificada; removido support MySQL legacy | Performance, soporte Node 18+ oficialmente | Sí — `config/db.js`, `knexfile.js`, todas las queries raw | Integration tests con DB; smoke todos los endpoints |
| `objection` | ^2.2.1 | **3.1.5** | major | Med | Requiere knex 3.x; algunos cambios en `$relatedQuery` API; TypeScript types refactorizados | Compatibilidad con knex 3; mejoras de tipos | Sí — todos los modelos en `src/api/models/` | Integration tests con DB |
| `mysql` | ^2.17.1 | **2.18.1** | patch | Low | Parche de seguridad solamente | Fix de vulnerabilidades | No | Conexión a DB al arrancar |
| `aws-sdk` | ^2.844.0 | **@aws-sdk/client-s3 v3** | major (rewrite) | **High** | API completamente diferente: modular, comandos con `send()`, sin callbacks legacy | Reducción drástica de bundle size; tree-shaking; mantenido activamente | Sí — `aws.service.js`, multer-s3 config | Smoke: POST /upload |
| `multer` | ^1.4.2 | **1.4.5-lts.1** | patch | Low | Parche de seguridad | Fix de DoS en boundary parsing | No | POST /upload |
| `multer-s3` | ^2.9.0 | **3.x** con `@aws-sdk` | major | High | Requiere @aws-sdk/client-s3 v3 | Compatible con nuevo SDK | Sí — `aws.service.js` | POST /upload con archivo real |
| `socket.io` | ^2.3.0 | **4.8.2** | major×2 | **High** | Namespace API cambia; `socket.rooms` es Set, no Object; `io.in()` retorna Promise; handshake auth object; engine.io cambia | EOL eliminado; auth middleware oficial; Redis adapter moderno | Sí — `gateways/socket.js`, rooms, events | WS connect; room join; broadcast |
| `stripe` | ^8.135.0 | **^17.x** | major×9 | **High** | `PaymentIntent` es el flujo preferido; `charges` deprecado; webhook `constructEvent` signature cambia; TypeScript types reescritos | API actualizada; acceso a nuevos Payment Methods; mantenimiento activo | Sí — `stripe.service.js` | POST /stripe/payment; webhook endpoint |
| `twilio` | ^3.56.0 | **^5.x** | major | Med | Constructor API cambia; algunos métodos renombrados | Node 18+ soporte; async/await nativo | Sí — buscar uso de Twilio en el repo | Test unitario de envío de SMS/WhatsApp |
| `dotenv` | 8.0.0 | **16.x** | major×8 | Low | `dotenv/config` route cambia; `.env.vault` soporte; API `parse()` sin cambios | Multiline vars; `.env.vault` encriptado; soporte Node 18+ | No | Arranque del servidor con variables |
| `bcrypt` | ^5.0.0 | **5.1.1** | patch | Low | Sin breaking changes | Parches menores | No | POST /auth/login (hash compare) |
| `winston` | 3.2.1 | **3.17.x** | minor | Low | Sin breaking changes en interfaz; mejoras de performance | Mejor manejo de errores circulares | No | Verificar logs en consola post-arranque |
| `winston-daily-rotate-file` | 3.10.0 | **5.x** | major | Low | API de configuración idéntica; requiere winston 3.x | Fixes de memory leak; rotación mejorada | No | Verificar creación de archivos de log |
| `node-cron` | ^2.0.3 | **3.0.3** | major | Low | `cron.validate()` API cambia; `scheduled` option default cambia; require→import | Soporte timezone mejorado; TypeScript nativo | Sí — `common/cron.js`, `tasks/*.js` | Verificar ejecución de cron en logs |
| `jest` | ^24.8.0 | **29.7.0** | major×5 | Med | `--passWithNoTests` por defecto; `testEnvironment` default cambia a `node`; `globalSetup` API; fake timers mejorados | Velocidad 30-50% mejor; watch mode mejorado; better async | Sí — `jest.config.js` o config en package.json | `npm test` pasa al 100% |
| `supertest` | ^4.0.2 | **7.x** | major | Low | API idéntica en esencia | Node 18+ soporte; TypeScript types | No | `npm test` |
| `@babel/core` et al. | 7.5.5 | **7.26.x** | minor | Low | APIs internas de plugins pueden cambiar; sin breaking en `.babelrc` estándar | Soporte ESNext moderno; velocidad | Sí — `.babelrc` o `babel.config.js` | `npm run build` exitoso |
| `nodemon` | 1.19.1 | **3.1.x** | major | Low | Archivo de configuración `nodemon.json` valid; `--legacy-watch` removido | Node 18+ soporte; watch more reliable | No | `npm start` con hot-reload |
| `eslint` | ^7.4.0 | **9.x** | major | Med | Config flat (`eslint.config.js`) reemplaza `.eslintrc`; muchas reglas movidas a plugins externos | Performance 30%+; nueva config API | Sí — `.eslintrc.js` o equiv.; `babel-eslint` reemplazar por `@babel/eslint-parser` | `npm run lint` sin errores |
| `rimraf` | 2.6.3 | **6.x** | major | Low | CLI flags cambian; `--glob` explícito | Windows path-length fix | Sí — scripts en package.json con `rimraf dist` | `npm run build` exitoso |
| **`immutable`** | **^4.0.0-rc.12** | **4.3.7** | patch | **Med** | **Release candidate en producción.** API estable desde 4.0.0 sin cambios — solo sacar la `-rc` | Elimina riesgo de bug silencioso de RC | No | `npm test`; verificar uso de `Map`, `List`, `Record` en el código |
| `lodash` | ^4.17.20 | **4.17.21** | patch | Low | Ninguno — solo fix de prototype pollution (`CVE-2021-23337` en versiones < 4.17.21) | Cierra CVE-2021-23337 (command injection vía `_.template`) | No | `npm test` |
| `uuid` | ^8.3.2 | **9.0.1** | major | Low | `uuid.v1()` etc. siguen igual; paquete ahora es ESM-first con CJS compat; `v1()` deprecado en favor de `v4()`/`v7()` | ESM-first; `v7()` (time-ordered) disponible | Buscar `uuid` en `src/` — confirmar imports | `npm test` |
| `moment` + `moment-timezone` | ^2.27.0 / ^0.5.31 | **Ver nota ↓** | — | Med | `moment` está en modo **legacy/mantenimiento** desde 2020. No recibirá nuevas features. La doc oficial recomienda migrar a `date-fns` o `luxon` | Reducción de bundle size (~70 KB gzip); API inmutable; tree-shaking | Buscar `moment(` en `src/` — cuantificar uso | Migración incremental; no upgrade sino reemplazo |
| `express-validator` | ^6.5.0 | **7.2.x** | major | Low | Chain API reorganizada (`body('field').isEmail()` igual); algunos helpers de v6 renombrados | Validaciones async nativas; TypeScript mejorado | Buscar `check(`, `body(`, `validationResult(` en `src/` | `npm test` + smoke endpoints con validación |
| `superagent` | ^6.1.0 | **9.0.2** | major×3 | Low | API de callbacks eliminada — solo Promises; `.then()` y `await` sin cambios | Node 18+ soporte; Promise-native | Buscar `require('superagent')` en `src/` | `npm test` |
| `validator` | ^13.5.2 | **13.12.x** | minor | Low | Ninguno | Nuevos validadores; bug fixes | No | `npm test` |
| `exchange-rates-api` | ^1.1.0 | **❌ Reemplazar** | — | **High** | Sin mantenimiento desde 2020; dependencia del servicio `api.exchangeratesapi.io` (requiere API key de pago) | — | Buscar uso en `src/` | Evaluar `frankfurter` API (gratuita) o `open-exchange-rates` |
| `uniqid` | ^5.0.3 | **❌ Reemplazar** | — | Med | Sin mantenimiento desde 2019 (last publish). Reemplazar por `crypto.randomUUID()` (Node 15+) o `uuid@9` | Elimina dependencia muerta | Buscar `uniqid(` en `src/` | `npm test` tras reemplazo |
| `geoip-lite` | ^1.4.2 | **1.4.10** | minor | Low | API sin cambios; base de datos GeoIP actualizada | Base de datos MaxMind más reciente | No | Prueba `geoip.lookup(ip)` en `middleware` |
| `generate-password` | ^1.6.0 | **1.7.x** | minor | Low | API compatible | Bug fixes menores | No | `npm test` (uso en `generateRandomPassword()`) |
| `compression` | ^1.7.4 | **1.7.4** | — | None | Ya en latest | — | No | — |
| `morgan` | ^1.10.0 | **1.10.0** | — | None | Ya en latest | — | No | — |

---

## 4) Breaking changes deep dive — Top 8

---

### 1. `jsonwebtoken` (8.5.1 → 9.0.3)

**Por qué actualizar**

Versión 8.5.1 contiene 4 CVEs críticos/altos publicados en diciembre 2022:
- `CVE-2022-23529` — Arbitrary File Write via `verify()`
- `CVE-2022-23540` — Bypass de validación de firma con algoritmo `none`
- `CVE-2022-23541` — Forgeable tokens RSA → HMAC
- `CVE-2022-23539` — Claves de tipo legacy permitidas sin restricción

Fuente sugerida: changelog oficial / CHANGELOG.md en github.com/auth0/node-jsonwebtoken

**Principales breaking changes**

- `verify()` ya **no acepta tokens sin firma** (`alg: none`) por defecto — antes era permisivo
- Claves RSA deben tener **mínimo 2048 bits**; claves de 1024 bits lanzan error
- Los tipos de clave deben ser válidos para el algoritmo especificado
- Node.js < 12 ya no soportado
- Dependencia interna `jws` actualizada a 4.x

**Cambios típicos en código**

```js
// Antes (8.x) — podía aceptar tokens sin firma si la verificación era laxa
jwt.verify(token, secret)

// Después (9.x) — mismo código, pero ahora fallan los tokens con alg:none
// Si se usaba allowedAlgorithms: ['none'] intencionalmente, se rompe
jwt.verify(token, secret, { algorithms: ['HS256'] })
```

**Riesgo específico para este repo**

- Requiere ver código: `src/api/jwt/jwt.service.js` — confirmar que `sign()` siempre usa `HS256` o similar
- Requiere ver código: `src/api/jwt/jwt.guard.js` — confirmar que `verify()` especifica `algorithms`
- Requiere ver código: `src/api/authentication/authentication.service.js` — `encrypt()` y `decrypt()`

**Plan de verificación**

```bash
npm install jsonwebtoken@9.0.3
npm test
# Smoke manual:
curl -X POST http://localhost:3100/auth/login -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234!"}'
# Verificar: token retornado, endpoint protegido accesible con ese token
```

**Plan de rollback**

```bash
npm install jsonwebtoken@8.5.1
docker compose up -d --build
```

---

### 2. `helmet` (4.4.1 → 8.1.0)

**Por qué actualizar**

Helmet 4.x tiene CSP defaults desactualizados y no activa COEP/COOP/CORP. Desde v5 se activaron headers que protegen contra SpectreMeltdown y otros ataques de timing de recursos entre orígenes. v8 requiere Node 18+ (ya cumplido).

Fuente sugerida: CHANGELOG.md en github.com/helmetjs/helmet

**Principales breaking changes**

- **v5.0**: `crossOriginEmbedderPolicy`, `crossOriginOpenerPolicy`, `crossOriginResourcePolicy`, `originAgentCluster` **habilitados por defecto**
- **v5.0**: CSP `form-action: 'self'` adicionado por defecto — puede romper formularios que hacen POST a terceros
- **v5.0**: CSP `useDefaults` cambia default a `true`
- **v6.0**: Drop Node 12/13; `block-all-mixed-content` eliminado de CSP defaults; `Expect-CT` ya no activo por defecto
- **v7.0**: Drop Node 14/15; `Expect-CT` completamente eliminado; `crossOriginEmbedderPolicy` **desactivado por defecto** (rollback de v5)
- **v8.0**: Drop Node 16/17; HSTS `maxAge` sube de 180 a **365 días**; CSP lanza error si directiva falta comillas

**Cambios típicos en código**

```js
// Antes (4.x) — sin COEP/COOP/CORP, form-action libre
app.use(helmet())

// Después (8.x) — HSTS 365 días, CSP con form-action self, COEP disabled por defecto
// Si el proyecto no usa COEP (carga recursos cross-origin), sin cambio
app.use(helmet())

// Si se necesita CSP customizado con 'self' como string (antes válido):
// ERROR en v8: contentSecurityPolicy lanza si falta la comilla
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],   // correcto: con comillas
      scriptSrc: ["self"]       // ERROR: falta comillas en 'self'
    }
  }
}))
```

**Riesgo específico para este repo**

- Requiere ver código: `src/middlewares/rootMiddlware.js` — cómo está configurado `helmet()`
- Confirmar si hay configuración de CSP custom
- El COEP activado puede romper carga de recursos externos (imágenes de S3, etc.) si no se configura correctamente

**Plan de verificación**

```bash
npm install helmet@8.1.0
npm start
# Verificar headers con:
curl -I http://localhost:3100/auth/login
# Deben aparecer: Strict-Transport-Security, X-Frame-Options, Content-Security-Policy
```

**Plan de rollback**

```bash
npm install helmet@4.4.1
```

---

### 3. `socket.io` (2.3.0 → 4.8.2)

**Por qué actualizar**

Socket.io v2 alcanzó EOL en 2021. No recibe parches de seguridad. Engine.io v2 (incluido en socket.io v2) tiene múltiples CVEs de DoS sin parche. V4 introduce autenticación en el handshake, namespaces mejorados y Redis adapter oficial.

Fuente sugerida: socket.io/docs/v4/migrating-from-2-x-to-3-0 y release notes en github.com/socketio/socket.io

**Principales breaking changes**

- `socket.rooms` era un `Object`, ahora es un `Set`
- `socket.request.headers` normalización cambia
- `io.to(room)` retorna un objeto diferente (broadcast operators)
- El handshake ya no acepta `query` para auth — se usa `auth` object: `io.connect({ auth: { token } })`
- `io.in(room).allSockets()` retorna Promise
- `socket.binary(false)` eliminado, usar `socket.compress(false)`
- Los namespaces ya no tienen `connected` Object — usar `io.of('/').sockets` como Map
- `io.close()` callback se eliminó (retorna Promise)
- El cliente v2 **no es compatible** con servidor v3/v4 sin el flag `allowEIO3: true`

**Cambios típicos en código**

```js
// Antes (v2) — rooms como Object
socket.rooms['room-name']

// Después (v4) — rooms como Set
socket.rooms.has('room-name')

// Antes (v2) — auth via query
socket = io('http://server', { query: { token: 'abc' } })

// Después (v4) — auth via auth object
socket = io('http://server', { auth: { token: 'abc' } })

// Antes (v2) — allSockets sincrónico
const sockets = io.in(room).sockets

// Después (v4) — allSockets asincrónico
const sockets = await io.in(room).allSockets()
```

**Riesgo específico para este repo**

- Requiere ver código: `src/gateways/socket.js` — verificar `io.in()`, `socket.rooms`, eventos
- Requiere ver código: `src/gateways/rooms/` — lógica de rooms
- Requiere ver código: `src/gateways/events/` — handlers de eventos
- Requiere ver código: `src/gateways/modules/` — módulos de socket
- **Clientes frontend** también deben actualizarse a socket.io-client@4.x — esto puede requerir una release coordinada
- Si hay clientes nativos (iOS/Android) con socket.io v2, usar `allowEIO3: true` temporalmente

**Plan de verificación**

```bash
npm install socket.io@4.8.2
npm test
# Test manual de WebSocket:
# Abrir navegador → DevTools → conectar al server
# Verificar: connection event, join room, broadcast a room
```

**Plan de rollback**

```bash
npm install socket.io@2.3.0
```

---

### 4. `aws-sdk` v2 → `@aws-sdk/client-s3` v3

**Por qué actualizar**

`aws-sdk` v2 está oficialmente en modo de mantenimiento desde 2023 y entrará en EOL. El bundle completo de v2 (~8MB) es no-tree-shakable. V3 es modular: solo se importa lo que se usa.

Fuente sugerida: aws.amazon.com/blogs/developer/the-aws-sdk-for-javascript-version-3-is-generally-available y github.com/aws/aws-sdk-js-v3

**Principales breaking changes**

- Todo el API es Command-based: `new PutObjectCommand({...})` + `s3Client.send(command)`
- No hay más callback API — solo async/await o Promises
- Los clientes se instancian por servicio: `new S3Client({ region })` (no el objeto AWS global)
- `multer-s3@3.x` requiere el nuevo `@aws-sdk/client-s3`
- `ContentType`, `ACL`, `Bucket`, `Key` van en el `PutObjectCommand`, no en multerS3 options
- La región se puede detectar automáticamente pero se recomienda explícita

**Cambios típicos en código**

```js
// Antes (v2)
import AWS from 'aws-sdk'
const s3 = new AWS.S3()
s3.putObject(params, callback)

// Después (v3)
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
const s3Client = new S3Client({ region: process.env.AWS_REGION })
await s3Client.send(new PutObjectCommand(params))

// multer-s3 v3
import multerS3 from 'multer-s3'
const upload = multer({
  storage: multerS3({
    s3: s3Client,        // S3Client de v3, no AWS.S3 de v2
    bucket: 'my-bucket',
    key: (req, file, cb) => { cb(null, file.originalname) }
  })
})
```

**Riesgo específico para este repo**

- Requiere ver código: `src/api/aws/aws.service.js` — toda la lógica de subida
- Requiere ver código: confirmar si `AWS.config.update()` global se usa en algún lugar
- La migración de multer-s3 v2 → v3 es obligatoria y simultánea

**Plan de verificación**

```bash
npm install @aws-sdk/client-s3 multer-s3@3
npm test
# Smoke: subir una imagen a través del endpoint de upload
```

**Plan de rollback**

```bash
npm install aws-sdk@2 multer-s3@2
```

---

### 5. `stripe` (8.135.0 → ^17.x)

**Por qué actualizar**

Stripe v8 data de 2021 y usa la API de charges legacy. Las versiones recientes (v13+) tienen soporte nativo para PaymentIntent, soporte mejorado para webhooks, y TypeScript nativo. Stripe publica breaking changes en cada major pero la API REST es versionada independientemente.

Fuente sugerida: github.com/stripe/stripe-node CHANGELOG.md y stripe.com/docs/upgrades

**Principales breaking changes**

- Constructor cambia: `new Stripe(key, { apiVersion: '2023-10-16' })` — `apiVersion` **requerida**
- `stripe.charges.create()` sigue funcionando pero es la API legacy — migrar a `stripe.paymentIntents.create()`
- `stripe.webhooks.constructEvent()` mismo API pero dependencias internas actualizadas
- Errores ahora son instancias de `Stripe.errors.StripeError` con subcategorías específicas
- Muchos métodos que retornaban Lists ahora soportan `autopaginate`
- TypeScript types completamente reescritos en v11+; breaking si usa TypeScript
- `stripe.customers.retrieve()` puede retornar `DeletedCustomer` — hay que type-guard

**Cambios típicos en código**

```js
// Antes (v8)
const stripe = require('stripe')(process.env.STRIPE_KEY)

// Después (v17) — apiVersion requerida
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_KEY, {
  apiVersion: '2024-11-20.acacia'
})

// Webhook verification: misma API
const event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
```

**Riesgo específico para este repo**

- Requiere ver código: `src/api/stripe/stripe.service.js` — cómo se crea el PaymentIntent
- Requiere ver código: confirmar si hay webhook endpoint y qué eventos maneja
- Confirmar versión de Stripe API usada en el dashboard (puede ser diferente al SDK)

**Plan de verificación**

```bash
npm install stripe@17
npm test
# Test en modo test de Stripe con clave sk_test_...
# Verificar: crear PaymentIntent, confirmar pago, webhook recibido
```

**Plan de rollback**

```bash
npm install stripe@8
```

---

### 6. `knex` (0.21.17 → 3.1.0)

**Por qué actualizar**

Knex 0.21 no soporta oficialmente Node 18+. Desde knex 1.0 hay cambios en client names y en v2/v3 se normalizó la API async. Además, objection 3.x requiere knex 3.x.

Fuente sugerida: knexjs.org/#changelog y github.com/knex/knex/blob/master/CHANGELOG.md

**Principales breaking changes**

- **Client names cambian**: `mysql` → `mysql2` ahora es el recomendado; `mysql` legacy sigue soportado pero se depreca
- `knex.raw()` siempre retorna Promise (antes podía usar callbacks)
- `knex.schema.createTableIfNotExists` eliminado — usar `createTable(name, fn)` con `{ ifNotExists: true }`  
- `knex.destroy()` ahora retorna Promise
- `config.connection` puede ser función async para dynamic credentials
- El comportamiento de `whereIn([])` (array vacío) cambia — retorna 0 resultados en lugar de error

**Cambios típicos en código**

```js
// Antes (0.21) — createTableIfNotExists
knex.schema.createTableIfNotExists('table', fn)

// Después (3.x)
knex.schema.createTable('table', fn).within(() => true)
// o leer la migración y usar: ifNotExists: true en el builder
```

**Riesgo específico para este repo**

- Requiere ver código: `src/config/knexfile.js` — client name (`mysql` → posiblemente `mysql2`)
- Requiere ver código: `src/migrations/` — todas las migraciones (80+) para patterns deprecados
- Requiere ver código: `src/api/models/` — modelos Objection y relaciones

**Plan de verificación**

```bash
npm install knex@3 objection@3 mysql2
# Correr migraciones en DB de test:
npm run migrate
npm test
```

**Plan de rollback**

```bash
npm install knex@0.21.17 objection@2.2.1 mysql@2
```

---

### 7. `express` (4.17.1 → 4.22.1 o 5.2.1)

**Por qué actualizar**

Express 4.17.1 no tiene parche de CVE-2024-45590 (body-parser DoS) ni parche de path-to-regexp ReDoS. La actualización mínima segura es **4.22.1**. Express 5 es estable desde sep 2024 pero requiere más cambios.

Fuente sugerida: github.com/expressjs/express/releases

**Principales breaking changes en Express 5**

- Node.js 18+ requerido
- `path-to-regexp@8.x` — sub-expresiones regex en rutas eliminadas (ReDoS mitigation). Rutas como `/:id(\\d+)` siguen igual; rutas con captures complejos pueden romper
- Promesas rechazadas en middleware son capturadas automáticamente como errores (positivo)
- `res.back()` elimina soporte para string `"back"` como argumento de redirect
- `req.params` values ya no son decoded automáticamente de la misma forma
- Varios métodos deprecated en v4 ya no existen

**Riesgo específico para este repo**

- **Actualizar a 4.22.1 primero** — sin breaking changes desde 4.17.1
- Express 5: Requiere ver código — todas las rutas para regex patterns
- Requiere ver código: middlewares async en `src/middlewares/index.js`

**Plan de verificación**

```bash
# Paso 1: patch seguro
npm install express@4.22.1
npm test && npm run smoke-test

# Solo si se decide ir a v5:
npm install express@5.2.1
npm test
```

**Plan de rollback**

```bash
npm install express@4.17.1
```

---

### 8. `passport` (0.4.0 → 0.7.0)

**Por qué actualizar**

Passport 0.4.0 no ha recibido actualizaciones de seguridad en años. Versiones 0.5-0.6 corrigen una vulnerabilidad crítica en sesiones donde el objeto `req.user` podía inyectarse via prototype pollution.

Fuente sugerida: github.com/jaredhanson/passport/releases y advisories de npm

**Principales breaking changes**

- `req.logIn()` y `req.logOut()` son ahora **async** y requieren callback o await
- `allowRedefineRelationships` fue removido
- Algunos tipos de error lanzan instancias específicas en lugar de strings
- Compatibilidad con `passport-local` y `passport-jwt` 4.x verificada

**Cambios típicos en código**

```js
// Antes (0.4.x)
req.logOut()

// Después (0.7.x)
req.logOut((err) => {
  if (err) return next(err)
  res.redirect('/')
})
// o con async/await en Express 5
await new Promise((res, rej) => req.logOut(err => err ? rej(err) : res()))
```

**Riesgo específico para este repo**

- Requiere ver código: `src/api/authentication/authentication.controller.js` / service — si hay uso de `req.logOut()` o `req.logIn()`
- Requiere ver código: confirmar si hay endpoints de logout explícito

**Plan de verificación**

```bash
npm install passport@0.7.0
npm test
# Smoke: POST /auth/login, token válido, endpoint protegido accede correctamente
```

**Plan de rollback**

```bash
npm install passport@0.4.0
```

---

## 5) Plan por olas (Wave plan)

---

### Wave 1 — Seguridad crítica y Low-risk (1–2 días)

**Objetivo**: Eliminar CVEs activos de alto impacto sin tocar arquitectura.

**Paquetes incluidos**

| Paquete | De | A | Tipo |
|---|---|---|---|
| `jsonwebtoken` | 8.5.1 | 9.0.3 | major — 4 CVEs |
| `multer` | 1.4.2 | 1.4.5-lts.1 | patch |
| `mysql` | 2.17.1 | 2.18.1 | patch |
| `bcrypt` | 5.0.0 | 5.1.1 | patch |
| `dotenv` | 8.0.0 | 16.4.7 | major |
| `passport-jwt` | 4.0.0 | 4.0.1 | patch |
| `winston` | 3.2.1 | 3.17.x | minor |
| `winston-daily-rotate-file` | 3.10.0 | 5.x | major |
| `immutable` | 4.0.0-rc.12 | **4.3.7** | patch — **RC en prod** |
| `lodash` | 4.17.20 | **4.17.21** | patch — CVE-2021-23337 |
| `uuid` | 8.3.2 | **9.0.1** | major — bajo riesgo |
| `validator` | 13.5.2 | **13.12.x** | minor |
| `express-validator` | 6.5.0 | **7.2.x** | major — bajo riesgo |
| `superagent` | 6.1.0 | **9.0.2** | major — bajo riesgo |
| `geoip-lite` | 1.4.2 | **1.4.10** | minor |
| `generate-password` | 1.6.0 | **1.7.x** | minor |

**Pasos**

```bash
# 1. Crear branch
git checkout -b upgrade/wave-1-security

# 2. Instalar paquetes de seguridad crítica
npm install jsonwebtoken@9.0.3 multer@1.4.5-lts.1 mysql@2.18.1 \
  bcrypt@5.1.1 dotenv@16 passport-jwt@4.0.1 \
  winston@3 winston-daily-rotate-file@5

# 3. Instalar low-risk patches / minor upgrades adicionales
npm install \
  immutable@4.3.7 \
  lodash@4.17.21 \
  uuid@9 \
  validator@13 \
  express-validator@7 \
  superagent@9 \
  geoip-lite@1 \
  generate-password@1.7

# 3. Verificar que la config de jwt.service.js especifica algoritmo en verify()
# Requiere ver código: confirmar algorithms: ['HS256'] en jwt.guard.js

# 4. Correr tests
npm test

# 5. Smoke tests
curl -X POST http://localhost:3100/auth/login -H "Content-Type: application/json" \
  -d '{"email":"<user>","password":"<pass>"}'

# 6. Audit
npm audit --production

# 7. Build Docker
docker compose up -d --build
docker compose logs app | tail -20

# 8. PR → merge
git add -A && git commit -m "chore(deps): wave-1 security upgrades"
```

**Criterios de aceptación**

- `npm audit --production` → 0 critical/high
- `npm test` → 0 failed
- Login devuelve token JWT válido
- `docker compose logs app` → "Server has been started" sin errores

---

### Wave 1b — Reemplazos de dependencias abandonadas (1–3 días)

**Objetivo**: Eliminar paquetes sin mantenimiento que representan riesgo de seguridad y deuda técnica.

**Paquetes a reemplazar**

| Paquete | Versión actual | Acción | Reemplazo sugerido | Riesgo |
|---|---|---|---|---|
| `exchange-rates-api` | ^1.1.0 | **❌ Eliminar** | [`frankfurter`](https://www.frankfurter.app/) (gratuito, sin API key) o [`open-exchange-rates`](https://openexchangerates.org/) | High — sin mantenimiento desde 2020 |
| `uniqid` | ^5.0.3 | **❌ Eliminar** | `crypto.randomUUID()` (Node 15+ nativo) o `uuid@9` | Med — sin mantenimiento desde 2019 |
| `moment` + `moment-timezone` | ^2.27.0 / ^0.5.31 | **⚠️ Migrar** | [`date-fns`](https://date-fns.org/) + [`date-fns-tz`](https://github.com/marnusw/date-fns-tz) o [`luxon`](https://moment.github.io/luxon/) | Med — modo legacy/mantenimiento desde 2020 |

**Pasos — `exchange-rates-api`**

```bash
# 1. Crear branch
git checkout -b upgrade/wave-1b-removals

# 2. Buscar todos los usos
grep -r "exchange-rates-api\|ExchangeRates\|exchangeRates" src/ --include="*.js"

# 3. Reemplazar con frankfurter (ejemplo)
npm uninstall exchange-rates-api
# Nuevo client (no requiere npm install, usa fetch nativo o node-fetch)
# GET https://api.frankfurter.app/latest?from=USD&to=EUR
```

**Pasos — `uniqid`**

```bash
# Buscar usos
grep -r "uniqid\|require('uniqid')" src/ --include="*.js"

# Reemplazar (Node 18 tiene crypto.randomUUID() global)
npm uninstall uniqid
# En código: const id = crypto.randomUUID();
# O: import { v4 as uuidv4 } from 'uuid'; (uuid ya está en deps)
```

**Pasos — `moment` (migración incremental)**

```bash
# Cuantificar impacto
grep -rn "require('moment')\|from 'moment'\|moment(" src/ --include="*.js" | wc -l

# Instalar reemplazo (date-fns recomendado: modular, tree-shakeable, inmutable)
npm install date-fns date-fns-tz

# Después de migrar todos los usos:
npm uninstall moment moment-timezone

# Guía rápida de equivalencias:
# moment().format('YYYY-MM-DD')       → format(new Date(), 'yyyy-MM-dd')
# moment(str).isValid()               → isValid(parseISO(str))
# moment().add(7, 'days')             → addDays(new Date(), 7)
# moment.tz(date, tz).format(...)     → formatInTimeZone(date, tz, ...)
```

**Criterios de aceptación**

- `grep -r "exchange-rates-api\|uniqid" src/` → 0 matches
- `npm test` → 0 failed
- `npm audit --production` → sin nuevas vulnerabilidades
- Smoke test manual de endpoints que usan conversión de moneda / IDs únicos

---

### Wave 2 — Medium risk: framework core (2–5 días)

**Objetivo**: Modernizar el stack base sin reescribir lógica de negocio.

**Paquetes incluidos**

| Paquete | De | A | Tipo |
|---|---|---|---|
| `express` | 4.17.1 | 4.22.1 | minor |
| `helmet` | 4.4.1 | 8.1.0 | major |
| `passport` | 0.4.0 | 0.7.0 | major |
| `node-cron` | 2.0.3 | 3.0.3 | major |
| `nodemon` | 1.19.1 | 3.1.x | major |
| `jest` | 24.8.0 | 29.7.0 | major |
| `supertest` | 4.0.2 | 7.x | major |
| `rimraf` | 2.6.3 | 6.x | major |
| `@babel/core` et al. | 7.5.5 | 7.26.x | minor |

**Pasos**

```bash
# 1. Branch por subgrupo (helmet separado del resto)
git checkout -b upgrade/wave-2-framework

# 2. Express patch primero
npm install express@4.22.1
npm test  # debe pasar

# 3. Helmet — leer configuración actual antes
grep -n "helmet" src/middlewares/rootMiddlware.js
npm install helmet@8.1.0
npm test
# Verificar headers: curl -I http://localhost:3100/

# 4. Passport
npm install passport@0.7.0
# Revisar: src/api/authentication/authentication.controller.js (req.logOut)
npm test

# 5. Dev tools (sin impacto en producción)
npm install --save-dev jest@29 supertest@7 nodemon@3 rimraf@6 \
  @babel/core@7.26 @babel/cli@7.26 @babel/node@7.26 @babel/preset-env@7.26

# 6. Actualizar jest config si cambia comportamiento
# Verificar: testEnvironment sigue siendo 'node'
npm test

# 7. node-cron
npm install node-cron@3.0.3
# Revisar: src/common/cron.js y tasks/*.js
npm test

# 8. Build completo
npm run build
docker compose up -d --build
```

**Criterios de aceptación**

- `npm test` → 0 failed
- Smoke tests completos del §2 pasan
- Headers HTTP incluyen HSTS, CSP, X-Frame-Options
- Cron jobs aparecen en logs con `debug: scheduleAsyncTask: running`

---

### Wave 3 — High risk: majors de arquitectura (1–3 semanas por paquete)

Cada uno de estos proyectos es independiente y debe tener su propio branch, PR, y periodo de validación en staging.

---

#### Wave 3a — socket.io 2 → 4 (estimado: 1 semana)

```bash
git checkout -b upgrade/wave-3-socketio

npm install socket.io@4.8.2

# Cambios obligatorios en src/gateways/socket.js:
# - socket.rooms: de Object a Set
# - auth: de query a auth object
# - allSockets(): ahora async

npm test
# Test manual de WebSocket con cliente actualizado
```

**Nota de tradeoff**: Si los clientes frontend/mobile usan socket.io-client v2, se puede usar `allowEIO3: true` temporalmente para compatibilidad retroactiva mientras se actualizan los clientes. No recomendado a largo plazo.

---

#### Wave 3b — aws-sdk v2 → @aws-sdk v3 (estimado: 2–3 días)

```bash
git checkout -b upgrade/wave-3-aws-sdk-v3

npm uninstall aws-sdk multer-s3
npm install @aws-sdk/client-s3 multer-s3@3

# Reescribir src/api/aws/aws.service.js:
# - new S3Client({ region }) en lugar de new AWS.S3()
# - PutObjectCommand para operaciones manuales
# - multerS3 con s3Client (S3Client) en lugar de s3 (AWS.S3)

npm test
# Smoke: subir un archivo real al bucket de test
```

---

#### Wave 3c — stripe 8 → 17 (estimado: 3–5 días)

```bash
git checkout -b upgrade/wave-3-stripe

npm install stripe@17

# Cambios en src/api/stripe/stripe.service.js:
# - new Stripe(key, { apiVersion: '2024-11-20.acacia' })
# - Revisar error handling con new Stripe error types

npm test
# Test con claves Stripe test mode
```

---

#### Wave 3d — knex 0.21 + objection 2 → knex 3 + objection 3 (estimado: 3–5 días)

**Nota**: Considerar instalar `mysql2` simultáneamente como driver.

```bash
git checkout -b upgrade/wave-3-knex

npm install knex@3 objection@3 mysql2
# mysql legacy sigue funcionando en knex 3 pero se recomienda mysql2

# Correr todas las migraciones en DB test
npm run migrate

npm test
# Verificar: todos los modelos y queries funcionan
```

---

#### Wave 3e — Express 5 (opcional, estimado: 1 semana)

**Recomendación**: No actualizar a Express 5 en 2026 Q1. Esperar a que el ecosistema madure middleware-compatible (body-parser v2 aún cambia). La actualización a Express 4.22.1 (Wave 2) es suficiente.

**Si se decide en el futuro**:

```bash
git checkout -b upgrade/wave-3-express5

npm install express@5.2.1

# Revisar TODAS las rutas para path-to-regexp breaking changes
# Verificar middleware async error propagation
nim test
```

---

## 6) Audit de cambios (qué cambió y por qué)

### Cómo producir el audit en PR

```bash
# 1. Diff de package.json
git diff main upgrade/wave-1-security -- package.json

# 2. Diff del lockfile (resumen)
git diff main upgrade/wave-1-security -- package-lock.json | \
  grep "^[\+\-].*\"version\"" | head -50

# 3. Reporte de npm audit antes/después
npm audit --production --json > audit-after.json
diff audit-baseline.json audit-after.json | grep "\"severity\"\|\"title\""
```

### Template de descripción de PR

```markdown
## Dependency Upgrade: Wave 1 — Security

### Por qué
- jsonwebtoken 8.5.1 → 9.0.3: cierra CVE-2022-23529, CVE-2022-23540, CVE-2022-23541, CVE-2022-23539
- multer 1.4.2 → 1.4.5-lts.1: parche de boundary parsing DoS
- dotenv 8.0.0 → 16.x: soporte multiline vars, Node 18+ oficial

### Breaking changes encontrados
- [ ] jsonwebtoken: ninguno detectado (ya se usaba algorithms en verify)
- [ ] dotenv: API compatible, solo cambio de path de require interno

### QA checklist
- [ ] npm test: 0 failed
- [ ] npm audit --production: 0 critical/high
- [ ] POST /auth/login: 200 + token
- [ ] GET /courses (con token): 200
- [ ] docker compose logs: sin errores

### Before/After audit
| Métrica | Antes | Después |
|---|---|---|
| Critical CVEs | X | 0 |
| High CVEs | Y | 0 |
| Vulnerabilidades totales | Z | W |
```

---

## 7) Testing & QA plan

### Unit tests mínimos a añadir

Si no existen, deben crearse antes de cualquier wave de seguridad:

```
src/__test__/auth/
  jwt.service.test.js       — sign() + verify() cycle, expired token, invalid alg
  auth.middleware.test.js   — valid token pass, invalid token 401, missing token 401

src/__test__/stripe/
  webhook.test.js           — constructEvent con signature válida e inválida
  payment.test.js           — createPaymentIntent retorna clientSecret

src/__test__/upload/
  multer.test.js            — fileSize limit enforced, fileFilter rejects non-image
```

### Integration tests con DB

El `docker-compose.yml` existente ya provee MySQL. Para tests de integración:

```yaml
# docker-compose.test.yml (nuevo)
services:
  db-test:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: test
      MYSQL_DATABASE: learlify_test
    ports:
      - "3309:3306"
```

```bash
# Correr integration tests
cross-env NODE_ENV=test DB_HOST=localhost DB_PORT=3309 npm test
```

### e2e tests con supertest — endpoints críticos

```js
// src/__test__/e2e/critical-paths.test.js

describe('Critical paths', () => {
  test('POST /auth/register', ...)         // 201 con usuario nuevo
  test('POST /auth/login', ...)            // 200 + JWT token
  test('GET /courses (auth)', ...)         // 200 con token válido
  test('GET /courses (no auth)', ...)      // 401
  test('PUT /users/:id', ...)              // 200 actualización propia
  test('POST /notifications', ...)         // 201
  test('GET /plans', ...)                  // 200 lista de planes
  test('POST /stripe/payment', ...)        // respuesta con clientSecret o 422
})
```

### Cómo testear WebSockets

```js
// src/__test__/websocket/socket.test.js
import { io as Client } from 'socket.io-client'

describe('WebSocket', () => {
  let client

  beforeAll((done) => {
    // v4: usar auth object
    client = Client('http://localhost:3100', {
      auth: { token: validJWT }
    })
    client.on('connect', done)
  })

  afterAll(() => client.disconnect())

  test('connection with valid JWT', (done) => {
    expect(client.connected).toBe(true)
    done()
  })

  test('join room', (done) => {
    client.emit('join', { room: 'test-room' })
    client.on('joined', (data) => {
      expect(data.room).toBe('test-room')
      done()
    })
  })

  test('broadcast to room', (done) => {
    client.emit('message', { room: 'test-room', text: 'hello' })
    client.on('message', (data) => {
      expect(data.text).toBe('hello')
      done()
    })
  })

  test('reject connection without token', (done) => {
    const noAuthClient = Client('http://localhost:3100')
    noAuthClient.on('connect_error', (err) => {
      expect(err.message).toMatch(/unauthorized/i)
      noAuthClient.disconnect()
      done()
    })
  })
})
```

### Criterios de promoción a producción

```
[ ] npm test: 0 failed, coverage ≥ 60% en módulos auth/stripe/upload
[ ] npm audit --production: 0 critical, 0 high
[ ] Smoke test checklist del §2: 8/8 pasan
[ ] Build Docker exitoso: docker compose up -d --build
[ ] docker compose logs: "Server has been started" sin UnhandledRejection
[ ] Response time p95 < 500ms en endpoints críticos (baseline: medir antes y después)
[ ] No regresiones en Stripe (verificar en dashboard test mode)
[ ] Logs de Winston: sin TypeError ni [object Object] en producción
```

---

## 8) Riesgos y mitigaciones

### Riesgos técnicos

| Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|
| jsonwebtoken v9 rechaza tokens firmados con alg:none | Todos los usuarios pierden sesión | Baja | Verificar que no se usa alg:none; si hay tokens en circulación, forzar re-login |
| socket.io v4 es incompatible con clientes v2 | Chat/notificaciones en tiempo real caen | Alta | Usar `allowEIO3: true` temporalmente; actualizar clientes en paralelo |
| helmet v8 activa CORS headers que bloquean S3 | Upload de imágenes falla | Media | Configurar `crossOriginEmbedderPolicy: false` explícitamente hasta auditar |
| knex 3 rompe queries con whereIn([]) vacío | Endpoints que filtran IDs vacíos fallan | Media | Agregar guard antes de `.whereIn()`: `if (ids.length === 0) return []` |
| Express 5 path-to-regexp elimina regex en rutas | Rutas con patterns avanzados retornan 404 | Baja | Auditar rutas antes de actualizar; mantener en 4.x hasta validar |
| stripe v17 requiere `apiVersion` explícita | Error en constructor si no se especifica | Alta | Agregar `apiVersion: '2024-11-20.acacia'` al constructor |
| aws-sdk v3 es incompatible con multer-s3 v2 | Uploads a S3 fallan | Alta | Actualizar multer-s3 a v3 simultáneamente (no separado) |
| Babel 7.5 compilando decoradores puede divergir con 7.26 | Build falla | Baja-Media | Actualizar @babel/* como grupo, no paquete por paquete |

### Riesgos operacionales

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Node 18 en producción vs node 24 en dev | Comportamiento diferente en crypto/streams | Estandarizar a Node 22 LTS en Dockerfile y .nvmrc |
| package-lock.json fuera de sync en CI | Docker build falla en `npm ci` | Después de cualquier `npm install`, hacer commit del lockfile |
| Stripe API version drift | Webhooks con campos diferentes en test vs prod | Fijar `apiVersion` en el código, usar la misma en el Stripe Dashboard |
| Timeout de DB en health check de Docker durante knex upgrade | Contenedor no arranca | Aumentar `start_period` en healthcheck de docker-compose.yml |

---

## 9) Comandos exactos sugeridos

### Instalar targets por wave

```bash
# Wave 1: Security
npm install \
  jsonwebtoken@9.0.3 \
  multer@1.4.5-lts.1 \
  mysql@2.18.1 \
  bcrypt@5.1.1 \
  dotenv@16 \
  passport-jwt@4.0.1 \
  winston@3.17.0 \
  winston-daily-rotate-file@5.0.0

# Wave 2: Framework
npm install express@4.22.1 helmet@8.1.0 passport@0.7.0 node-cron@3.0.3

npm install --save-dev \
  jest@29.7.0 \
  supertest@7.0.0 \
  nodemon@3.1.0 \
  rimraf@6.0.1 \
  @babel/core@7.26.0 \
  @babel/cli@7.26.0 \
  @babel/node@7.26.0 \
  @babel/preset-env@7.26.0

# Wave 3: High risk
npm uninstall aws-sdk multer-s3
npm install @aws-sdk/client-s3 multer-s3@3.0.1

npm install socket.io@4.8.2

npm install stripe@17

npm install knex@3.1.0 objection@3.1.5 mysql2@3.11.0
```

### Correr tests y audit

```bash
# Tests con coverage
npm run test:coverage

# Audit de producción
npm audit --production

# Audit con JSON para diff
npm audit --production --json | jq '.vulnerabilities | to_entries[] | {name: .key, severity: .value.severity}'

# Ver qué paquetes siguen desactualizados
npm outdated --long
```

### Generar reporte

```bash
# Generar reporte HTML de audit
npm audit --production --json > audit-report.json

# Listar dependencias con sus licencias
npx license-checker --production --summary

# Ver árbol de dependencias de un paquete específico
npm ls socket.io
npm ls jsonwebtoken
```

### Rollback completo

```bash
# 1. Rollback de package.json y lockfile al tag seguro
git checkout pre-wave-1-<fecha> -- package.json package-lock.json

# 2. Reinstalar
npm ci

# 3. Rebuild Docker
docker compose down
docker compose up -d --build

# 4. Verificar
docker compose logs app | tail -20
curl http://localhost:3100/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234!"}'
```

---

## 10) Next inputs mínimos que necesito del repo

Los siguientes archivos deben revisarse antes de ejecutar cada wave. No son preguntas abiertas — son inspecciones exactas:

| Archivo | Qué buscar | Para qué wave |
|---|---|---|
| `src/api/jwt/jwt.guard.js` | `jwt.verify(token, secret)` — ¿tiene `algorithms` option? | Wave 1 |
| `src/api/jwt/jwt.service.js` | `jwt.sign()` — ¿usa `expiresIn` y `algorithm`? | Wave 1 |
| `src/middlewares/rootMiddlware.js` | Cómo está configurado `helmet()` — ¿hay CSP custom? | Wave 2 |
| `src/api/authentication/authentication.controller.js` | Uso de `req.logOut()` o `req.logIn()` | Wave 2 |
| `src/api/aws/aws.service.js` | Toda la lógica de `AWS.S3` y multer-s3 | Wave 3b |
| `src/api/stripe/stripe.service.js` | Constructor de Stripe, métodos usados, error handling | Wave 3c |
| `src/gateways/socket.js` | `socket.rooms`, `io.in()`, auth en handshake, eventos | Wave 3a |
| `src/gateways/rooms/` | Uso de `socket.rooms` como Object vs Set | Wave 3a |
| `src/config/knexfile.js` | Client name (`mysql` vs `mysql2`), connection config | Wave 3d |
| `src/migrations/` (primeras 5 y últimas 5) | `createTableIfNotExists`, raw queries, client-specific SQL | Wave 3d |
| `src/api/models/` | Relaciones Objection, `$relatedQuery`, `$query` patterns | Wave 3d |
| `.babelrc` o `babel.config.js` | Plugins de decoradores, module-resolver paths | Wave 2 (Babel) |
| `src/common/cron.js` | Cómo se inicializa `node-cron`, si usa `cron.validate()` | Wave 2 |

---

*Fuente sugerida para todos los items: changelogs oficiales y release notes de cada proyecto en GitHub / npm. Los links concretos se pueden obtener en: `npm info <package> homepage`.*
