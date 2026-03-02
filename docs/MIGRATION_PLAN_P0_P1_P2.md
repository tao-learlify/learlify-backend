# Migration Plan — TypeScript + Prisma (serverv2)

**Autor:** Principal Backend Engineer  
**Fecha:** 2026-03-03  
**Rama base:** `main`  
**Meta:** Migrar repo a TypeScript (incremental) + reemplazar Knex/Objection por Prisma ORM.

---

## Tabla de contenidos

1. [Paso 0 — Auditoría del repo](#paso-0--auditoría-del-repo)
2. [P0 — Foundations](#p0--foundations-1-semana)
3. [P1 — Incremental Migration](#p1--incremental-migration-2-6-semanas)
4. [P2 — Completion & Cleanup](#p2--completion--cleanup-quarter)
5. [Templates de PR](#templates-de-pr)
6. [Comandos de auditoría, tests y smoke](#comandos-de-referencia)

---

## Paso 0 — Auditoría del repo

### Entry points (bootstrap)

| Archivo | Rol | Riesgo |
|---|---|---|
| `src/index.js` | Único entry point. Crea `app`, `server`, `stream` (socket.io). Arranca cron + sockets + listen. | Low |
| `src/config/index.js` | Lee `process.env` crudamente (sin schema). Expone objeto `config` plano. | **High** — sin validación de env |
| `src/config/db.js` | Inicializa `Knex` + configura `Model.knex()` de Objection globalmente. | **High** — singleton compartido |
| `src/config/knexfile.js` | Config dual: CLI migrations + runtime. Usa `require()` desnudo (CommonJS). | Med |

### Cadena de middlewares (orden exacto)

```
src/middlewares/rootMiddlware.js (aplicado en src/index.js)

1.  requestId            — genera X-Request-ID por request
2.  metricsCollector     — instrumentación prom-client
3.  helmet(...)          — cabeceras de seguridad (CSP desactivado)
4.  cors(corsOptions)    — origins permitidos desde config.AUTHORIZED_ORIGINS
5.  globalLimiter        — express-rate-limit
6.  compression()        — gzip
7.  morgan('short')      — access log
8.  i18n.init            — internacionalización (res.__)
9.  text()               — body parser texto plano
10. json(root.json)      — body parser JSON
11. urlencoded(...)      — body parser form
12. passport.initialize()— passport-jwt
13. validationErrorHandler — captura errores express-validator

Aplicados después en index.js:
14. app.use(stripeWebhook)  — body raw para webhooks Stripe
15. app.use(healthRouter)
16. app.use(metricsRouter)
17. app.use(root.apiVersion, controllers)  — todas las rutas de negocio
18. app.use(stackError)    — error handler global (prod/dev)
```

### Mapa de rutas (28 modules)

| Módulo | Prefijo implícito | Responsabilidad |
|---|---|---|
| Access | /access | Control de acceso por rol |
| Admin | /admin | Operaciones administrativas |
| Advance | /advance | Avance de curso |
| Auth | /authentication | signIn, signUp, refresh, verify, forgot, reset |
| AWS | /aws | Uploads S3 |
| Categories | /categories | Catálogo de categorías |
| Classes | /classes | Sesiones de clase |
| Courses | /courses | Catálogo y detalle de cursos |
| Evaluations | /evaluations | Evaluaciones de aprendizaje |
| Exams | /exams | Exámenes |
| Feedback | /feedback | Feedback de usuarios |
| Gifts | /gifts | Sistema de regalos/créditos |
| Languages | /languages | Idiomas disponibles |
| LatestEvaluations | /latest-evaluations | Evaluaciones recientes |
| Meetings | /meetings | Sesiones Twilio/video |
| Models | /models | Modelos de examen (exam_models) |
| Notifications | /notifications | Push notifications |
| Packages | /packages | Paquetes de suscripción |
| Plans | /plans | Planes de suscripción |
| Progress | /progress | Progreso del alumno |
| Reports | /reports | Reportes |
| Roles | /roles | Gestión de roles |
| Schedules | /schedule | Calendario de clases |
| Stats | /stats | Estadísticas |
| Users | /users | CRUD de usuarios |
| Youtube | /youtube | Integración YouTube |
| Health | /health | Health check (db.raw SELECT 1) |
| Metrics | /metrics | Endpoint prom-client |

### Puntos donde se toca DB (Knex/Objection)

#### Modelos Objection (25 archivos `*.model.js`)

Relaciones relevantes:

```
User           ──< Package       (hasMany)
User           ──< Progress      (hasMany)
User           ──< CloudStorage  (hasMany)
User           ──< Schedule      (hasMany)
User           ──< Evaluation    (hasMany)
User           ──< Meeting       (hasMany)
User           ──  Role          (hasOne)
User           ──  Models        (hasOne, tabla: exam_models)
User           ──< Gift          (hasMany)
```

#### Transacciones identificadas

| Archivo | Línea aprox. | Patrón | Riesgo |
|---|---|---|---|
| `src/api/schedule/schedule.service.js` | ~260 | `Schedule.knex().transaction(async trx =>)` | **High** — multi-insert |
| `src/api/evaluations/evaluations.services.js` | ~201 | `Evaluation.knex().transaction(async T =>)` | **High** — multi-table |
| `src/api/progress/progress.service.js` | ~113, ~368 | `SQL.transaction(async T =>)` (2 transacciones) | **High** — lógica crítica de negocio |
| `src/api/classes/classes.service.js` | ~42 | `Classes.knex().transaction(async trx =>)` | Med |
| `src/api/gifts/gifts.service.js` | ~46, ~144 | `Gift.knex().transaction(async trx =>)` (2 transacciones) | Med |
| `src/api/users/users.service.js` | ~9 | `import { transaction } from 'objection'` (importado, puede no usarse directamente) | Low |

#### Raw queries

| Archivo | Línea aprox. | Query | Riesgo |
|---|---|---|---|
| `src/api/health/health.routes.js` | ~11 | `db.raw('SELECT 1')` | Low — solo health check |
| `src/api/users/users.service.js` | ~200 | `knex.fn.now()` | Low — sólo `updatedAt` |

#### Joins complejos implícitos

Todos los joins se hacen mediante `withGraphFetched()` de Objection (ORM-level joins). No hay joins SQL manuales. Requieren mapeo 1:1 a `include` de Prisma.

### Fuentes de tipos implícitos peligrosos

| Fuente | Archivos afectados | Riesgo |
|---|---|---|
| `req.user` (passport-jwt) | 48 ocurrencias en `src/api/**` | **High** — tipo `any` implícito en Express |
| `req.body` dinámico | Todo controlador | Med — ningún Zod/class-validator aplicado en TS |
| `process.env` sin schema | `src/config/index.js`, `src/config/knexfile.js` | **High** — valores `undefined` en runtime |
| Decoradores (`@Bind`, `@Router`, `@Controller`) | `src/decorators/index.js` | Med — legacy decorators, requieren `experimentalDecorators` |
| `exchange-rates-api` | Dependencia externa | Low — API externa, fácil de sustituir |
| `moment` (uso extensivo) | ~40 archivos | Low — reemplazar por `date-fns` ya incluido |

### Comandos de auditoría copiables

```bash
# Buscar todos los imports de knex/objection
rg "from 'knex'|from 'objection'|require\('knex'\)|require\('objection'\)" src/ --include="*.js"

# Buscar raw queries
rg "\.raw\(" src/ --include="*.js"

# Buscar transacciones
rg "\.transaction\(|transaction\(async|trx\." src/ --include="*.js"

# Buscar acceso a req.user
rg "req\.user" src/ --include="*.js" -l

# Buscar uso de passport
rg "passport" src/ --include="*.js"

# Buscar moment
rg "from 'moment'|require\('moment'\)" src/ --include="*.js" -l

# Buscar exchange-rates-api
rg "exchange-rates-api|exchangeRates" src/ --include="*.js"

# Buscar endpoints críticos auth/courses/users
rg "authentication\.routes|courses\.routes|users\.routes" src/ --include="*.js"

# Contar modelos Objection
find src/api -name "*.model.js" | wc -l

# Contar archivos de migración
ls src/migrations | wc -l

# Listar variables de entorno usadas
rg "process\.env\." src/ --include="*.js" -o | sort -u
```

---

## P0 — Foundations (1 semana)

**Objetivo:** Preparar el repo para la migración incremental sin cambiar comportamiento. El compilador TypeScript convive con Babel. Cero regresiones de comportamiento.

### Tasks P0

| ID | Task | Effort | Archivos a crear/tocar | Criterios de aceptación |
|---|---|---|---|---|
| P0-1 | Añadir TypeScript toolchain al proyecto | S | `package.json`, `tsconfig.json` | `npx tsc --noEmit` sin errores en archivos `.ts` nuevos |
| P0-2 | Configurar `@babel/preset-typescript` | S | `babel.config.js` (o `.babelrc`) | Build Babel compila `.ts` junto a `.js` |
| P0-3 | Crear `tsconfig.json` estricto con `allowJs` | S | `tsconfig.json` | `checkJs: false` inicialmente, `allowJs: true` |
| P0-4 | Extender tipos de Express: `req.user` | S | `src/@types/express.d.ts` | TypeScript resuelve `req.user` sin `any` |
| P0-5 | Schema de env con Zod | M | `src/config/env.ts`, `src/config/index.js` | App lanza error descriptivo si falta var obligatoria |
| P0-6 | Smoke tests e2e supertest (endpoints críticos) | M | `src/__test__/e2e/smoke.test.js` | `GET /health`, `POST /authentication/signin`, `GET /api/v1/users` responden correctamente |
| P0-7 | Verificar Docker build con cambios | S | `Dockerfile`, `ecosystem.config.js` | `docker build` exitoso, `docker run` arranca |
| P0-8 | Documentar convenciones de migración | S | `docs/MIGRATION_TYPESCRIPT.md` | PR aprobado por el equipo |

#### P0-1: TypeScript toolchain

```bash
npm install --save-dev typescript @types/node ts-node
```

Paquetes **no** instalar (ya cubiertos por Babel): `ts-loader`, `awesome-typescript-loader`.

#### P0-3: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "allowJs": true,
    "checkJs": false,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "baseUrl": "src",
    "paths": {
      "api/*": ["api/*"],
      "config/*": ["config/*"],
      "utils/*": ["utils/*"],
      "middlewares/*": ["middlewares/*"],
      "metadata/*": ["metadata/*"],
      "common/*": ["common/*"],
      "gateways/*": ["gateways/*"],
      "decorators": ["decorators/index.js"],
      "exceptions": ["exceptions/index.js"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "src/migrations", "src/seeds"]
}
```

#### P0-4: Express request augmentation

```typescript
// src/@types/express.d.ts
import { JwtPayload } from 'jsonwebtoken'

interface AuthUser {
  id: number
  email: string
  roleId: number
  role: string
  isVerified: boolean
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
      requestId?: string
    }
  }
}

export {}
```

#### P0-5: Schema de env (Zod)

```typescript
// src/config/env.ts
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('localhost'),
  PORT: z.coerce.number().default(3100),
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  DB_CLIENT: z.string().default('mysql2'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRATION: z.string().default('30d'),
  SENDGRID_API_KEY: z.string().optional(),
  STRIPE_API_KEY: z.string().optional(),
  AWS_ACCESS_KEY: z.string().optional(),
  AWS_SECRET_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_BUCKET: z.string().optional(),
  REDIS_URL: z.string().optional(),
  TWILIO_API_ACCOUNT_SID: z.string().optional(),
  TWILIO_API_KEY_SECRET: z.string().optional(),
  TWILIO_API_KEY_SID: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.format())
  process.exit(1)
}

export const env: Env = parsed.data
```

**Integración:** `src/config/index.js` importa `env` desde `./env.ts` en lugar de leer `process.env` directamente.

#### P0-6: Smoke test e2e

```javascript
// src/__test__/e2e/smoke.test.js
import request from 'supertest'
import { server } from '../../index'

describe('Smoke tests — critical endpoints', () => {
  afterAll(() => server.close())

  it('GET /health returns 200', async () => {
    const res = await request(server).get('/health')
    expect(res.status).toBe(200)
  })

  it('POST /authentication/signin with bad credentials returns 4xx', async () => {
    const res = await request(server)
      .post('/api/v1/authentication/signin')
      .send({ email: 'nobody@test.com', password: 'wrong' })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('GET /api/v1/users without token returns 401', async () => {
    const res = await request(server).get('/api/v1/users')
    expect(res.status).toBe(401)
  })
})
```

### Exit criteria P0

- [ ] `npm run build` exitoso (Babel compila `.js` + `.ts`)
- [ ] `npx tsc --noEmit` sin errores en archivos `.ts` nuevos
- [ ] `npm test` pasa (142+ tests, 0 fallos)
- [ ] Smoke tests pasan
- [ ] `docker build .` exitoso
- [ ] Variables de entorno requeridas documentadas en `.env.example`

### Rollback P0

```bash
git revert <commit-hash-P0>
# o
git checkout main -- package.json babel.config.js
npm install
```

Ningún cambio de P0 modifica DB ni contratos de API. Rollback es trivial.

---

## P1 — Incremental Migration (2–6 semanas)

**Objetivo:** Introducir Prisma en paralelo con Knex. Migrar "flow por flow" comenzando por los de menor riesgo transaccional.

### Setup Prisma (pre-requisito de P1)

```bash
npm install prisma @prisma/client
npx prisma init --datasource-provider mysql
npx prisma db pull
```

`prisma db pull` generará `prisma/schema.prisma` a partir del schema MySQL existente con las 93 migraciones aplicadas.

**PrismaClient singleton:**

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

**Lifecycle (en `src/index.js`):**

```javascript
process.on('SIGTERM', async () => {
  server.close(async () => {
    await prisma.$disconnect()
    await closeRedisClient()
    process.exit(0)
  })
})
```

### Orden de migración de flows

| Orden | Flow | Justificación | Transacciones |
|---|---|---|---|
| 1 | **Auth** | Menor acoplamiento DB. Solo `users`, `roles`. Sin transacciones. | No |
| 2 | **Users CRUD** | Segunda prioridad — `UsersService` con mayores refs (`req.user`). Sin transacciones. | No |
| 3 | **Courses + Categories** | Read-heavy, bajo riesgo. Sin transacciones. | No |
| 4 | **Packages + Plans** | Media complejidad. Sin transacciones en packages.service. | No |
| 5 | **Evaluations + Progress** | Alta complejidad transaccional. Último por riesgo. | **Sí** |

### Estrategia dual-path por flow

```
┌─────────────────────────────────────┐
│           Controller                │
└──────────────┬──────────────────────┘
               │ llama a
       ┌───────▼───────┐
       │  IRepository  │  (interfaz TypeScript nueva)
       └───────┬───────┘
        ┌──────┴──────┐
        │             │
  ┌─────▼─────┐ ┌─────▼──────┐
  │ KnexRepo  │ │ PrismaRepo │
  │ (existente│ │ (nuevo)    │
  │  .service)│ └────────────┘
  └───────────┘
```

El switch se controla por env: `USE_PRISMA_USERS=true`. En producción se activa por flow una vez validado en staging.

#### Ejemplo — Flow Auth (P1-F1)

**Paso 1:** Crear interfaz de repositorio

```typescript
// src/api/authentication/authentication.repository.ts
export interface IAuthRepository {
  findUserByEmail(email: string): Promise<DbUser | null>
  findUserById(id: number): Promise<DbUser | null>
  updateLastLogin(id: number): Promise<void>
}
```

**Paso 2:** Implementar `PrismaAuthRepository`

```typescript
// src/api/authentication/authentication.prisma.repository.ts
import { prisma } from 'lib/prisma'
import { IAuthRepository } from './authentication.repository'

export class PrismaAuthRepository implements IAuthRepository {
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: { roles: true, model: true }
    })
  }

  async findUserById(id: number) {
    return prisma.user.findUnique({
      where: { id },
      include: { roles: true, model: true }
    })
  }

  async updateLastLogin(id: number) {
    await prisma.user.update({
      where: { id },
      data: { lastLogin: new Date() }
    })
  }
}
```

**Paso 3:** Mantener `KnexAuthRepository` (wrapping del `UsersService` existente, sin cambios en Objection).

**Paso 4:** Switch en service:

```typescript
const USE_PRISMA = process.env.USE_PRISMA_AUTH === 'true'
const repo: IAuthRepository = USE_PRISMA
  ? new PrismaAuthRepository()
  : new KnexAuthRepository()
```

### Tasks P1

| ID | Task | Flow | Effort | Criterios de aceptación |
|---|---|---|---|---|
| P1-S | Setup Prisma + `prisma db pull` | — | M | `prisma.prisma` generado, `prisma generate` exitoso |
| P1-S2 | Crear `src/lib/prisma.ts` singleton | — | S | Import limpio desde cualquier módulo |
| P1-F1 | Migrar Auth flow | Auth | M | Tests auth pasan, `USE_PRISMA_AUTH=true` funciona |
| P1-F2 | Migrar Users CRUD | Users | M | CRUD de usuarios via Prisma, 0 regresiones |
| P1-F3 | Migrar Courses + Categories | Courses | M | GET /courses y /categories via Prisma |
| P1-F4 | Migrar Packages + Plans | Packages | M | Assign/create/update packages via Prisma |
| P1-F5 | Migrar Evaluations + Progress | Evaluations | L | Transacciones migradas a `prisma.$transaction` |
| P1-T | Añadir tests de integración por flow | Todos | M | 60% coverage en módulos tocados |
| P1-O | Logging de queries Prisma | — | S | Queries logeadas en dev, sin secretos |

### Observabilidad P1

```typescript
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' },
  ],
})

prisma.$on('query', (e) => {
  logger.debug('prisma:query', { duration: e.duration, query: e.query })
})
```

### Exit criteria P1

- [ ] 60–80% de endpoints críticos usando Prisma
- [ ] 60% coverage en módulos tocados
- [ ] `prisma.$transaction` reemplaza `Model.knex().transaction` en flows migrados
- [ ] Sin regresiones en contratos de API (headers, status codes, response shapes)
- [ ] `USE_PRISMA_* = false` devuelve comportamiento Knex idéntico al pre-P1

---

## P2 — Completion & Cleanup (quarter)

**Objetivo:** Eliminar Knex/Objection completamente. Prisma como única capa DB. Hardening de performance.

### Tasks P2

| ID | Task | Effort | Criterios de aceptación |
|---|---|---|---|
| P2-M1 | Migrar flows restantes (Schedule, Classes, Gifts, Meetings, Admin) | L | 100% endpoints via Prisma |
| P2-M2 | Eliminar dependencias muertas | S | `knex`, `objection`, `mysql2` (si aplica), `knexfile` borrados |
| P2-M3 | Tomar control de Prisma migrations | M | `prisma migrate dev` genera historial desde baseline |
| P2-P1 | Índices recomendados (based on real queries) | M | Plan de índices en `docs/DB_INDEXES.md` aplicado |
| P2-P2 | Select mínimo + paginación consistente | M | No overfetch — select sólo campos necesarios |
| P2-P3 | Paginación cursor-based en endpoints paginados | M | `cursor` param disponible en /users, /courses, /evaluations |
| P2-H1 | Health check Prisma (`prisma.$queryRaw(SELECT 1)`) | S | `/health` verifica conexión Prisma |
| P2-H2 | Retry/backoff en queries críticas | M | `p-retry` o lógica propia en repositorios Prisma |
| P2-H3 | Error handling consistente (PrismaClientKnownRequestError) | M | Errores Prisma mapeados a `exceptions/` del repo |
| P2-D1 | Runbooks en `docs/` | M | Runbook de deploy, migrations, rollback |
| P2-D2 | Checklist de release final | S | `docs/CHECKLIST_RELEASE.md` |

### Eliminación de dependencias

```bash
npm uninstall knex objection
# Si mysql2 ya no se usa directamente (Prisma incluye su propio driver):
npm uninstall mysql2
```

Archivos a borrar:
- `src/config/db.js`
- `src/config/knexfile.js`
- `src/migrations/` (historial conservado en `prisma/migrations/`)
- `src/seeds/` (reemplazar con Prisma fixtures si aplica)
- Todos los `*.model.js` de Objection

### Migrations Prisma (estrategia baseline)

```bash
# 1. Marcar el schema actual como baseline (no re-ejecutar las 93 migrations de Knex)
npx prisma migrate resolve --applied 00000000000000_init

# 2. Crear primera migration real de Prisma
npx prisma migrate dev --name add_prisma_control
```

### Índices recomendados (basado en queries identificadas)

| Tabla | Columna(s) | Justificación |
|---|---|---|
| `users` | `email` | findUnique en login (alta frecuencia) |
| `users` | `roleId` | getAll filtra por roleId |
| `users` | `lastLogin` | deleteInactive filtra por fecha |
| `packages` | `userId` | FK con acceso frecuente |
| `progress` | `userId, courseId` | Queries de progreso por usuario+curso |
| `evaluations` | `userId, createdAt` | Latest evaluations por usuario |
| `schedule` | `userId, date` | Calendario por usuario y fecha |

### Error mapping Prisma → exceptions

```typescript
// src/utils/prisma-errors.ts
import { Prisma } from '@prisma/client'
import { NotFoundException, ConflictException } from 'exceptions'

export function handlePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') throw new ConflictException('Duplicate entry')
    if (error.code === 'P2025') throw new NotFoundException('Record not found')
  }
  throw error
}
```

### Exit criteria P2

- [ ] Knex y Objection removidos del `package.json` y del código
- [ ] Prisma como única capa DB
- [ ] `prisma migrate deploy` funciona en CI
- [ ] Tests e2e de critical paths estables (`src/__test__/e2e/`)
- [ ] Runbook de rollback listo (`docs/ROLLBACK_STRATEGY.md`)
- [ ] Performance: ninguna query individual > 200ms en p95 (medido en staging)

---

## Templates de PR

### P0 — PR Description Template

```markdown
## P0: [nombre-corto-del-cambio]

### Qué cambia
<!-- Descripción en 2-3 líneas -->

### Por qué
<!-- Motivación en una línea -->

### Archivos tocados
- `src/...`

### Checklist QA
- [ ] `npm run build` exitoso
- [ ] `npm test` pasa (sin tests nuevos fallando)
- [ ] `npx tsc --noEmit` sin errores
- [ ] Sin cambios en contratos de API
- [ ] `.env.example` actualizado si se añade variable nueva

### Rollback
```bash
git revert <hash>
npm install
```

### Notas de migración
<!-- Cualquier consideración de orden de merge -->
```

### P1 — PR Description Template

```markdown
## P1-F[N]: Migrate [flow-name] to Prisma

### Flow migrando
<!-- Ej: Users CRUD -->

### Estrategia dual-path
- Env var de switch: `USE_PRISMA_USERS`
- Repo Knex: `[nombre].service.js` (sin modificar)
- Repo Prisma: `[nombre].prisma.repository.ts` (nuevo)

### Cambios de comportamiento
<!-- Si aplica — documentar diff de response shape -->
| Campo | Antes | Después |
|---|---|---|

### Checklist QA
- [ ] `USE_PRISMA_[FLOW]=false` → comportamiento idéntico al pre-PR
- [ ] `USE_PRISMA_[FLOW]=true` → tests del flow pasan
- [ ] 60%+ coverage en módulos tocados
- [ ] Transacciones probadas (si aplica)
- [ ] Query logging verificado en dev (sin secretos)
- [ ] Smoke test en staging

### Rollback
```bash
# 1. Rollback de código:
git revert <hash>

# 2. Rollback de env:
# Quitar USE_PRISMA_[FLOW]=true del .env / docker-compose
```
```

### P2 — PR Description Template

```markdown
## P2: [nombre — ej: Remove Knex/Objection]

### Qué se elimina
- Dependencias: knex, objection
- Archivos: src/config/db.js, src/config/knexfile.js, src/migrations/
- Modelo Objection: [lista]

### Verificación de no-regresión
- [ ] Todos los flows previamente migrados a Prisma
- [ ] Tests e2e pasan
- [ ] `npm install` sin knex/objection exitoso
- [ ] Docker build exitoso

### Checklist QA
- [ ] Knex no aparece en `package.json` final
- [ ] `import from 'knex'` → 0 resultados en codebase
- [ ] `import { Model } from 'objection'` → 0 resultados
- [ ] Health check Prisma funciona
- [ ] Prisma migrations baseline aplicado
- [ ] Staging: smoke tests pasan

### Rollback
```bash
# P2 no tiene rollback de DB (Prisma toma control del schema).
# Schema backup previo a P2 es OBLIGATORIO:
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME > backup_pre_p2_$(date +%Y%m%d).sql
# Para restaurar código:
git revert <hash>
git checkout <tag-pre-P2>
npm install
```
```

---

## Comandos de referencia

### Auditoría

```bash
# Todos los imports Knex/Objection
rg "from 'knex'|from 'objection'" src/ --include="*.js" -l

# Transacciones
rg "\.transaction\(" src/ --include="*.js"

# Raw queries  
rg "\.raw\(" src/ --include="*.js"

# req.user
rg "req\.user" src/ --include="*.js" -c

# Variables de entorno
rg "process\.env\." src/ --include="*.js" -o | grep -oP "process\.env\.\w+" | sort -u

# Modelos Objection
find src/api -name "*.model.js"

# Archivos de migración Knex
ls src/migrations | wc -l
```

### Ejecución de tests

```bash
# Suite completa con cobertura
npm run test:coverage

# Solo tests unitarios
npx jest --testPathPattern="__test__" --no-coverage

# Tests de un módulo específico
npx jest authentication.controller --no-coverage

# Tests e2e
npx jest --testPathPattern="e2e" --no-coverage

# Watch mode (desarrollo)
npx jest --watch
```

### Smoke tests (curl)

```bash
BASE_URL="http://localhost:3100"
API="$BASE_URL/api/v1"

# Health
curl -sf "$BASE_URL/health" | jq .

# Sign in (esperar 4xx con credenciales falsas)
curl -sf -o /dev/null -w "%{http_code}" \
  -X POST "$API/authentication/signin" \
  -H "Content-Type: application/json" \
  -d '{"email":"nobody@test.com","password":"wrong"}' \
  | grep -E "^4"

# Ruta protegida sin token (esperar 401)
curl -sf -o /dev/null -w "%{http_code}" \
  "$API/users" \
  | grep "^401"

# Metrics
curl -sf "$BASE_URL/metrics" | head -5
```

### Verificación Docker

```bash
# Build
docker build -t serverv2:migration-test .

# Run (con env de test)
docker run --rm --env-file .env.test -p 3100:3100 serverv2:migration-test &
sleep 5

# Health check
curl -sf http://localhost:3100/health

# Kill
docker stop $(docker ps -q --filter ancestor=serverv2:migration-test)
```

### Prisma

```bash
# Pull schema desde DB existente
npx prisma db pull

# Validar schema
npx prisma validate

# Generar Prisma Client
npx prisma generate

# Abrir Prisma Studio (inspección visual)
npx prisma studio

# Estado de migrations
npx prisma migrate status

# Aplicar migrations en staging/prod
npx prisma migrate deploy
```

---

## Ramas sugeridas

| Fase | Rama | Base |
|---|---|---|
| P0-1 | `feat/p0-typescript-toolchain` | `main` |
| P0-3 | `feat/p0-tsconfig` | `feat/p0-typescript-toolchain` |
| P0-4 | `feat/p0-express-types` | `main` |
| P0-5 | `feat/p0-env-schema-zod` | `main` |
| P0-6 | `feat/p0-smoke-tests` | `main` |
| P1-S | `feat/p1-prisma-setup` | `main` |
| P1-F1 | `feat/p1-auth-prisma` | `feat/p1-prisma-setup` |
| P1-F2 | `feat/p1-users-prisma` | `feat/p1-prisma-setup` |
| P1-F3 | `feat/p1-courses-prisma` | `feat/p1-prisma-setup` |
| P1-F4 | `feat/p1-packages-prisma` | `feat/p1-prisma-setup` |
| P1-F5 | `feat/p1-evaluations-prisma` | `feat/p1-prisma-setup` |
| P2-M1 | `feat/p2-migrate-remaining` | `main` |
| P2-M2 | `feat/p2-remove-knex-objection` | `feat/p2-migrate-remaining` |
| P2-P | `feat/p2-performance` | `main` |
