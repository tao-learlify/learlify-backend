# P2 Modernization Plan — learlify-backend

> **Role:** Principal Backend Engineer — Modernization + Resilience + Testing  
> **Date:** 2 March 2026  
> **Horizon:** 3 milestones × ~6 weeks each (Q2 2026)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Compatibility Matrix](#compatibility-matrix)
3. [Milestone Overview](#milestone-overview)
4. [M1 — Foundation (Weeks 1–6)](#m1--foundation-weeks-16)
5. [M2 — SDK Modernization (Weeks 7–12)](#m2--sdk-modernization-weeks-712)
6. [M3 — TypeScript + Full Observability (Weeks 13–18)](#m3--typescript--full-observability-weeks-1318)
7. [Cross-Cutting Concerns](#cross-cutting-concerns)

---

## Executive Summary

| Dimension | Before P2 | Target (end of M3) |
|-----------|-----------|-------------------|
| Test coverage (auth + payments) | ~0% | ≥ 60% |
| CI pipeline | None | Lint + test + coverage gate |
| Redis / distributed state | None | Lock + blocklist + cron coordination |
| Observability | Winston text → JSON (P1) | Prometheus metrics + Sentry |
| AWS SDK | v2 (deprecated) | v3 modular |
| Socket.io | v2 (EOL) | v4 + Redis adapter |
| Stripe SDK | v8 | Latest stable |
| TypeScript | None | Incremental `allowJs` |
| Cron safety | Double-execution risk | Redlock distributed lock |
| Token revocation | None | Redis blocklist |

---

## Compatibility Matrix

### aws-sdk v2 → @aws-sdk/client-s3 v3

| Area | v2 | v3 | Breaking? |
|------|----|----|-----------|
| Import | `new AWS.S3()` | `new S3Client({ region })` | Yes |
| Upload | `s3.upload(...).promise()` | `s3.send(new PutObjectCommand(...))` | Yes |
| multer-s3 | `multer-s3@2` (v2 SDK) | `multer-s3@3` (v3 SDK) | Yes — peer dep |
| Credential chain | Automatic | Automatic (same) | No |
| Error types | `err.code` | `err.name` | Yes — error handling |
| Stream handling | `Body` as Buffer/Stream | Same | No |

**Rollback:** keep `aws-sdk` in `dependencies`, feature-flag via `USE_AWS_V3=true`, delete flag after 2-week bake.

---

### socket.io v2 → v4

| Area | v2 | v4 | Breaking? |
|------|----|----|-----------|
| Client compatibility | socket.io-client v2/v3 | socket.io-client v4 only | Yes — clients must upgrade |
| Namespace default | `/` | `/` | No |
| `socket.rooms` | `Map<string, Room>` | `Set<string>` | Yes |
| `socket.request` | Available | Available | No |
| Handshake `auth` | `socket.handshake.auth` | Same | No |
| Redis adapter | `socket.io-redis` (v5) | `@socket.io/redis-adapter` | Yes — new package |
| Acknowledgements | Callbacks | Callbacks + Promises | No |

**Rollback:** Pin `socket.io` back to `^2.3.0`, revert `@socket.io/redis-adapter`.

---

### stripe v8 → v12+

| Area | v8 | v12+ | Breaking? |
|------|----|------|-----------|
| Import | `new Stripe(key)` | `new Stripe(key, { apiVersion })` | Soft |
| `paymentIntents.create` | Same | Same | No |
| `webhooks.constructEvent` | Same | Same | No |
| TypeScript types | `@types/stripe` | Built-in | Yes — remove `@types/stripe` |
| Error types | `Stripe.errors.StripeError` | `Stripe.errors.StripeError` | No |

**Rollback:** `npm install stripe@8.135.0`.

---

### jsonwebtoken v8 → v9

| Area | v8 | v9 | Breaking? |
|------|----|----|-----------|
| Sync verify error | Throws | Same | No |
| `algorithms` option | Optional | Recommended | Soft |
| `allowInvalidAsymmetricKeyTypes` | N/A | `false` by default | Potential |
| CVE coverage | CVE-2022-23529 | Patched | Critical |

**Rollback:** `npm install jsonwebtoken@8.5.1`.

---

### passport v0.4 → v0.7

| Area | v0.4 | v0.7 | Breaking? |
|------|------|------|-----------|
| `req.logIn` / `req.logOut` | Sync | Async (callback) | Yes |
| Session handling | Standard | `user` serializers | No |
| Error in strategy | `done(err)` | Same | No |
| `passport.initialize()` | Same | Same | No |
| `passport.authenticate` | Same | Same | No |

**Rollback:** `npm install passport@0.4.0`.

---

## Milestone Overview

```
M1 (Weeks 1-6):  FOUNDATION
  ├── Redis cluster: distributed cron lock + token blocklist
  ├── /health + /metrics (Prometheus) endpoints
  ├── CI pipeline: lint + tests + coverage gate (≥60% auth+payments)
  └── Initial test suite: auth flows + payment flows

M2 (Weeks 7-12): SDK MODERNIZATION
  ├── aws-sdk v2 → @aws-sdk/client-s3 v3
  ├── socket.io v2 → v4 + @socket.io/redis-adapter
  ├── stripe v8 → latest + API reconciliation
  ├── jsonwebtoken v8 → v9 + algorithm pinning
  ├── passport v0.4 → v0.7 + async logout
  └── Sentry error tracking

M3 (Weeks 13-18): TYPESCRIPT + FULL OBSERVABILITY
  ├── TypeScript: staged tsconfig (allowJs), lint rules
  ├── Annotate auth + payments modules (high-value first)
  ├── Prometheus dashboards + alert rules
  └── Coverage expansion to ≥80% on critical paths
```

---

## M1 — Foundation (Weeks 1–6)

### Goals

1. No cron double-execution under horizontal scaling.
2. Token revocation (logout + blocklist) with test proof.
3. `/health` checks DB + Redis connectivity.
4. `/metrics` exposes Prometheus HTTP metrics.
5. CI blocks merge on test failure or coverage < 60% on auth + payments.

### Dependencies Added

```json
{
  "ioredis": "^5.x",
  "redlock": "^5.x",
  "prom-client": "^15.x"
}
```

### Architecture Decisions

**Redis distributed cron lock (Redlock):**  
Each cron task acquires a Redis lock keyed on `cron:{TaskName}:{expression}` before executing. Lock TTL = 2× the expected execution time (default 30 s). If acquisition fails (another instance holds it), the callback is skipped silently. Lock is released after the callback completes or throws.

**Token blocklist:**  
On `POST /api/v1/auth/logout`, the bearer token is extracted, its SHA-256 hash stored in Redis as `blocklist:{hash}` with TTL = remaining seconds until the token's `exp`. The JWT guard (passport strategy) checks the blocklist on every authenticated request. Latency overhead: one Redis GET per request (< 0.5 ms on local network).

**Graceful degradation:**  
If `REDIS_URL` is not set, cron runs without lock (single-instance safe) and logout returns 200 but logs a warning. The health endpoint reports `redis: "unconfigured"` instead of failing.

### Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Redis unavailable in prod | Low | Medium | Graceful fallback; health degrades to `degraded` not `down` |
| Lock TTL too short (cron overruns) | Low | Medium | TTL = 30s; `extendLockMs` if task needs it |
| Token bloat in Redis | Very low | Low | TTL mirrors JWT expiry; no manual cleanup needed |
| CI false negatives (DB dep in tests) | Medium | Low | Tests mock DB and Redis; no live connection needed |

### Rollback Strategy

```bash
# Remove Redis features (env flag)
REDIS_URL=""  # cron runs without lock; logout skips blocklist

# Revert CI changes
git revert <ci-commit>

# Full rollback
git revert M1-commits  # single commit per item
```

### Success Metrics

| Metric | Baseline | M1 Target |
|--------|----------|-----------|
| Cron double-execution | Possible | Impossible (lock held) |
| Token revocation | None | < 100 ms blocklist check |
| `/health` response time | N/A | < 50 ms |
| Test coverage (auth) | 0% | ≥ 60% |
| Test coverage (payments) | 0% | ≥ 60% |
| CI pipeline | None | Blocking on failure |

### Deliverables (Implemented)

- [x] `src/config/redis.js` — ioredis singleton with reconnect + graceful skip
- [x] `src/common/cronLock.js` — `lockAndRun(key, ttlMs, fn)` utility
- [x] `src/decorators/index.js` — `CronSchedule` decorator wraps every scheduled callback with lock
- [x] `src/api/jwt/jwt.blocklist.js` — Redis-backed token blocklist
- [x] `src/api/jwt/jwt.guard.js` — Blocklist check on every authenticated request
- [x] `src/api/authentication/authentication.controller.js` — `logout()` endpoint
- [x] `src/api/authentication/authentication.routes.js` — `POST /logout`
- [x] `src/api/health/health.routes.js` — `/health` (DB + Redis probes)
- [x] `src/middlewares/metricsCollector.js` — Prometheus HTTP counter + histogram
- [x] `src/api/metrics/metrics.routes.js` — `/metrics` (prom-client registry)
- [x] `src/index.js` — Mount health + metrics endpoints
- [x] `jest.config.js` — Coverage thresholds (60% auth + payments)
- [x] `src/__test__/auth/auth.test.js` — 12 auth flow tests
- [x] `src/__test__/payments/packages.test.js` — 8 payment flow tests
- [x] `.github/workflows/ci.yml` — Lint + test + coverage gate

---

## M2 — SDK Modernization (Weeks 7–12)

### Goals

1. Eliminate all deprecated SDKs (aws-sdk v2, socket.io v2, stripe v8, jsonwebtoken v8, passport v0.4).
2. Horizontal Socket.io scaling via Redis adapter.
3. Structured error tracking via Sentry.

### Spike Branch Approach

For each SDK upgrade, create a dedicated branch:

```
spike/aws-sdk-v3       → 1-week spike: upload pipeline, multer-s3
spike/socketio-v4      → 1-week spike: v4 API diff + Redis adapter
spike/stripe-latest    → 3-day spike: API changelog review + webhook compat
spike/jwt-passport-v9  → 3-day spike: algorithm pinning + async logout
```

Spikes are merged to `modernization/m2` only after passing:
- All existing tests green
- Manual QA on staging with real uploads / auth / payments

### Schedule

| Week | Task |
|------|------|
| 7–8 | aws-sdk v3 + multer-s3 v3 |
| 8–9 | socket.io v4 + Redis adapter |
| 9–10 | stripe latest + type reconciliation |
| 10–11 | jsonwebtoken v9 + passport v0.7 |
| 11–12 | Sentry integration + M2 coverage expansion |

### Risks

| Risk | Mitigation |
|------|-----------|
| socket.io v4 requires client upgrade | Coordinate with frontend; v3 clients supported in v4 server with `allowEIO3: true` |
| multer-s3 v3 API changes | Feature flag `USE_MULTER_S3_V3` |
| passport v0.7 async logout | Audit all `req.logOut()` calls |

---

## M3 — TypeScript + Full Observability (Weeks 13–18)

### Goals

1. TypeScript compilation with `allowJs: true` — no big-bang rewrite.
2. Strong typing on critical paths (auth, payments, socket events).
3. Prometheus dashboards aligned with SLOs.
4. Coverage ≥ 80% on auth + payments; ≥ 60% project-wide.

### TypeScript Staged Rollout

```
Phase 1: tsconfig.json (allowJs, noEmit, strict: false) — IDE type checking only
Phase 2: Add .ts stubs for config, exceptions, jwt (high-value, low-risk)
Phase 3: Migrate auth + payments controllers to .ts (strict: true)
Phase 4: Set compilerOptions.checkJs: true for remaining .js files
```

**Hard rule:** No `.js` file is deleted until its `.ts` equivalent passes CI.

### Schedule

| Week | Task |
|------|------|
| 13 | tsconfig + eslint-typescript rules + CI update |
| 14–15 | Auth module → TypeScript |
| 15–16 | Payments module → TypeScript |
| 16–17 | Prometheus dashboards + SLO alerts |
| 17–18 | Coverage push + final audit |

---

## Cross-Cutting Concerns

### No Public API Breakage Policy

Any change to a public REST endpoint requires:
1. Old endpoint kept alive for 2 milestones minimum.
2. `Deprecation: true` header added to old response.
3. Migration guide added to `documentation/`.

### Coverage Gate Enforcement

```
# jest.config.js thresholds (enforced in CI)
auth module:     branches ≥ 60%, lines ≥ 60%
payments module: branches ≥ 60%, lines ≥ 60%
global:          lines ≥ 30% (M1) → 50% (M2) → 60% (M3)
```

### Environment Variables Added by M1

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `REDIS_URL` | No | `""` | Redis connection string; disables lock+blocklist if empty |
| `REDIS_LOCK_TTL_MS` | No | `30000` | Cron lock TTL in milliseconds |
| `METRICS_ENABLED` | No | `true` | Disable `/metrics` endpoint in restricted environments |
