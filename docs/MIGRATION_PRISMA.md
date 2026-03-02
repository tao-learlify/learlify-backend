# Guía de Migración a Prisma ORM

**Proyecto:** serverv2  
**Fecha:** 2026-03-03  
**ORM actual:** Knex `^3.1.0` + Objection `^3.1.5`  
**ORM destino:** Prisma `^6.x`  
**DB:** MySQL

---

## Tabla de contenidos

1. [Contexto y decisiones de diseño](#contexto-y-decisiones-de-diseño)
2. [Setup inicial](#setup-inicial)
3. [Schema Prisma — referencia](#schema-prisma--referencia)
4. [Patrón de repositorio dual-path](#patrón-de-repositorio-dual-path)
5. [Mapeo Objection → Prisma por operación](#mapeo-objection--prisma-por-operación)
6. [Transacciones](#transacciones)
7. [Migrations strategy](#migrations-strategy)
8. [Testing con Prisma](#testing-con-prisma)
9. [Checklist de migración por flow](#checklist-de-migración-por-flow)

---

## Contexto y decisiones de diseño

### Por qué Prisma

| Criterio | Knex/Objection | Prisma |
|---|---|---|
| Type safety | Manual (JSDoc) | Auto-generado desde schema |
| Migrations | SQL manual + Knex CLI | `prisma migrate` declarativo |
| Query API | Builder imperativo | Client generado type-safe |
| Relaciones | `withGraphFetched` string-based | `include` type-checked |
| Introspección de DB | No | `prisma db pull` |
| Studio (GUI) | No | `prisma studio` incluido |

### Decisión: `prisma db pull` sobre schema manual

El repo tiene 93 migraciones Knex. En lugar de escribir el schema Prisma manualmente, se usa `prisma db pull` para introspectarlo desde la DB en ejecución. La normalización posterior se hace en un segundo paso.

### Decisión: PrismaClient singleton

En Node.js con hot reload (desarrollo) o en serverless, crear múltiples instancias de PrismaClient agota el pool de conexiones. Se usa el patrón singleton global.

---

## Setup inicial

### Instalación

```bash
npm install @prisma/client
npm install --save-dev prisma
```

### Inicialización

```bash
npx prisma init --datasource-provider mysql
```

Genera:
- `prisma/schema.prisma` — schema vacío con datasource MySQL
- `.env` — actualiza con `DATABASE_URL`

### Variable de entorno

```bash
# .env
DATABASE_URL="mysql://user:password@host:3306/dbname"
```

Actualizar `src/config/env.ts` para incluir `DATABASE_URL`.

### Introspección del schema existente

Con la DB en ejecución y `DATABASE_URL` configurado:

```bash
npx prisma db pull
```

Esto genera `prisma/schema.prisma` completo desde las 93 migragiones Knex aplicadas.

Después validar:

```bash
npx prisma validate
```

Corregir advertencias de `prisma db pull` (nombres de relaciones ambiguos, columnas sin nombre canónico, etc.).

### Generar Prisma Client

```bash
npx prisma generate
```

Repite este comando cada vez que el schema cambie.

### Singleton de PrismaClient

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
          ]
        : [{ emit: 'stdout', level: 'error' }],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    const logger = require('utils/logger').default
    logger.debug('prisma:query', {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    })
  })
}
```

---

## Schema Prisma — referencia

El schema completo se genera con `prisma db pull`. A continuación se documenta la estructura esperada de las entidades principales para validar post-pull:

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id           Int       @id @default(autoincrement())
  email        String    @unique @db.VarChar(255)
  password     String
  firstName    String    @db.VarChar(30)
  lastName     String    @db.VarChar(30)
  imageUrl     String?
  isVerified   Boolean   @default(false)
  roleId       Int
  modelId      Int?
  lastLogin    DateTime? @db.Date
  googleId     String?
  lang         String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  role         Role      @relation(fields: [roleId], references: [id])
  model        ExamModel? @relation(fields: [modelId], references: [id])
  packages     Package[]
  progress     Progress[]
  cloudStorage CloudStorage[]
  schedules    Schedule[]
  evaluations  Evaluation[]
  meetings     Meeting[]
  gifts        Gift[]

  @@index([email])
  @@index([roleId])
  @@index([lastLogin])
  @@map("users")
}

model Role {
  id    Int    @id @default(autoincrement())
  name  String @unique @db.VarChar(50)
  users User[]

  @@map("roles")
}

model Package {
  id                    Int     @id @default(autoincrement())
  userId                Int
  planId                Int
  stripeSubscriptionId  String?
  status                String  @default("active")
  isActive              Boolean @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])
  plan Plan @relation(fields: [planId], references: [id])

  @@index([userId])
  @@map("packages")
}

model Plan {
  id       Int       @id @default(autoincrement())
  name     String
  price    Decimal
  duration Int
  packages Package[]

  @@map("plans")
}

model Progress {
  id        Int      @id @default(autoincrement())
  userId    Int
  courseId  Int?
  score     Float?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user   User    @relation(fields: [userId], references: [id])
  course Course? @relation(fields: [courseId], references: [id])

  @@index([userId, courseId])
  @@map("progress")
}

model ExamModel {
  id    Int    @id @default(autoincrement())
  name  String
  users User[]

  @@map("exam_models")
}
```

El resto de modelos (Evaluation, Schedule, Meeting, Course, etc.) se generan con `prisma db pull`.

---

## Patrón de repositorio dual-path

### Interfaz de repositorio

```typescript
// src/api/users/users.repository.interface.ts
import { UserRecord, UserWithRelations, CreateUserDto, UpdateUserDto, GetUsersQuery } from './users.types'

export interface IUsersRepository {
  getAll(query: GetUsersQuery, search?: string): Promise<{ results: UserWithRelations[]; total: number }>
  getOne(params: Partial<UserRecord> & { allowPrivateData?: boolean }): Promise<UserWithRelations | null>
  create(data: CreateUserDto): Promise<UserWithRelations>
  updateOne(data: UpdateUserDto): Promise<UserWithRelations>
  deleteInactive(): Promise<number>
}
```

### Implementación Knex (wrapper del servicio existente)

```typescript
// src/api/users/users.knex.repository.ts
import { UsersService } from './users.service'
import { IUsersRepository } from './users.repository.interface'

export class UsersKnexRepository implements IUsersRepository {
  private service = new UsersService()

  getAll(query: any, search?: string) {
    return this.service.getAll(query, search)
  }

  getOne(params: any) {
    return this.service.getOne(params)
  }

  create(data: any) {
    return this.service.create(data)
  }

  updateOne(data: any) {
    return this.service.updateOne(data)
  }

  deleteInactive() {
    return this.service.deleteInactive()
  }
}
```

### Implementación Prisma

```typescript
// src/api/users/users.prisma.repository.ts
import { prisma } from 'lib/prisma'
import { IUsersRepository } from './users.repository.interface'
import { CreateUserDto, UpdateUserDto, GetUsersQuery } from './users.types'
import { handlePrismaError } from 'utils/prisma-errors'

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  imageUrl: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
}

const USER_INCLUDE = {
  role: { select: { id: true, name: true } },
  model: { select: { id: true, name: true } },
}

export class UsersPrismaRepository implements IUsersRepository {
  async getAll({ roleId, page = 1, limit = 10 }: GetUsersQuery, search?: string) {
    const where = {
      ...(roleId && { roleId }),
      ...(search && {
        email: { contains: search },
      }),
    }

    const [results, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: { ...USER_SELECT },
        include: { ...USER_INCLUDE },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return { results, total }
  }

  async getOne(params: any) {
    const { id, allowPrivateData, ...rest } = params

    const select = allowPrivateData
      ? { ...USER_SELECT, password: true }
      : USER_SELECT

    if (id) {
      return prisma.user.findUnique({
        where: { id },
        select,
        include: USER_INCLUDE,
      })
    }

    return prisma.user.findFirst({
      where: rest,
      select,
      include: USER_INCLUDE,
    })
  }

  async create(data: CreateUserDto) {
    return prisma.user.create({
      data,
      select: USER_SELECT,
      include: USER_INCLUDE,
    })
  }

  async updateOne({ id, ...data }: UpdateUserDto) {
    return prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT,
      include: USER_INCLUDE,
    })
  }

  async deleteInactive() {
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const result = await prisma.user.deleteMany({
      where: {
        lastLogin: { lt: threeMonthsAgo },
        role: { name: 'User' },
      },
    })

    return result.count
  }
}
```

### Switch de implementación

```typescript
// src/api/users/users.factory.ts
import { IUsersRepository } from './users.repository.interface'
import { UsersKnexRepository } from './users.knex.repository'
import { UsersPrismaRepository } from './users.prisma.repository'

export function createUsersRepository(): IUsersRepository {
  return process.env.USE_PRISMA_USERS === 'true'
    ? new UsersPrismaRepository()
    : new UsersKnexRepository()
}
```

---

## Mapeo Objection → Prisma por operación

### Queries básicas

| Operación | Objection (actual) | Prisma (nuevo) |
|---|---|---|
| Buscar por ID | `User.query().findById(id)` | `prisma.user.findUnique({ where: { id } })` |
| Buscar uno por campo | `User.query().findOne({ email })` | `prisma.user.findFirst({ where: { email } })` |
| Buscar todos | `User.query().where(opts)` | `prisma.user.findMany({ where: opts })` |
| Insert + fetch | `User.query().insertAndFetch(data)` | `prisma.user.create({ data })` |
| Update + fetch | `User.query().patchAndFetchById(id, data)` | `prisma.user.update({ where: { id }, data })` |
| Delete | `User.query().deleteById(id)` | `prisma.user.delete({ where: { id } })` |
| Count | `User.query().count()` | `prisma.user.count()` |
| Paginación | `.page(n, limit)` | `.skip(n * limit).take(limit)` |

### Relaciones (withGraphFetched → include)

| Objection | Prisma |
|---|---|
| `.withGraphFetched('roles')` | `include: { role: true }` |
| `.withGraphFetched('[roles, packages]')` | `include: { role: true, packages: true }` |
| `.withGraphFetched('roles(name)')` (modifier) | `include: { role: { select: { name: true } } }` |
| `.withGraphFetched('[packages.[plan]]')` (nested) | `include: { packages: { include: { plan: true } } }` |

### Select específico

| Objection | Prisma |
|---|---|
| `.select(['email', 'firstName'])` | `select: { email: true, firstName: true }` |
| `.select(clientAttributes)` | `select: Object.fromEntries(clientAttributes.map(k => [k, true]))` |

### Paginación con total

```typescript
// Objection
const result = await User.query().page(page - 1, limit)
// result.results, result.total

// Prisma
const [results, total] = await prisma.$transaction([
  prisma.user.findMany({ skip: (page - 1) * limit, take: limit }),
  prisma.user.count(),
])
```

---

## Transacciones

### Transacciones identificadas en el repo

| Service | Operación | Complejidad |
|---|---|---|
| `schedule.service.js` | Multi-insert de eventos de horario | Med |
| `evaluations.services.js` | Insert evaluación + update progress | **High** |
| `progress.service.js` (x2) | Update score + notification + cloud storage | **High** |
| `classes.service.js` | Insert clase + asignación de recursos | Med |
| `gifts.service.js` (x2) | Transfer créditos entre usuarios | Med |

### Patrón actual (Objection)

```javascript
const result = await Schedule.knex().transaction(async trx => {
  const event = await Schedule.query(trx).insertAndFetch(data)
  await Notification.query(trx).insert({ userId: data.userId, ... })
  return event
})
```

### Equivalente Prisma

```typescript
const result = await prisma.$transaction(async (tx) => {
  const event = await tx.schedule.create({ data })
  await tx.notification.create({ data: { userId: data.userId, ... } })
  return event
})
```

### Transacciones interactivas (con retry)

Para transacciones largas o con riesgo de deadlock:

```typescript
const result = await prisma.$transaction(
  async (tx) => {
    const evaluation = await tx.evaluation.create({ data: evalData })
    await tx.progress.update({
      where: { id: progressId },
      data: { score: newScore },
    })
    return evaluation
  },
  {
    maxWait: 5000,
    timeout: 10000,
    isolationLevel: 'ReadCommitted',
  }
)
```

### Manejo de `transactionError` heredado

El patrón actual devuelve `{ transactionError: true }` en catch. Con Prisma, se lanza directamente la excepción:

```typescript
try {
  const result = await prisma.$transaction(async (tx) => {
    return tx.evaluation.create({ data })
  })
  return result
} catch (error) {
  handlePrismaError(error)
}
```

Los controladores que chequean `response.transactionError` deben actualizarse para capturar la excepción en su lugar.

---

## Migrations strategy

### Situación de partida

93 migraciones Knex ya aplicadas en producción. El schema de DB está en estado conocido.

### Objetivo

Prisma toma el control del historial de migrations **sin re-ejecutar** las 93 de Knex.

### Pasos

```bash
# 1. Crear directorio de migrations Prisma
mkdir -p prisma/migrations/00000000000000_init

# 2. Crear migration "baseline" vacía (solo marca el schema como aplicado)
touch prisma/migrations/00000000000000_init/migration.sql

# 3. Marcar como aplicada sin ejecutar
npx prisma migrate resolve --applied 00000000000000_init

# 4. Verificar estado
npx prisma migrate status
# Debe mostrar: 00000000000000_init — Applied

# 5. Crear primer migration real
npx prisma migrate dev --name initial_prisma_schema
```

**Nunca** ejecutar `prisma migrate reset` en producción — borra la DB.

### Migration de desarrollo vs producción

| Entorno | Comando |
|---|---|
| Desarrollo | `npx prisma migrate dev --name [descripción]` |
| CI/Staging/Prod | `npx prisma migrate deploy` |
| Reset DB dev (solo local) | `npx prisma migrate reset` |

### Convención de nombres de migration

```
YYYYMMDDHHMMSS_descripcion_snake_case
Ejemplo: 20260304120000_add_google_id_to_users
```

---

## Testing con Prisma

### Estrategia de mocks para tests unitarios

En tests unitarios (controladores, servicios), el `PrismaClient` se mockea completamente:

```typescript
// src/__test__/helpers/prisma.mock.ts
import { PrismaClient } from '@prisma/client'

const prismaMock = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
  $disconnect: jest.fn(),
}

jest.mock('lib/prisma', () => ({
  prisma: prismaMock,
}))

export { prismaMock }
```

Uso en tests:

```typescript
import { prismaMock } from '../helpers/prisma.mock'

describe('UsersPrismaRepository', () => {
  beforeEach(() => jest.clearAllMocks())

  it('getOne returns user by id', async () => {
    const user = { id: 1, email: 'u@t.com', firstName: 'A' }
    prismaMock.user.findUnique.mockResolvedValue(user)

    const repo = new UsersPrismaRepository()
    const result = await repo.getOne({ id: 1 })

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } })
    )
    expect(result).toEqual(user)
  })
})
```

### Tests de integración (contra DB)

Para tests de integración, usar una DB MySQL de test en Docker:

```yaml
# docker-compose.test.yml
services:
  db-test:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: serverv2_test
    ports:
      - "3307:3306"
```

```bash
# Arrancar DB de test
docker compose -f docker-compose.test.yml up -d

# Aplicar schema
DATABASE_URL="mysql://root:root@localhost:3307/serverv2_test" npx prisma migrate deploy

# Correr tests de integración
DATABASE_URL="mysql://root:root@localhost:3307/serverv2_test" npx jest --testPathPattern="integration"
```

### Limpieza de DB entre tests

```typescript
// src/__test__/helpers/db-cleanup.ts
import { prisma } from 'lib/prisma'

export async function cleanDatabase() {
  await prisma.$transaction([
    prisma.evaluation.deleteMany(),
    prisma.progress.deleteMany(),
    prisma.package.deleteMany(),
    prisma.user.deleteMany({ where: { email: { contains: '@test.com' } } }),
  ])
}
```

---

## Checklist de migración por flow

Para cada flow (ej: Users, Auth, Courses):

```
PRE-MIGRACIÓN
□ Flow tiene tests con cobertura ≥ 60%
□ Contratos de API documentados (response shapes actuales)
□ Rama feature/p1-[flow]-prisma creada

SETUP PRISMA
□ prisma.schema.prisma tiene modelo(s) del flow correctos
□ npx prisma generate ejecutado
□ src/lib/prisma.ts existe

IMPLEMENTACIÓN
□ [flow].repository.interface.ts creado
□ [flow].knex.repository.ts (wrapper del service existente) creado
□ [flow].prisma.repository.ts implementado
□ [flow].factory.ts con switch USE_PRISMA_[FLOW]
□ Controlador usa factory en lugar del service directo

VALIDACIÓN
□ USE_PRISMA_[FLOW]=false → comportamiento idéntico al pre-PR
□ USE_PRISMA_[FLOW]=true → tests del flow pasan
□ Transacciones (si aplica) migradas a prisma.$transaction
□ Logging de queries activo en dev
□ Sin overfetch (select sólo campos necesarios)
□ Smoke test en staging con USE_PRISMA_[FLOW]=true

POST-MERGE
□ Activar USE_PRISMA_[FLOW]=true en staging durante 48h
□ Si sin incidencias → activar en producción
□ Marcar KnexRepository del flow como deprecated
□ Issue abierto para remover KnexRepository en P2
```
