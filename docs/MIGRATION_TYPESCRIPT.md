# Guía de Migración a TypeScript

**Proyecto:** serverv2  
**Fecha:** 2026-03-03  
**Estrategia:** Incremental — convivencia JS/TS mediante Babel + tsconfig `allowJs`

---

## Tabla de contenidos

1. [Prerrequisitos](#prerrequisitos)
2. [Estrategia de build](#estrategia-de-build)
3. [Setup paso a paso](#setup-paso-a-paso)
4. [Convenciones de migración de archivos](#convenciones-de-migración-de-archivos)
5. [Tipos base del dominio](#tipos-base-del-dominio)
6. [Casos especiales](#casos-especiales)
7. [Checklist de migración por módulo](#checklist-de-migración-por-módulo)
8. [Anti-patrones a evitar](#anti-patrones-a-evitar)

---

## Prerrequisitos

El proyecto usa **Babel** como transpilador principal (`@babel/cli`, `@babel/core`, `@babel/preset-env`). La estrategia es: añadir soporte TypeScript a Babel, **no** reemplazar Babel por tsc.

Por qué no `tsc` como transpilador principal:
- 93 migraciones Knex son CommonJS puro — muy costoso de migrar
- `@babel/plugin-proposal-decorators` ya está configurado y es estable
- Build time ms vs segundos con tsc en repos grandes
- Babel no hace type-checking (ventaja: no bloquea build); tsc hace type-checking separado

---

## Estrategia de build

```
Babel transpila (JS + TS) → dist/
tsc ---noEmit             → solo type-checking en CI
```

```
src/**/*.js  ──┐
src/**/*.ts  ──┤── @babel/preset-typescript ──► dist/
               │── @babel/preset-env
```

El flag `--noEmit` de tsc se corre en CI como validación, sin emitir archivos.

### Scripts `package.json` a añadir

```json
{
  "scripts": {
    "build": "babel src -D --out-dir dist --extensions '.js,.ts'",
    "type-check": "tsc --noEmit",
    "type-check:watch": "tsc --noEmit --watch"
  }
}
```

El script `build` existente sólo necesita `--extensions '.js,.ts'`.

---

## Setup paso a paso

### Paso 1 — Instalar dependencias

```bash
npm install --save-dev \
  typescript \
  @types/node \
  @types/express \
  @types/passport \
  @types/passport-jwt \
  @types/bcrypt \
  @types/jsonwebtoken \
  @types/morgan \
  @types/compression \
  @types/cors \
  @types/i18n \
  @babel/preset-typescript
```

### Paso 2 — Añadir `@babel/preset-typescript` a Babel

Editar `babel.config.js` (o `.babelrc`):

```javascript
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript'
  ],
  plugins: [
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-private-methods',
    ['babel-plugin-module-resolver', {
      root: ['./src'],
      alias: {
        api: './src/api',
        config: './src/config',
        utils: './src/utils',
        middlewares: './src/middlewares',
        metadata: './src/metadata',
        common: './src/common',
        gateways: './src/gateways',
        decorators: './src/decorators/index.js',
        exceptions: './src/exceptions/index.js',
        lib: './src/lib'
      }
    }]
  ]
}
```

### Paso 3 — Crear `tsconfig.json`

Ver configuración en [MIGRATION_PLAN_P0_P1_P2.md — P0-3](./MIGRATION_PLAN_P0_P1_P2.md#p0-3-tsconfigjson).

### Paso 4 — Crear tipos base de Express

Crear `src/@types/express.d.ts`:

```typescript
interface AuthUser {
  id: number
  email: string
  roleId: number
  role: string
  isVerified: boolean
  firstName: string
  lastName: string
  imageUrl?: string
  model?: { id: number; name: string }
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
      requestId?: string
      locale?: string
    }
  }
}

export {}
```

### Paso 5 — Schema de env con Zod

```bash
npm install zod
```

Crear `src/config/env.ts`. Ver contenido en [MIGRATION_PLAN_P0_P1_P2.md — P0-5](./MIGRATION_PLAN_P0_P1_P2.md#p0-5-schema-de-env-zod).

### Paso 6 — Verificar en CI

Añadir step a `.github/workflows/ci.yml`:

```yaml
- name: Type check
  run: npm run type-check
```

---

## Convenciones de migración de archivos

### Orden recomendado de renombrado

Renombrar `.js` → `.ts` de afuera hacia adentro (leaf nodes primero):

```
1. src/@types/         (`.d.ts` nuevos — semana 1)
2. src/config/env.ts   (nuevo — semana 1)
3. src/lib/prisma.ts   (nuevo — P1)
4. src/api/*/          (por flow, ver P1)
5. src/index.js        (último — mayor impacto)
```

**Nunca** renombrar en lote masivo. Un archivo por PR o pequeños grupos del mismo módulo.

### Regla de migración por archivo

Cuando se renombra `foo.service.js` → `foo.service.ts`:

1. Renombrar el archivo
2. Añadir tipos explícitos a parámetros de funciones públicas
3. Añadir tipo de retorno a funciones públicas
4. Añadir `interface` o `type` para los DTOs del módulo
5. Si hay `any` inevitable, usar `// eslint-disable-next-line @typescript-eslint/no-explicit-any` (no inline comment en lógica de negocio, sólo en declaraciones de tipo de transición)
6. Ejecutar `npm run type-check` — debe pasar sin errores nuevos

### Convenciones de nomenclatura de tipos

| Tipo | Ubicación | Ejemplo |
|---|---|---|
| DTOs de request | `src/api/[módulo]/[módulo].dto.ts` | `CreateUserDto` |
| Types de dominio | `src/api/[módulo]/[módulo].types.ts` | `UserRecord` |
| Tipos globales Express | `src/@types/express.d.ts` | — |
| Env types | `src/config/env.ts` | `Env` |
| Tipos Prisma | Auto-generados por `prisma generate` | `User`, `Package` |

---

## Tipos base del dominio

Estos tipos se crearán progresivamente conforme se migran los flows. Se listan aquí como referencia.

### Users

```typescript
// src/api/users/users.types.ts

export interface UserRecord {
  id: number
  email: string
  firstName: string
  lastName: string
  imageUrl?: string
  isVerified: boolean
  roleId: number
  modelId?: number
  lastLogin?: string
  createdAt?: string
  updatedAt?: string
}

export interface UserWithRelations extends UserRecord {
  role?: { id: number; name: string }
  model?: { id: number; name: string }
}

export interface CreateUserDto {
  email: string
  password: string
  firstName: string
  lastName: string
  roleId: number
  isVerified?: boolean
  lang?: string
  lastLogin?: string
}

export interface UpdateUserDto {
  id: number
  firstName?: string
  lastName?: string
  imageUrl?: string
  isVerified?: boolean
  lastLogin?: string
  googleId?: string
  lang?: string
  password?: string
}

export interface GetUsersQuery {
  roleId?: number
  page?: number
  limit?: number
}
```

### Auth

```typescript
// src/api/authentication/authentication.types.ts

export interface SignInDto {
  email: string
  password: string
}

export interface SignUpDto {
  email: string
  password: string
  firstName: string
  lastName: string
}

export interface TokenPayload {
  id: number
  email: string
  role: string
  isVerified: boolean
  iat?: number
  exp?: number
}

export interface AuthResponse {
  message: string
  response: {
    token: string
  }
  statusCode: number
}
```

### Packages

```typescript
// src/api/packages/packages.types.ts

export interface PackageRecord {
  id: number
  userId: number
  planId: number
  stripeSubscriptionId?: string
  status: 'active' | 'cancelled' | 'past_due'
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface AssignPackageDto {
  userId: number
  planId: number
}
```

---

## Casos especiales

### 1. Decoradores `@Bind`, `@Router`, `@Controller`

Los decoradores en `src/decorators/index.js` usan la API legacy (`experimentalDecorators`). Al migrar a `.ts`:

```typescript
// Asegurarse de que tsconfig.json tiene:
// "experimentalDecorators": true
// "emitDecoratorMetadata": true
```

Babel ya transpila los decoradores — TypeScript sólo necesita saber que existen. No cambiar la implementación de los decoradores en P0/P1.

### 2. `req.user` con passport-jwt

Antes de TypeScript, `req.user` es `any`. Con el tipo aumentado de Express:

```typescript
// src/@types/express.d.ts define AuthUser
// En el código:
const userId = req.user?.id
```

Si passport pasa un objeto diferente al esperado, el type-check fallará en CI antes que en producción.

### 3. Mixtura JS/TS y module resolution

`allowJs: true` permite importar `.js` desde `.ts`. El resolver de Babel (via `babel-plugin-module-resolver`) ya tiene los alias. TypeScript necesita los mismos alias en `paths` de `tsconfig.json` (ya incluidos en la configuración de P0-3).

Cuando TypeScript no encuentra tipos para un módulo JS, crear un tipo mínimo temporal:

```typescript
// src/@types/[module-name].d.ts
declare module 'nombre-del-modulo' {
  const value: any
  export default value
}
```

### 4. `moment` → `date-fns`

`moment` está ya en `package.json`. No migrar a `date-fns` en P0 (es un cambio cosmético). Documentar en backlog post-P2. `date-fns` ya está instalado y tiene tipos nativos.

### 5. Archivos de migración Knex

Los 93 archivos `src/migrations/*.js` **no se migran a TypeScript**. Son ejecutados directamente por el CLI de Knex (CommonJS). Excluidos en `tsconfig.json`:

```json
"exclude": ["src/migrations", "src/seeds"]
```

### 6. `exchange-rates-api`

No tiene tipos `@types/`. Crear un tipo mínimo:

```typescript
// src/@types/exchange-rates-api.d.ts
declare module 'exchange-rates-api' {
  export function convert(amount: number, from: string, to: string): Promise<number>
}
```

---

## Checklist de migración por módulo

Para cada módulo al ser migrado a `.ts`:

```
PRE-MIGRACIÓN
□ Leer el archivo actual y entender su contrato público
□ Asegurarse de que hay tests del módulo con cobertura ≥ 60%
□ Crear rama feature/p1-[nombre]-typescript

MIGRACIÓN
□ Renombrar [módulo].service.js → [módulo].service.ts
□ Añadir tipos explícitos a todos los parámetros públicos
□ Añadir tipo de retorno a todas las funciones públicas
□ Crear [módulo].types.ts con interfaces de DTO si no existe
□ Eliminar JSDoc de tipos (reemplazado por tipos TS nativos)
□ Mantener JSDoc de descripción y @param si aportan contexto extra

POST-MIGRACIÓN
□ npm run type-check — 0 errores nuevos
□ npm test — 0 tests rotos
□ npm run build — 0 errores de compilación Babel
□ Revisar que no se añadió ningún `any` innecesario
```

---

## Anti-patrones a evitar

| Anti-patrón | Justificación |
|---|---|
| `as any` masivo para "hacer pasar" el type-check | Anula el valor de TypeScript. Usar tipos explícitos o `unknown` + narrowing |
| Migrar todo el repo en un solo PR | Imposible de revisar. PRs pequeños por módulo |
| Usar `!` (non-null assertion) sin verificar | Riesgo de runtime null errors. Usar `?.` o guards explícitos |
| Mezclar `import type` y `import` en el mismo renglón | Mantener separados para claridad |
| `declare module '...'` con `any` indefinidamente | Los stubs de tipos son temporales — añadir tipos reales en P2 |
| `// @ts-ignore` sin issue de seguimiento | Si es necesario, documentar con `// TODO: types — issue #123` |
| Añadir `enum` de TypeScript donde no hay ventaja | Prefiere union types `'active' | 'cancelled'` — más fácil de usar con Prisma |
