# Room Booking Platform — Architecture & System Design

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Infrastructure & Deployment](#2-infrastructure--deployment)
3. [Network Topology](#3-network-topology)
4. [API Design](#4-api-design)
5. [Authentication & Security](#5-authentication--security)
6. [Database Design](#6-database-design)
7. [Concurrency & Double-Booking Prevention](#7-concurrency--double-booking-prevention)
8. [Holds System (UX Layer)](#8-holds-system-ux-layer)
9. [Idempotency](#9-idempotency)
10. [Caching Strategy](#10-caching-strategy)
11. [Rate Limiting & Abuse Prevention](#11-rate-limiting--abuse-prevention)
12. [Observability](#12-observability)
13. [Frontend Architecture](#13-frontend-architecture)
14. [Testing Strategy](#14-testing-strategy)
15. [GDPR & Data Privacy](#15-gdpr--data-privacy)
16. [Intentional Omissions & Future Work](#16-intentional-omissions--future-work)

---

## 1. System Overview

RoomBook is a conference room booking platform built for teams. Users search available rooms by time range, capacity, and amenities; place a 5-minute soft hold; then confirm a booking. The system prevents double-bookings at the database level regardless of concurrent requests or instance count.

**Core requirements:**
- Rooms must never be double-booked — enforced at the DB layer
- Holds expire automatically — no manual cleanup needed for correctness
- Any single API instance failure must not take the system down
- Redis failure must not prevent bookings

---

## 2. Infrastructure & Deployment

### Services (Docker Compose)

| Service | Image | Internal Port | External Port | Role |
|---|---|---|---|---|
| `postgres` | postgres:16-alpine | 5432 | 5432 | Primary database |
| `redis` | redis:7-alpine | 6379 | 6379 | Cache + holds |
| `api1` / `api2` / `api3` | custom (NestJS) | 3000 | — | API replicas |
| `api-lb` | nginx:1.27-alpine | 80 | **3001** | API load balancer |
| `web` | custom (Nginx + React) | 80 | **8080** | Static UI + API proxy |
| `prometheus` | prom/prometheus:v2.53.0 | 9090 | 9090 | Metrics scraper |
| `loki` | grafana/loki:3.1.0 | 3100 | — | Log aggregation |
| `promtail` | grafana/promtail:3.1.0 | — | — | Log collector |
| `grafana` | grafana/grafana:11.1.0 | 3000 | **3100** | Dashboards |
| `datadog-agent` | gcr.io/datadoghq/agent:7 | — | — | Optional: APM + logs |

The Datadog agent only starts when `--profile datadog` is passed; Prometheus/Loki/Grafana run by default.

### Dependency startup order

```
postgres (healthy) ──┐
                     ├─► api1/api2/api3 (healthy) ──► api-lb ──► web
redis (started)  ────┘
```

API instances wait for a healthy Postgres before starting. The load balancer waits for all three API instances to pass their health checks before accepting external traffic.

---

## 3. Network Topology

```
Browser
  │
  │ :8080
  ▼
┌─────────────────────────────────────────┐
│  web (Nginx)                            │
│  - serves /usr/share/nginx/html (SPA)   │
│  - try_files → index.html (client-side  │
│    routing)                             │
│  - /api/* → proxy to api-lb             │
│  - /api/metrics → 403 (blocked)         │
└────────────────┬────────────────────────┘
                 │ /api/* (strips prefix)
                 ▼
┌─────────────────────────────────────────┐
│  api-lb (Nginx, least_conn)             │
│  - /metrics → 403 (blocked externally) │
│  - /* → round-robin to api1/api2/api3  │
│  - proxy timeouts: connect 5s,          │
│    read/send 30s                        │
└──────┬─────────┬───────────┬────────────┘
       │         │           │
   api1:3000  api2:3000  api3:3000
       │         │           │
       └────┬────┘           │
            │                │
     ┌──────▼──────┐  ┌──────▼──────┐
     │  postgres   │  │    redis    │
     │  :5432      │  │    :6379    │
     └─────────────┘  └─────────────┘

Prometheus scrapes api1:3000/metrics, api2:3000/metrics, api3:3000/metrics directly
(not through the load balancer, to get per-instance data)
```

**Key security decisions:**
- `/metrics` is blocked at both Nginx layers — Prometheus scrapes the API instances directly on their internal Docker network
- API instances are not exposed on any external port; all traffic goes through the load balancer

---

## 4. API Design

### Modules

| Module | Responsibility |
|---|---|
| `AuthModule` | Register, login, refresh, logout, Google OAuth |
| `UsersModule` | User entity CRUD, findByEmail, findOrCreateGoogleUser |
| `RoomsModule` | List, detail, search (with caching) |
| `BookingsModule` | Create (idempotent), list, get, cancel |
| `HoldsModule` | Create/get/consume holds via Redis |
| `MetricsModule` | Prometheus metrics export |

### Endpoints

```
GET  /health                         — Liveness probe (no auth)
GET  /metrics                        — Prometheus scrape endpoint (no auth, blocked externally)

POST /auth/register                  — { email, password, name? } → { userId, accessToken }
POST /auth/login                     — { email, password } → { userId, accessToken }
POST /auth/refresh                   — (refreshToken cookie) → { accessToken }
POST /auth/logout                    — (refreshToken cookie) → 204
GET  /auth/google                    — Redirect to Google OAuth
GET  /auth/google/callback           — OAuth callback → redirect to frontend

GET  /rooms                          — List all rooms (cached 5 min)
GET  /rooms/search?start&end&...     — Paginated availability search (cached 30s)
GET  /rooms/:id?start&end            — Room detail + availability status (cached 60s)

POST /holds                          — Create hold (JWT required)
GET  /holds/:id                      — Get hold data (JWT required, owner-only)

POST /bookings                       — Create booking, optionally from hold (JWT, idempotent)
GET  /bookings/me                    — User's bookings (JWT required)
GET  /bookings/:id                   — Get booking (JWT required, owner-only)
DELETE /bookings/:id                 — Cancel booking (JWT required, owner-only)
```

### Error response shape

All errors follow:
```json
{
  "statusCode": 409,
  "message": "Room already booked for this time range",
  "error": { "code": "BOOKING_CONFLICT", "message": "Room already booked for this time range" }
}
```

Machine-readable `code` allows the frontend to show localised messages without string matching.

---

## 5. Authentication & Security

### Token architecture

Two-token model chosen to balance security with UX:

| Token | Storage | TTL | Rotation |
|---|---|---|---|
| Access token (JWT) | In-memory only (React state) | 15 min | Issued fresh on every refresh |
| Refresh token (opaque 256-bit random) | HttpOnly cookie | 14 days | Rotated on every use |

**Why not localStorage for tokens?**
- Access token in memory: lost on page reload by design — the refresh cookie rehydrates it
- Refresh token in HttpOnly cookie: XSS cannot access it; only the browser sends it automatically

**Refresh token security:**
- Stored as `SHA-256(raw_token)` in the database — a DB compromise does not expose usable tokens
- Single-use: every `/auth/refresh` call revokes the old token and issues a new one (token rotation)
- Revocation is immediate (DB flag `revoked = true`)

### Session rehydration flow

```
App mount
  │
  └─► POST /auth/refresh (browser sends cookie automatically)
        ├─► success: new accessToken stored in memory, user authenticated
        └─► 401: user is logged out, show login page
```

The app shows a loading state during rehydration to prevent flash of unauthenticated content.

### Google OAuth

Google OAuth users have `passwordHash = null`. Attempting email/password login with a Google-only account returns error code `GOOGLE_ACCOUNT_ONLY`, guiding them to the correct flow.

### Password security
- bcrypt with cost factor 10
- Minimum 8 characters enforced client-side (strength indicator) and server-side via DTO validation

### Email enumeration prevention
Login returns `INVALID_CREDENTIALS` for both unknown email and wrong password — identical error, identical timing path through bcrypt (always runs `bcrypt.compare` even for unknown emails to prevent timing attacks).

### Security headers
- `helmet` middleware: CSP, HSTS, X-Frame-Options, etc.
- CORS: origin locked to `CORS_ORIGIN` env var
- SQL injection: TypeORM parameterised queries throughout
- Statement timeout: PostgreSQL `statement_timeout=10000ms` prevents runaway queries

---

## 6. Database Design

**PostgreSQL 16**, managed via TypeORM with `synchronize: true` (schema auto-migrations at startup).

### Schema

#### `users`
```sql
id           UUID PRIMARY KEY
email        TEXT UNIQUE NOT NULL
password_hash TEXT NULL                     -- NULL for Google OAuth users
name         TEXT NULL
google_id    TEXT NULL                      -- partial unique index (WHERE google_id IS NOT NULL)
created_at   TIMESTAMPTZ DEFAULT NOW()
```

#### `rooms`
```sql
id           UUID PRIMARY KEY
name         TEXT NOT NULL
capacity     INT NOT NULL                   -- indexed
features     TEXT[] NOT NULL DEFAULT '{}'   -- e.g. ['projector', 'whiteboard']
description  TEXT NULL
images       TEXT[] NOT NULL DEFAULT '{}'
timezone     TEXT NULL                      -- IANA timezone: 'America/New_York', 'Europe/Paris', etc.
created_at   TIMESTAMPTZ DEFAULT NOW()
```

#### `bookings`
```sql
id           UUID PRIMARY KEY
room_id      UUID NOT NULL REFERENCES rooms(id)
user_id      UUID NOT NULL REFERENCES users(id)
start_time   TIMESTAMPTZ NOT NULL
end_time     TIMESTAMPTZ NOT NULL
status       TEXT NOT NULL DEFAULT 'CONFIRMED'  -- CHECK IN ('CONFIRMED', 'CANCELLED')
notes        TEXT NULL
created_at   TIMESTAMPTZ DEFAULT NOW()

INDEX (room_id, start_time, end_time)   -- fast overlap candidate queries
INDEX (user_id, created_at)             -- fast "my bookings" queries

CONSTRAINT bookings_no_overlap          -- see section 7
CONSTRAINT bookings_valid_status CHECK (status IN ('CONFIRMED', 'CANCELLED'))
```

#### `refresh_tokens`
```sql
id           UUID PRIMARY KEY
user_id      UUID NOT NULL REFERENCES users(id)
token_hash   TEXT UNIQUE NOT NULL           -- SHA-256 of the raw token
expires_at   TIMESTAMPTZ NOT NULL
revoked      BOOLEAN NOT NULL DEFAULT false
created_at   TIMESTAMPTZ DEFAULT NOW()

INDEX (user_id, expires_at)              -- fast token lookup + cleanup
```

#### `idempotency_keys`
```sql
id               UUID PRIMARY KEY
idempotency_key  TEXT NOT NULL
user_id          UUID NOT NULL
response_code    INT NULL                   -- NULL = in-flight
response_body    JSONB NULL                 -- serialised response
expires_at       TIMESTAMPTZ NULL           -- 24h TTL
created_at       TIMESTAMPTZ DEFAULT NOW()

UNIQUE (idempotency_key, user_id)
```

### Connection pool
- Max 20 connections per API instance (3 instances × 20 = 60 total, well under PostgreSQL's default 100)
- Idle timeout: 30s
- Connection timeout: 5s
- Retry: up to 10 attempts with 3s delay (configurable via env for tests)

### Seed data
500 rooms seeded on first startup. A `pg_advisory_lock` ensures exactly one of the three API instances runs the seed, preventing duplicate inserts. The seed is idempotent — it counts existing rooms and only inserts missing ones.

---

## 7. Concurrency & Double-Booking Prevention

### The core invariant
**No two `CONFIRMED` bookings for the same room may overlap in time.**

This is enforced at the database level with a PostgreSQL exclusion constraint:

```sql
ALTER TABLE bookings
ADD CONSTRAINT bookings_no_overlap
EXCLUDE USING GIST (
  room_id WITH =,
  tstzrange(start_time, end_time, '[)') WITH &&
)
WHERE (status = 'CONFIRMED');
```

The `btree_gist` extension enables mixing UUID equality (`=`) with range overlap (`&&`) in a single GIST index. The partial constraint (`WHERE status = 'CONFIRMED'`) ignores cancelled bookings, allowing re-booking of cancelled slots.

### Why this approach is bulletproof

| Attack vector | Handled by |
|---|---|
| Two requests arrive simultaneously on the same instance | PostgreSQL serialises them; only one wins the GIST lock |
| Two requests arrive on different API instances | Same DB — one transaction commits, the other gets `23P01` |
| Application bug bypasses service-layer check | Constraint fires regardless of application code |
| Direct SQL insert | Constraint still fires |
| Idempotency retry storm | Key deduplication + constraint catch both paths |

### Booking flow

```
POST /bookings
  │
  ├─1── If holdId: resolve hold → roomId, start, end
  ├─2── Validate: roomId, start < end required
  ├─3── Fast idempotency check (read-only, outside TX)
  │       └─ if key exists with responseCode != NULL: replay immediately
  │       └─ if key exists with responseCode == NULL: 503 IN_PROGRESS
  ├─4── Verify room exists (pre-flight, avoids starting TX for bad roomId)
  │
  └─5── BEGIN TRANSACTION
          ├─5a── INSERT idempotency_keys ... ON CONFLICT DO NOTHING RETURNING id
          │        └─ 0 rows returned: concurrent duplicate → replay or IN_PROGRESS
          ├─5b── INSERT bookings (status='CONFIRMED')
          │        └─ 23P01 violation → TX rolls back → catch → record conflict → 409
          └─5c── UPDATE idempotency_keys SET response_code=201, response_body=...
        COMMIT
          │
          └─6── Fire-and-forget side effects (all errors swallowed):
                  ├─ consumeHold (delete Redis keys)
                  └─ invalidateRoomsCache (delete rooms:list, rooms:detail:*)
```

The booking and idempotency record are written in **the same transaction**. If the server crashes between commit and response, the client retries with the same key and gets the stored `201` response — no double booking.

---

## 8. Holds System (UX Layer)

Holds are a **UX convenience only**. They do not prevent double-bookings — the DB constraint is authoritative.

**Purpose:** Show a "5-minute countdown" in the checkout UI so the user feels urgency and other users see the slot as "taken" during checkout.

### How holds work

```
POST /holds { roomId, start, end }
  │
  ├─ Check Redis: hold:slot:{roomId}:{start}:{end} exists? → 409 ALREADY_HELD
  ├─ Check DB: any CONFIRMED bookings overlap? → 409 ROOM_BOOKED
  └─ Write to Redis:
       • hold:{holdId}  → { holdId, roomId, userId, start, end, expiresAt }, TTL=5min
       • hold:slot:{roomId}:{start}:{end}  → holdId, TTL=5min
```

### Redis failure behaviour

If Redis is down, `POST /holds` returns `503 HOLDS_UNAVAILABLE`. The frontend must handle this gracefully — typically by skipping the hold step and going directly to booking. The booking itself will still succeed or fail based on the DB constraint.

`consumeHold` (called after a successful booking) silently swallows Redis errors — the hold will simply expire after its TTL. This is safe because the booking is already committed.

### Hold keys
- `hold:{uuid}` — the hold data, owner-validated on read
- `hold:slot:{roomId}:{start}:{end}` — slot lock, prevents two users holding the same slot

---

## 9. Idempotency

Bookings support an optional `Idempotency-Key` header (UUID recommended, any string accepted).

### Why idempotency matters
Networks are unreliable. Without idempotency:
- Client sends POST, network drops response → client retries → double booking

With idempotency:
- Client retries with same key → DB replay returns original 201/409 response

### Lifecycle of an idempotency key

```
State 1: In-flight  (responseCode = NULL)
  ─ Request is being processed
  ─ New arrivals with same key get 503 IDEMPOTENT_REQUEST_IN_PROGRESS

State 2: Committed  (responseCode = 201)
  ─ Booking succeeded and was committed in same TX as this record
  ─ Replays immediately return the stored booking result

State 3: Failed     (responseCode = 409)
  ─ Recorded outside rolled-back TX (orIgnore() handles race between two failures)
  ─ Replays return the same 409 BOOKING_CONFLICT

State 4: Expired    (expiresAt < now)
  ─ 24h TTL; should be pruned by a cleanup job
```

### Concurrency-safe key claiming
```sql
INSERT INTO idempotency_keys (idempotency_key, user_id, response_code, response_body, expires_at)
VALUES ($1, $2, NULL, NULL, $3)
ON CONFLICT (idempotency_key, user_id) DO NOTHING
RETURNING id
```
`RETURNING id` returns 1 row if we inserted (we own this request), 0 rows if the key existed (concurrent duplicate or replay).

---

## 10. Caching Strategy

Redis (cache-manager-redis-yet) is used for read caching. All cache operations use `cacheIsReady()` before touching Redis — this prevents node-redis from buffering commands in its offline queue when disconnected, which would cause hangs rather than fast failures.

### Cache keys and TTLs

| Key pattern | TTL | Invalidated by |
|---|---|---|
| `rooms:list` | 5 min | Booking created/cancelled |
| `rooms:detail:{roomId}` | 60s | Booking created/cancelled |
| `rooms:search:{start}:{end}:{capacity}:{features}:{page}:{limit}` | 30s | TTL expiry only |
| `hold:{holdId}` | 5 min | consumeHold or TTL |
| `hold:slot:{roomId}:{start}:{end}` | 5 min | consumeHold or TTL |

### Cache invalidation strategy

Avoiding `KEYS` wildcard scans (O(N), blocks Redis single thread):
- On booking: delete `rooms:list` and `rooms:detail:{roomId}` explicitly
- Search cache: allowed to be stale for up to 30s (DB exclusion constraint prevents actual double bookings, so stale search results are only a UX inconvenience)

### Redis failure degradation

| Layer | Behaviour on Redis down |
|---|---|
| RoomsService (list/detail/search) | `cacheIsReady()` returns false → skip cache → query DB directly |
| HoldsService (createHold/getHold) | Throws `503 HOLDS_UNAVAILABLE` (holds are disabled) |
| HoldsService (consumeHold) | Silently swallows error (booking already committed) |
| BookingsService (cache invalidation) | Fire-and-forget, error logged as warning |
| Startup | Falls back to in-memory cache (cache-manager default store) |

---

## 11. Rate Limiting & Abuse Prevention

### Rate limits (per-instance, in-memory)

| Scope | Limit | Key |
|---|---|---|
| Global (all routes) | 100 req/min | userId (authed) or IP (unauthed) |
| Auth routes | 10 req/min | IP |
| Search | 60 req/min | userId or IP |
| Bookings | 10 req/min | userId |

Rate limits are per-instance. With 3 replicas and Nginx least-conn distribution, effective limits are approximately 3× these values (each instance enforces independently). For strict per-cluster limiting, a Redis-backed throttler store would be needed.

On limit exceeded: `429 Too Many Requests` with `Retry-After: 60` header.

### CustomThrottlerGuard
Routes decorated with `@Throttle()` use authenticated userId as the throttle key when a valid JWT is present, falling back to IP for unauthenticated requests. This prevents a single authenticated user from using multiple IPs to bypass limits.

---

## 12. Observability

### Prometheus metrics (per instance, labelled with `instance_id`)

| Metric | Type | Labels |
|---|---|---|
| `http_request_duration_seconds` | Histogram | method, route, status_code, instance |
| `http_requests_total` | Counter | method, route, status_code, instance |
| `auth_operations_total` | Counter | operation, result, instance |
| `bookings_total` | Counter | outcome (created/conflict/cancelled/not_found), instance |
| `holds_total` | Counter | outcome (created/conflict/already_held/expired), instance |
| `cache_operations_total` | Counter | cache (list/search/detail), status (hit/miss), instance |
| Default Node.js metrics | — | Event loop lag, memory, GC, etc. |

Prometheus scrapes each API instance directly at `:3000/metrics` (not through the load balancer) to get per-instance data. Grafana provides dashboards over Prometheus.

### Structured logging (JSON)

All logs are structured JSON objects:
```json
{
  "event": "booking.created",
  "bookingId": "uuid",
  "roomId": "uuid",
  "userId": "uuid",
  "message": "Booking created"
}
```

**GDPR note:** Email addresses are never logged (email is PII). User IDs are logged — these are UUIDs with no direct PII value.

Promtail collects Docker container logs and ships them to Loki. Grafana queries both Prometheus (metrics) and Loki (logs).

### Optional Datadog integration
A `datadog` profile adds a Datadog agent that collects container logs and process metrics. All containers have `com.datadoghq.ad.logs` labels for automatic log collection.

### Health check
`GET /health` returns `200 {"status":"ok"}` — used by Docker healthchecks and load balancer readiness. The load balancer only starts after all three API instances pass their health checks.

---

## 13. Frontend Architecture

**React 18 + Vite 5 (TypeScript)**. Single-page application served by Nginx.

### Key architectural decisions

**Infinite scroll (not pagination)**
Search results use IntersectionObserver to load the next page as the user scrolls. `useSearch` hook manages page state: page 1 replaces results, pages 2+ accumulate. This avoids visible page breaks and is natural for browsing rooms.

**Auth state management**
No Redux or Zustand — auth state is in a top-level React context (`AuthContext`). Access token is stored in a `useRef` (not state) to avoid re-renders on token refresh. The context exposes `user`, `login`, `logout`, `register`, `googleLogin`.

**Token refresh without flicker**
On app mount, `useAuth` calls `api.rehydrate()` which hits `POST /auth/refresh`. During this call, `App.tsx` renders a loading spinner. Once resolved (success or failure), the app renders normally. This prevents the flash of unauthenticated content.

**Checkout flow**
```
SearchPage → RoomDetailPage (select times) → CheckoutPage
  │
  ├── POST /holds { roomId, start, end }
  │     └── 5-minute countdown timer starts (CountdownTimer)
  │
  └── POST /bookings { holdId }   (on form submit)
        ├── success → navigate to /bookings
        └── HOLD_EXPIRED → ExpiryModal (prompts user to re-select)
```

**Error handling**
`errorMessages.ts` maps API error codes (`BOOKING_CONFLICT`, `INVALID_CREDENTIALS`, etc.) to user-friendly messages. Machine-readable codes are used throughout — no string matching on error messages.

**Timezone display**
Rooms have IANA timezone identifiers. `formatInTimezone` uses `Intl.DateTimeFormat` to display booking times in the room's local timezone, with a banner: "All times shown in Europe/Rome (CET)".

---

## 14. Testing Strategy

### API unit tests (Jest + ts-jest)
Located in `src/**/*.spec.ts`. Use `@nestjs/testing` `Test.createTestingModule()` with all dependencies mocked. Focus on service business logic: idempotency paths, conflict handling, hold expiry, auth codes.

**Setup:** `src/setup-tests.ts` polyfills `webcrypto` for Node environments that need it.

### API e2e tests (Jest + supertest)
Located in `test/*.e2e-spec.ts`. Spin up a full NestJS application against a real PostgreSQL and Redis instance.

**Local development:**
- `npm run test:e2e` automatically starts `docker-compose.test.yml` (Postgres on :5433, Redis on :6380) via `globalSetup`, runs tests, then tears down via `globalTeardown`
- Uses non-conflicting ports (5433/6380) to avoid interfering with the dev stack (5432/6379)

**CI:**
- Services are provided by the CI runner (e.g. GitHub Actions services)
- `CI=true` skips `globalSetup`/`globalTeardown`
- `env-setup.ts` (first `setupFile`) sets all env vars before any module is imported — required because TypeORM reads `DATABASE_URL` at module evaluation time (before test file body runs)

### Web unit tests (Vitest + React Testing Library)
Located in `src/**/__tests__/*.test.{ts,tsx}`. Test hooks (`useSearch`, `useAuth`) and components (`RoomCard`, `BookingSummary`, `LoginForm`) in isolation with mocked API calls.

**Test count:** 179 tests across the web frontend.

### Testing the double-booking constraint
The e2e suite tests concurrent booking attempts directly against the real database, verifying that PostgreSQL's exclusion constraint fires and one request wins while the other gets `409 BOOKING_CONFLICT`.

---

## 15. GDPR & Data Privacy

A dedicated GDPR page (`/gdpr`) documents the platform's data practices and user rights.

### Data handling
- **Email:** Never logged (PII). Used only for auth and communication
- **Passwords:** bcrypt hashed, never stored in plaintext
- **Refresh tokens:** Stored as SHA-256 hashes only
- **User IDs:** UUID — no PII content, safe to log

### User rights supported
| Right | Implementation |
|---|---|
| Right of access | User can view all their bookings via `/bookings/me` |
| Right to erasure | Account deletion removes user + bookings (not yet implemented — see section 16) |
| Right to restriction | Users can cancel their bookings |
| Consent | Documented in GDPR page |

---

## 16. Intentional Omissions & Future Work

These features are explicitly out of scope for the current implementation but the architecture supports them:

### Email notifications
`dispatchSideEffects()` in `BookingsService` has a comment stub for email/analytics:
```ts
// this.notificationQueue.add({ type: 'BOOKING_CONFIRMED', bookingId, userId });
```
Add a message queue (BullMQ over Redis) and a Mailer service.

### Per-cluster rate limiting
Current throttling is per-instance in-memory. Replace `ThrottlerModule` storage with `@nest-lab/throttler-storage-redis` for true per-cluster limits.

### Idempotency key cleanup
Expired idempotency keys (>24h) accumulate in the DB. A CRON job or `pg_cron` task should `DELETE FROM idempotency_keys WHERE expires_at < NOW()`.

### Account deletion (GDPR erasure)
Soft-delete the user record, anonymise booking data (null out `user_id`), revoke all refresh tokens.

### Room management admin
Currently rooms are seeded only. An admin API for creating/updating/deactivating rooms would require an `ADMIN` role on the user entity.

### Refresh token family tracking
Current implementation revokes only the used token on rotation. A compromised refresh token used by an attacker wouldn't be detected until expiry. Token family tracking would revoke all tokens for a user if a previously-revoked token is presented.

### Feature flags
Not implemented. The architecture (single NestJS monolith, single React SPA) makes progressive rollout straightforward to add via a simple `features` table or a library like `Unleash`.

### Internationalisation (i18n)
Planned: i18next + react-i18next with browser language auto-detection and a language switcher in the header. All ~319 UI strings have been identified for extraction. Translation keys are designed following a namespace taxonomy (`auth.*`, `booking.*`, `errors.*`, etc.).
