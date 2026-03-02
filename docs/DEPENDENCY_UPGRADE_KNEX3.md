# Plan de Migración: Knex 0.21 → 3.x

**Proyecto:** serverv2  
**Fecha de auditoría:** 2026-03-02  
**Autor:** Principal Backend Engineer  
**Estado:** En progreso — PR-A en curso

---

## Resumen ejecutivo

| Elemento | Antes | Después |
|---|---|---|
| `knex` | `0.21.17` | `^3.x` |
| `mysql` (driver) | `^2.18.1` | **eliminado** |
| `mysql2` (driver) | no instalado | `^3.x` |
| `objection` | `^2.2.1` | `^3.x` (PR-D) |
| Node mínimo | 10+ | 12+ (Knex 2+) |

El cambio más disruptivo es la **eliminación del driver `mysql`** en Knex 2.0 a favor de `mysql2`. El cliente se lee desde `process.env.DB_CLIENT` en `knexfile.js`, lo que significa que el cambio de driver solo requiere `npm install mysql2`, desinstalar `mysql`, y actualizar la variable de entorno — sin tocar código de queries, transacciones o modelos.

El segundo cambio de mayor riesgo es la **incompatibilidad de Objection 2.x con Knex 3.x**, que requiere un PR-D dedicado.

---

## Alcance

- `src/config/knexfile.js` — configuración de conexión
- `src/config/db.js` — instanciación de Knex + `Model.knex()`
- `src/migrations/` — 85 archivos de migración
- `src/seeds/` — 4 archivos seed
- Servicios con transacciones directas:
  - `src/api/packages/packages.service.js` (líneas 142, 353)
  - `src/api/progress/progress.service.js` (líneas 113, 368)
  - `src/api/schedule/schedule.service.js` (línea 260)
  - `src/api/stats/stats.service.js` (línea 87)
  - `src/api/gifts/gifts.service.js` (líneas 46, 144)
  - `src/api/classes/classes.service.js` (línea 42)
  - `src/api/evaluations/evaluations.services.js` (línea 201)
  - `src/scripts/marking.js`, `restart.progress.js`, `progress.js`, `merge.js`
- Uso directo de instancia Knex:
  - `src/api/health/health.routes.js` — `db.raw('SELECT 1')`
  - `src/api/stripe/stripe.webhook.js` — `db('stripe_events').where(...).first()`

---

## Paso 0 — Informe de auditoría

### Instanciación de Knex

**Archivo:** `src/config/db.js` (líneas 1–7)

```js
import Knex from 'knex'
import { Model } from 'objection'
import knexFileConfig from './knexfile'

const knexConfig = Knex(knexFileConfig)
Model.knex(knexConfig)

export default knexConfig
```

Knex se instancia una sola vez y se inyecta como singleton en Objection vía `Model.knex()`. No hay instancias adicionales en ningún otro archivo.

---

### Configuración de `knexfile.js`

```js
const connection = {
  port: process.env.DB_PORT,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8',
  timezone: 'UTC',
  typeCast(field, next) {
    if (field.type === 'TINY' && field.length === 1) {
      const value = field.string()
      return value ? value === '1' : null
    }
    return next()
  }
}

module.exports = {
  connection,
  client: process.env.DB_CLIENT,
  migrations: { tableName: 'migrations', directory: '../migrations' },
  seeds: { directory: '../seeds' }
}
```

| Parámetro | Valor actual | Observación |
|---|---|---|
| `client` | `process.env.DB_CLIENT` | Env-configurable — no requiere cambio de código |
| `charset` | `'utf8'` | Soportado por mysql2 (deprecated en favor de `collation`, pero funcional) |
| `timezone` | `'UTC'` | Sin cambio |
| `typeCast` | función custom | Soportado por mysql2 |
| `pool` | no configurado | Knex defaults (min:2, max:10 en 0.21; min:2, max:10 en 3.x — sin cambio) |
| `debug` | no configurado | Sin cambio |

**Riesgo pool:** Bajo. Knex 3.x cambió el proveedor de pool de `generic-pool@2` a `tarn@3`. La config `{ min, max, acquireTimeoutMillis }` es compatible. Sin cambios requeridos.

---

### Superficie de uso Knex

#### `.raw()`

| Archivo | Línea | Uso | Riesgo |
|---|---|---|---|
| `src/api/health/health.routes.js` | 11 | `db.raw('SELECT 1')` | Bajo |

Sin bindings, sin SQL complejo. Compatible con Knex 3.

#### `.transaction()`

**12 ocurrencias** en servicios y scripts. Todas usan el patrón moderno async/await con callback:

```js
const result = await knex.transaction(async trx => {
  // ...
  return value
})
```

Este patrón es **totalmente compatible** con Knex 3. Knex 3 eliminó el soporte de callbacks-style (`knex.transaction(function(trx) { ... }, callback)`), pero ninguno de los archivos usa ese patrón legacy.

**Excepción detectada (bug pre-existente, no relacionado con upgrade):**

`src/api/packages/packages.service.js` línea 353 — `Package.knex().transaction(...)` sin `await`. La transacción se lanza pero el resultado no se espera correctamente. Este bug existe en Knex 0.21 también y no es causado por el upgrade.

#### `.destroy()`

No se encontraron usos de `db.destroy()` en el código de aplicación. El cierre limpio de proceso solo llama `closeRedisClient()`.

#### `.whereIn()`

| Archivo | Línea | Riesgo |
|---|---|---|
| `src/api/plans/plans.service.js` | 47 | Medio — `names` podría ser vacío |
| `src/middlewares/index.js` | 276 | Bajo — `[plans]` siempre tiene 1 elemento |

En Knex 0.21, `.whereIn('col', [])` generaba `WHERE 1=0` (sin resultados, sin error). En Knex 2.x+, este comportamiento cambió: puede generar `WHERE FALSE` o lanzar según el contexto. El resultado observable es el mismo (0 filas), pero se debe verificar.

#### `.onConflict()`

No encontrado en el repositorio.

#### `.schema.*` y migraciones

- **`createTableIfNotExists`**: no encontrado en ningún archivo de migración. Solo existe en documentación del changelog. **Sin riesgo.**
- Todas las migraciones usan `createTable` / `dropTableIfExists` / `table.increments`, `table.string`, `table.integer`, `table.foreign`, `table.timestamp` — API estable sin cambios en Knex 3.
- No hay SQL específico de engine MySQL (`ENGINE=InnoDB`, `CHARSET`, `COLLATE`) en ninguna migración.

---

### Seeds

| Archivo | Patrón | Riesgo |
|---|---|---|
| `01_create_categories.js` | `exports.seed = function(knex)` + `.then()` chain | Bajo |
| `02_create_roles_and_admin.js` | `exports.seed = function(knex)` + `.then()` chain anidada | Bajo |
| `03_create_plans.js` | por verificar | — |
| `course.js` | por verificar | — |

Knex 3 soporta tanto la firma sync-returning-promise como async/await en seeds. Los archivos actuales retornan la cadena de promesas correctamente y son compatibles. No se requieren cambios.

---

### Objection

| Propiedad | Valor |
|---|---|
| Versión | `^2.2.1` |
| Inicialización | `Model.knex(knexConfig)` en `db.js` |
| Patrones usados | `Model.query()`, `$relatedQuery`, `withGraphFetched`, `withGraphJoined`, `insertAndFetch`, `patchAndFetchById`, `findOne`, `count` |
| `Model.knex()` en servicios | `Package.knex()`, `Schedule.knex()`, `Stats.knex()`, `Gift.knex()`, `Classes.knex()`, `Evaluation.knex()`, `Progress.knex()` → todos usan `.transaction()` |

**Riesgo Alto:** Objection 2.x no es compatible con Knex 3.x. Objection 3.x fue lanzado específicamente para Knex 2.x+. PR-D es obligatorio junto con o después de PR-C.

La API de Objection 3.x es mayoritariamente compatible con Objection 2.x. Los cambios relevantes son mínimos (ver PR-D).

---

### Comandos de auditoría reproducibles

```bash
# No hay createTableIfNotExists en migraciones
grep -r "createTableIfNotExists" src/migrations/

# whereIn con posible array vacío
grep -rn "\.whereIn(" src/ --include="*.js" | grep -v "__test__" | grep -v node_modules

# Uso de .raw()
grep -rn "\.raw(" src/ --include="*.js" | grep -v "__test__" | grep -v node_modules | grep -v stripe

# Transacciones
grep -rn "\.transaction(" src/ --include="*.js" | grep -v node_modules | grep -v changelog

# Client mysql hardcoded
grep -rn "client.*['\"]mysql['\"]" src/ --include="*.js" | grep -v node_modules

# DB_CLIENT en env
grep -r "DB_CLIENT" src/ .env

# Dejar el knexfile con DB_CLIENT como env
grep -n "client" src/config/knexfile.js

# Patrones Objection 2.x potencialmente romperlos
grep -rn "withGraphFetched\|withGraphJoined\|eager(" src/ --include="*.js" | grep -v node_modules | grep -v __test__
```

---

## Paso 1 — Estrategia de PRs

```
main
 └─ upgrade/wave-5-knex3-safety-net      (PR-A)
     └─ upgrade/wave-5-knex3-driver      (PR-B)
         └─ upgrade/wave-5-knex3-upgrade (PR-C)
             └─ upgrade/wave-5-knex3-objection (PR-D)
```

---

### PR-A — Safety net

**Branch:** `upgrade/wave-5-knex3-safety-net`  
**Base:** `main`  
**Objetivo:** Establecer tests de DB como red de seguridad antes de cualquier cambio de dependencias.

**Cambios:**
1. `src/__test__/db/knex.db.test.js` — tests de conexión, query, transacción
2. Documentar este plan

**Checklist de QA:**
- [ ] `npm test` — 100 passed / 0 failed
- [ ] Nuevo suite `knex.db.test.js` ejecuta con mocks (no requiere DB real)
- [ ] `npm run build` sin errores

**Criterios de aceptación:**
- Los tests de DB mockean Knex y cubren: `db.raw('SELECT 1')`, un SELECT de tabla, una transacción con rollback controlado
- 0 cambios en código de producción

**Rollback:** `git revert HEAD` — no hay cambios de producción

---

### PR-B — Driver prep

**Branch:** `upgrade/wave-5-knex3-driver`  
**Base:** `upgrade/wave-5-knex3-safety-net`  
**Objetivo:** Migrar de `mysql` a `mysql2` sin cambiar versión de Knex.

**Cambios:**
1. `npm uninstall mysql && npm install mysql2`
2. `.env` / `.env.example`: `DB_CLIENT=mysql` → `DB_CLIENT=mysql2`
3. Sin cambios de código fuente

**Checklist de QA:**
- [ ] `npm test` — 100 passed / 0 failed
- [ ] `npm run build` sin errores
- [ ] `npm run migrate` (contra DB real) — no errores
- [ ] `GET /health` → `{ status: 'ok' }` (con DB real)

**Criterios de aceptación:**
- `require('mysql2')` disponible en `node_modules`
- `package.json` sin `mysql`, con `mysql2`
- Tests verdes con el mismo baseline

**Rollback:**
```bash
npm uninstall mysql2 && npm install mysql@^2.18.1
# y revertir .env: DB_CLIENT=mysql
```

---

### PR-C — Knex 3 upgrade

**Branch:** `upgrade/wave-5-knex3-upgrade`  
**Base:** `upgrade/wave-5-knex3-driver`  
**Objetivo:** Actualizar Knex de 0.21.17 a ^3.x.

**Cambios:**
1. `npm install knex@^3.0.0`
2. Ajustes requeridos por breaking changes (ver Paso 2)
3. Guard para `.whereIn` vacío en `plans.service.js`

**Checklist de QA:**
- [ ] `npm test` — 100 passed / 0 failed
- [ ] `npm run migrate` — no errores
- [ ] `npm run seed` — no errores
- [ ] `npm run build` — no errores
- [ ] `GET /health` → `{ status: 'ok' }` (con DB real)
- [ ] Smoke: `GET /api/v1/plans?model=IELTS` → 200

**Criterios de aceptación:**
- `knex@^3.x` en `package.json`
- Sin regresiones en suite de tests
- Migraciones ejecutan sin error en DB real

**Rollback:**
```bash
npm install knex@0.21.17
npm ci
```

---

### PR-D — Objection alignment

**Branch:** `upgrade/wave-5-knex3-objection`  
**Base:** `upgrade/wave-5-knex3-upgrade`  
**Objetivo:** Actualizar Objection de 2.x a 3.x por incompatibilidad con Knex 3.

**Cambios:**
1. `npm install objection@^3.0.0`
2. Verificar y ajustar modelos si alguna API cambió
3. Sin cambios en lógica de negocio

**Checklist de QA:**
- [ ] `npm test` — 100 passed / 0 failed
- [ ] Smoke de endpoints transaccionales: paquete, evaluación, progreso
- [ ] `npm run build` — no errores

**Criterios de aceptación:**
- `objection@^3.x` en `package.json`
- Sin regresiones en suite de tests
- Los endpoints transaccionales funcionan correctamente

**Rollback:**
```bash
npm install objection@^2.2.1
npm ci
```

---

## Paso 2 — Breaking changes relevantes

### BC-1: Driver `mysql` eliminado — migración a `mysql2`

**Versión que lo introduce:** Knex 2.0  
**Riesgo:** Alto  
**Archivos afectados:** `src/config/knexfile.js` (campo `client`), `.env`

**Detección:**
```bash
grep -rn "DB_CLIENT" .env src/config/knexfile.js
```

**Impacto:** Knex 3 lanza error de boot si `client: 'mysql'` — el driver `mysql` fue removido del ecosistema soportado. `mysql2` es el reemplazo drop-in.

**Fix (solo `.env` / entorno — sin cambio de código):**
```
DB_CLIENT=mysql2
```

Y en `package.json`:
```
npm uninstall mysql
npm install mysql2@^3.0.0
```

La función `typeCast` y la opción `charset` son soportadas por `mysql2` de forma idéntica.

**Cómo probarlo:**
```bash
node -e "require('mysql2')"
npm run migrate
GET /health  # debe retornar { status: 'ok' }
```

---

### BC-2: `createTableIfNotExists` removido

**Versión que lo introduce:** Knex 1.0  
**Riesgo:** Ninguno para este repo  
**Estado:** No encontrado en `src/migrations/` — **sin acción requerida**

**Detección (para confirmar):**
```bash
grep -r "createTableIfNotExists" src/migrations/
```

Patrón de reemplazo (si fuera necesario):
```js
exports.up = function(knex) {
  return knex.schema.createTable('table_name', table => {
    table.increments('id').primary()
  })
}
```

---

### BC-3: `.whereIn()` con array vacío

**Versión que lo introduce:** Knex 1.0 / 2.0 (comportamiento ajustado)  
**Riesgo:** Medio  
**Archivos afectados:** `src/api/plans/plans.service.js` línea 47

**Detección:**
```bash
grep -n "\.whereIn(" src/api/plans/plans.service.js
```

**Impacto:** En Knex 0.21, `.whereIn('name', [])` generaba `WHERE 1=0` devolviendo 0 filas. En Knex 3, el comportamiento es el mismo (`WHERE false`) pero se volvió más estricto en el parsing interno — en Knex 2.x se introdujo una advertencia cuando el array es vacío.

El caller en `plans.service.js` pasa `names` desde el controller, que siempre envía un array de al menos 1 elemento cuando llega a ese código path. Sin embargo, para defensa en profundidad:

**Fix:**
```js
async getAll({ names, currency, ...options }) {
  if (names && names.length === 0) {
    return []
  }

  if (names) {
    const plans = await Plan.query()
      .whereIn('name', names)
      .andWhere(function () {
        this.where(options)
      })
      .select(this.clientAttributes)
      .withGraphFetched(this.#relation)

    // ...
  }
}
```

**Cómo probarlo:**
```bash
npx jest plans --passWithNoTests
# Y smoke: GET /api/v1/plans?model=IELTS → 200 con array no vacío
```

---

### BC-4: Objection 2.x incompatible con Knex 3

**Versión que lo introduce:** Knex 2.0 (cambios internos en interfaz de builder)  
**Riesgo:** Alto  
**Archivos afectados:** Todos los modelos, todos los servicios

**Detección:**
```bash
grep -rn "from 'objection'" src/ --include="*.js" | head -20
node -e "const { Model } = require('objection'); const Knex = require('knex'); Model.knex(Knex({ client: 'mysql2', connection: {} }))"
```

**Impacto:** `objection@2.x` usa APIs internas de Knex para construir queries que cambiaron en Knex 2+. El error típico es `TypeError: knex(...).queryBuilder is not a function` o errores durante la ejecución de queries Objection.

**Fix:** Actualizar a `objection@^3.0.0` en PR-D. La API pública es mayoritariamente compatible. Cambios a verificar en la migración Objection 2 → 3:

1. `eager()` removido → ya reemplazado por `withGraphFetched` en este repo (confirmado en código)
2. Modifica `relationMappings` para verificar que no usan `join()` deprecated
3. Verificar que `$beforeInsert`, `$beforeUpdate` hooks (si existen) mantienen firma

---

### BC-5: Pool provider cambiado (`generic-pool` → `tarn`)

**Versión que lo introduce:** Knex 2.0  
**Riesgo:** Bajo  
**Estado:** Sin pool explícito en este repo — usa defaults

**Detección:**
```bash
grep -n "pool" src/config/knexfile.js
```

**Impacto:** Si hubiera `pool.afterCreate` o `pool.beforeDestroy` callbacks, su firma cambió. Este repo no los usa → **sin acción requerida**.

---

### BC-6: Missing `await` en transacción (bug pre-existente detectado durante auditoría)

**Riesgo:** Alto (pre-existente, no introducido por el upgrade)  
**Archivo:** `src/api/packages/packages.service.js` línea 353

```js
const transaction = Package.knex().transaction(async trx => {
  // ...
})
return transaction
```

Falta `await` antes de `Package.knex().transaction(...)`. En Knex 0.21 esto puede pasar silenciosamente; en Knex 3 el comportamiento de error propagation puede diferir. Se recomienda corregir en PR-C junto con el upgrade.

**Fix:**
```js
const transaction = await Package.knex().transaction(async trx => {
  // ...
})
return transaction
```

---

## Paso 3 — Snippets de implementación

### Config Knex con `mysql2`

`src/config/knexfile.js` — sin cambios de código, solo variable de entorno:

```js
module.exports = {
  connection,
  client: process.env.DB_CLIENT,
  migrations: {
    tableName: 'migrations',
    directory: '../migrations'
  },
  seeds: {
    directory: '../seeds'
  }
}
```

`.env`:
```
DB_CLIENT=mysql2
```

---

### Guard para `whereIn` con array vacío

`src/api/plans/plans.service.js`:

```js
async getAll({ names, currency, ...options }) {
  if (names !== undefined && names.length === 0) {
    return []
  }

  if (names) {
    const plans = await Plan.query()
      .whereIn('name', names)
      .andWhere(function () {
        this.where(options)
      })
      .select(this.clientAttributes)
      .withGraphFetched(this.#relation)

    const isIELTS = plans.find(({ model }) => model.name === 'IELTS')

    if (currency) {
      // ... resto del código sin cambios
    }

    return plans
  }

  // ... resto del código sin cambios
}
```

---

### Fix del `await` faltante en transacción

`src/api/packages/packages.service.js` línea 353:

```js
async updateAndCreateEvaluation(data) {
  try {
    const transaction = await Package.knex().transaction(async trx => {
      const update = await Package.query(trx).patchAndFetchById(
        data.package.id,
        { [data.type]: data.package[data.type] - 1 }
      )

      await Progress.query(trx).patchAndFetchById(data.progress.id, {
        examJSON: data.progress.examJSON
      })

      const evaluation = await Evaluation.query(trx).insertAndFetch({
        userId: data.user.id,
        progressId: data.progress.id,
        categoryId: data.category.id,
        status: STATUS.PENDING
      })

      return { update, evaluation }
    })

    return transaction
  } catch (err) {
    return { details: err, transactionError: true }
  }
}
```

---

## Paso 4 — Plan de pruebas y smoke

### Tests unit/integration (Jest)

`src/__test__/db/knex.db.test.js` (creado en PR-A):

```js
jest.mock('config/db', () => {
  const mock = jest.fn().mockImplementation(() => ({
    where: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    insert: jest.fn().mockResolvedValue([1])
  }))
  mock.raw = jest.fn().mockResolvedValue([[{ '1': 1 }]])
  mock.transaction = jest.fn().mockImplementation(async cb => {
    const trx = mock
    return cb(trx)
  })
  return { __esModule: true, default: mock }
})

import db from 'config/db'

describe('Knex DB interface', () => {
  it('db.raw executes and resolves', async () => {
    const result = await db.raw('SELECT 1')
    expect(result).toBeDefined()
  })

  it('db() table query resolves', async () => {
    const result = await db('stripe_events').where({ event_id: 'test' }).first()
    expect(result).toBeNull()
  })

  it('db.transaction commits when callback resolves', async () => {
    const result = await db.transaction(async trx => {
      return { ok: true }
    })
    expect(result).toEqual({ ok: true })
  })

  it('db.transaction propagates error when callback rejects', async () => {
    db.transaction.mockImplementationOnce(async cb => {
      try {
        return await cb(db)
      } catch (err) {
        throw err
      }
    })

    await expect(
      db.transaction(async () => {
        throw new Error('tx failed')
      })
    ).rejects.toThrow('tx failed')
  })
})
```

### Smoke scriptable

```bash
# Build
npm run build

# Migraciones
npm run migrate

# Seeds
npm run seed

# Salud de DB
curl -s http://localhost:3100/health | jq .

# Endpoint con SELECT + Objection
curl -s http://localhost:3100/api/v1/plans?model=IELTS \
  -H "Authorization: Bearer $TEST_JWT" | jq .statusCode

# Endpoint transaccional (requiere auth real)
docker compose up -d --build
npm run migrate
```

---

## Paso 5 — Rollback plan

### Rollback de Knex 3 (PR-C)

```bash
# Revertir versión de Knex
npm install knex@0.21.17 --save-exact

# Reinstalar lockfile limpio
npm ci

# Rebuild Docker
docker compose build --no-cache api
docker compose up -d api

# Verificar
curl -s http://localhost:3100/health | jq .
npm run migrate
```

### Rollback de driver mysql2 (PR-B)

```bash
npm uninstall mysql2
npm install mysql@^2.18.1

# Revertir variable de entorno
# .env: DB_CLIENT=mysql

npm ci
docker compose build --no-cache api
docker compose up -d api
```

### Rollback de Objection (PR-D)

```bash
npm install objection@^2.2.1
npm ci
docker compose build --no-cache api
docker compose up -d api
```

### Verificación post-rollback

```bash
curl -s http://localhost:3100/health | jq '{status: .status}'
# Esperado: { "status": "ok" }

npm test
# Esperado: 100 passed / 0 failed

npm run migrate
# Esperado: Already up to date. (no hay nuevas migraciones en PRs de upgrade)
```

---

## Tabla de riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| `client: 'mysql'` causa boot failure | Alta | Alto | PR-B: instalar mysql2 antes de PR-C |
| Objection 2.x incompatible con Knex 3 | Alta | Alto | PR-D obligatorio |
| `whereIn([])` cambia comportamiento | Baja | Bajo | Guard en `plans.service.js` |
| `typeCast` no soportado en mysql2 | Muy Baja | Medio | mysql2 soporta typeCast de mysql |
| `charset: 'utf8'` deprecated en mysql2 | Muy Baja | Bajo | mysql2 acepta charset pero usa collation internamente |
| Pool timeouts diferentes con tarn | Muy Baja | Bajo | Sin pool explícito, defaults son iguales |
| Missing `await` en transacción (pre-existente) | Alta | Alto | Corregir en PR-C |

---

## Historial

| Fecha | Evento |
|---|---|
| 2026-03-02 | Auditoría completa + documento creado |
| — | PR-A merged |
| — | PR-B merged |
| — | PR-C merged |
| — | PR-D merged |

---

## Plantilla de PR description

```markdown
## Qué hace este PR

[Descripción concisa del cambio]

## Por qué

Parte de la migración Knex 0.21 → 3.x documentada en `docs/DEPENDENCY_UPGRADE_KNEX3.md`.

## Breaking changes aplicados

- [ ] BC-1: driver mysql → mysql2
- [ ] BC-3: guard whereIn vacío
- [ ] BC-4: Objection 3.x
- [ ] BC-6: await faltante en transacción

## Tests

- `npm test` — X passed / 0 failed
- `npm run migrate` — sin errores
- `GET /health` — `{ status: 'ok' }`

## Rollback

```bash
npm install knex@0.21.17
npm ci
```

## Checklist

- [ ] Sin inline comments
- [ ] Sin refactors cosméticos
- [ ] Cambio atado a breaking change de Knex 3
- [ ] Tests verdes
```

---

## Comandos de referencia rápida

```bash
grep -r "createTableIfNotExists" src/migrations/
grep -rn "\.whereIn(" src/ --include="*.js" | grep -v node_modules
grep -rn "\.raw(" src/ --include="*.js" | grep -v node_modules | grep -v stripe
grep -rn "\.transaction(" src/ --include="*.js" | grep -v node_modules | grep -v changelog
grep -rn "client.*mysql" src/ --include="*.js" | grep -v node_modules
grep -rn "DB_CLIENT" .env src/config/knexfile.js
grep -rn "withGraphFetched\|withGraphJoined\|eager(" src/ --include="*.js" | grep -v node_modules
npx knex --version
node -e "console.log(require('./node_modules/knex/package.json').version)"
```
