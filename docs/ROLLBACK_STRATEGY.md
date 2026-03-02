# Rollback Strategy — Migración TypeScript + Prisma

**Proyecto:** serverv2  
**Fecha:** 2026-03-03  
**Principio:** Todo PR de migración debe ser reversible en ≤ 15 minutos sin pérdida de datos.

---

## Tabla de contenidos

1. [Principios generales](#principios-generales)
2. [Rollback P0 — Foundations](#rollback-p0--foundations)
3. [Rollback P1 — Incremental Migration](#rollback-p1--incremental-migration)
4. [Rollback P2 — Completion & Cleanup](#rollback-p2--completion--cleanup)
5. [Rollback de emergencia (producción down)](#rollback-de-emergencia-producción-down)
6. [Tags de release](#tags-de-release)
7. [Checklist pre-deploy](#checklist-pre-deploy)

---

## Principios generales

| Regla | Descripción |
|---|---|
| **Schema DB nunca rompe contrato** | P0 y P1 no añaden columnas NOT NULL sin default. P2 sólo añade NOT NULL en columnas ya pobladas. |
| **Feature flags como kill switch** | Cada flow migrado a Prisma tiene `USE_PRISMA_[FLOW]` — desactivar = rollback inmediato sin redeploy de código |
| **Backup antes de P2** | `mysqldump` completo antes de eliminar Knex/Objection |
| **Tag antes de cada fase** | `git tag p0-stable`, `p1-f1-stable`, etc. — permite `git checkout` rápido |
| **Migrations solo hacia adelante** | Las migrations de Prisma no tienen `down()`. Si hay que revertir schema: nueva migration que deshace el cambio |

---

## Rollback P0 — Foundations

P0 sólo añade herramientas (TypeScript, tsconfig, tipos, Zod) y no modifica lógica de negocio ni schema de DB. El rollback es trivial.

### Rollback de TypeScript toolchain (P0-1, P0-2, P0-3)

```bash
# Revertir cambios en package.json y babel.config.js
git revert <commit-hash-p0-ts>

# Reinstalar dependencias sin los paquetes TS
npm install

# Verificar que build funciona igual que antes
npm run build
npm test
```

### Rollback del schema de env (P0-5)

Si Zod lanza error en producción por una variable ausente:

```bash
# Opción 1 — Añadir la variable faltante al .env / docker-compose
echo "VARIABLE_FALTANTE=valor" >> .env
docker compose restart api

# Opción 2 — Revertir el módulo de validación de env
git revert <commit-hash-p0-env>
docker compose restart api
```

### Rollback de smoke tests (P0-6)

Los smoke tests no van a producción — son cambios en `src/__test__/`. Rollback no aplica en prod.

---

## Rollback P1 — Incremental Migration

P1 usa el patrón dual-path con feature flags. El rollback de un flow es **cambiar una variable de entorno**, sin redeploy de código.

### Rollback inmediato (kill switch vía env)

Para revertir un flow a Knex sin redeploy:

```bash
# En .env o docker-compose.yml:
# Cambiar USE_PRISMA_USERS=true → USE_PRISMA_USERS=false

# En Docker Compose:
docker compose up -d --no-deps api

# En PM2:
pm2 restart ecosystem.config.js
```

**Tiempo de rollback:** < 2 minutos (restart de contenedor).

### Tabla de feature flags por flow

| Flow | Variable de entorno | Valor por defecto |
|---|---|---|
| Auth | `USE_PRISMA_AUTH` | `false` |
| Users | `USE_PRISMA_USERS` | `false` |
| Courses | `USE_PRISMA_COURSES` | `false` |
| Packages | `USE_PRISMA_PACKAGES` | `false` |
| Evaluations | `USE_PRISMA_EVALUATIONS` | `false` |
| Progress | `USE_PRISMA_PROGRESS` | `false` |
| Schedule | `USE_PRISMA_SCHEDULE` | `false` |
| Classes | `USE_PRISMA_CLASSES` | `false` |
| Gifts | `USE_PRISMA_GIFTS` | `false` |

### Rollback de código (si el bug está en el repositorio Prisma)

```bash
# 1. Desactivar el flow vía env (kill switch inmediato)
# USE_PRISMA_[FLOW]=false

# 2. Hacer revert del commit del repositorio Prisma
git revert <commit-hash-p1-flow>

# 3. Push y redeploy
git push origin main
docker compose up -d --build api
```

### Rollback de transacciones P1

Los flows con transacciones (Evaluations, Progress, Schedule, Classes, Gifts) deben tener:

1. Kill switch activado ANTES de merge a producción
2. Observabilidad en logs: cada transacción loguea inicio y fin
3. Si se detecta inconsistencia de datos: restaurar desde backup previo a la activación del flag

```bash
# Verificar logs de transacciones en las últimas 2h
docker logs serverv2_api_1 --since=2h | grep "prisma:query" | grep "BEGIN\|COMMIT\|ROLLBACK" | tail -50
```

---

## Rollback P2 — Completion & Cleanup

P2 elimina Knex/Objection. El rollback es el más costoso — requiere restaurar dependencias y código.

### Pre-requisito OBLIGATORIO antes de P2

```bash
# 1. Backup completo de DB
mysqldump \
  -h $DB_HOST \
  -u $DB_USER \
  -p$DB_PASSWORD \
  $DB_NAME \
  > backup_pre_p2_$(date +%Y%m%d_%H%M).sql

# 2. Tag de release estable
git tag p1-stable-final
git push origin p1-stable-final

# 3. Verificar que todos los flows están en Prisma y estables
# Mínimo 7 días de observación en producción con todos los flags activos
```

### Rollback P2 — código

```bash
# 1. Checkout del tag estable pre-P2
git checkout p1-stable-final

# 2. Restaurar rama
git checkout -b rollback/p2-emergency
git push origin rollback/p2-emergency

# 3. Reinstalar dependencias con Knex (las versiones están en el tag)
npm install

# 4. Build y redeploy
npm run build
docker compose up -d --build api
```

### Rollback P2 — datos

Si P2 incluyó migrations destructivas (DROP COLUMN, DROP TABLE):

```bash
# Restaurar desde backup pre-P2
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < backup_pre_p2_YYYYMMDD_HHMM.sql

# Verificar integridad
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SELECT COUNT(*) FROM users;"
```

**Restricción:** Las migrations de Prisma en P2 sólo deben hacer operaciones **aditivas o de renombre no-destructivo** hasta que se confirme estabilidad. Las operaciones de DROP deben ser un último PR independiente con ventana de observación de 30 días.

---

## Rollback de emergencia (producción down)

Para cuando el servicio no responde y no hay tiempo para diagnosticar:

### Runbook de emergencia

```bash
# PASO 1 — Identificar qué falló (30 segundos)
docker logs serverv2_api_1 --tail=50 | grep -E "ERROR|FATAL|Cannot"

# PASO 2 — Desactivar TODOS los flags Prisma (< 1 minuto)
# Editar docker-compose.yml o .env:
# USE_PRISMA_AUTH=false
# USE_PRISMA_USERS=false
# USE_PRISMA_COURSES=false
# ... (todos en false)
docker compose up -d --no-deps api

# PASO 3 — Verificar health
sleep 10
curl -f http://localhost:3100/health || echo "STILL DOWN"

# PASO 4 — Si sigue caído, revertir al último tag estable
git stash
git checkout <último-tag-estable>
npm run build
docker compose up -d --build api

# PASO 5 — Verificar health de nuevo
sleep 15
curl -f http://localhost:3100/health && echo "RESTORED"

# PASO 6 — Notificar al equipo y documentar el incident
```

### Contacto de escalación

Documentar en `docs/ONCALL.md` (no incluido aquí — sensible).

---

## Tags de release

Crear tags antes de cada fase importante:

```bash
# Antes de P0
git tag pre-migration-baseline
git push origin pre-migration-baseline

# P0 completado y estable
git tag p0-stable
git push origin p0-stable

# Cada flow P1 estable en producción
git tag p1-auth-stable
git tag p1-users-stable
git tag p1-courses-stable
git tag p1-packages-stable
git tag p1-evaluations-stable

# Todos los flows P1 estables
git tag p1-stable-final
git push origin p1-stable-final

# P2 código migrado (antes de eliminar Knex)
git tag p2-pre-cleanup
git push origin p2-pre-cleanup

# P2 completado
git tag p2-stable
git push origin p2-stable
```

Listar tags:

```bash
git tag -l "p*" --sort=version:refname
```

---

## Checklist pre-deploy

Ejecutar antes de cada PR de migración a producción:

```
CÓDIGO
□ PR ha pasado todos los tests en CI
□ Type-check pasa sin errores (npm run type-check)
□ Build exitoso (npm run build)
□ Sin dependencias desactualizadas críticas (npm audit)

TESTS
□ No hay tests regresionados respecto a la rama base
□ Cobertura ≥ 60% en módulos tocados
□ Smoke tests pasan en staging

OBSERVABILIDAD
□ Logs de la feature en staging verificados (sin errores)
□ Query logging activo y sin secretos en logs

DB
□ Backup reciente (< 24h) disponible
□ Para P2: backup tomado < 1h antes del deploy

ROLLBACK
□ Feature flag identificado y documentado (P1)
□ Tag de release creado en main antes del merge
□ Runbook de rollback revisado por el equipo
□ Tiempo estimado de rollback: ≤ 15 minutos

POST-DEPLOY
□ Monitorizar logs durante 30 minutos post-release
□ Verificar health endpoint: curl /health
□ Verificar métricas: curl /metrics | grep http_requests
□ Si hay anomalías → ejecutar kill switch inmediatamente
```
