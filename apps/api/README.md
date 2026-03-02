# API — NestJS Backend

The REST API for the Room Booking Platform. Built with NestJS 10, TypeORM, PostgreSQL 16, and Redis 7. Designed for horizontal scaling: three identical stateless instances run behind the Nginx load balancer.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
  - [Authentication](#authentication)
  - [Rooms](#rooms)
  - [Holds](#holds)
  - [Bookings](#bookings)
  - [Users](#users)
  - [Health](#health)
- [Module Architecture](#module-architecture)
- [Database Schema](#database-schema)
- [Redis Usage & Fault Tolerance](#redis-usage--fault-tolerance)
- [Rate Limiting](#rate-limiting)
- [Error Format](#error-format)
- [Observability](#observability)
- [Testing](#testing)
- [Docker Build](#docker-build)

---

## Tech Stack

| | |
|---|---|
| Framework | NestJS 10.4 |
| ORM | TypeORM 0.3 |
| Database | PostgreSQL 16 |
| Cache / Holds | Redis 7 via `cache-manager-redis-yet` |
| Auth | Passport.js — JWT strategy + Google OAuth 2.0 |
| Validation | `class-validator` + `class-transformer` |
| Password hashing | bcrypt (10 rounds) |
| Metrics | prom-client 15 (Prometheus exposition format) |
| Rate limiting | `@nestjs/throttler` (in-memory, per-instance) |
| Runtime | Node.js 20 LTS |

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16 running locally (or via Docker)
- Redis 7 running locally (optional — API degrades gracefully without it)

### Install dependencies

```bash
npm install
```

### Configure environment

```bash
cp ../../.env.example .env
# Edit .env with your local values
```

Minimum required variables for local development:

```env
DATABASE_URL=postgres://app:app@localhost:5432/room_booking
REDIS_URL=redis://localhost:6379
JWT_SECRET=any-long-random-string
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

### Start in development mode

```bash
npm run start:dev
```

The API starts on `http://localhost:3000`. On first boot it seeds 500 rooms and creates all database constraints.

### Available scripts

| Script | Description |
|---|---|
| `npm run start:dev` | Hot-reload dev server (NestJS watch mode) |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run compiled production build |
| `npm run type-check` | TypeScript type checking without emit |
| `npm run lint` | ESLint |
| `npm run format:check` | Prettier check |
| `npm test` | Jest unit tests |
| `npm run test:watch` | Jest in watch mode |
| `npm run test:cov` | Jest with coverage report |
| `npm run test:e2e` | End-to-end tests |

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | — | JWT HS256 signing secret |
| `REDIS_URL` | No | — | Redis connection string. If unset or unreachable, falls back to in-memory cache |
| `PORT` | No | `3000` | HTTP listen port |
| `CORS_ORIGIN` | No | `*` | Allowed CORS origin(s), comma-separated |
| `INSTANCE_ID` | No | `$HOSTNAME` | Identifier included in all log lines and `/health` |
| `SEED_ROOMS_COUNT` | No | `500` | Rooms to seed on first boot (top-up: only missing rooms are inserted) |
| `NODE_ENV` | No | `development` | `production` disables verbose stack traces |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | — | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | No | — | OAuth redirect URI registered in Google Console |
| `FRONTEND_URL` | No | — | Post-OAuth redirect destination |

---

## API Reference

All endpoints return JSON. Authenticated endpoints require `Authorization: Bearer <access_token>`.

### Authentication

#### `POST /auth/register`

Create a new account.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "secret123",
  "name": "Alice Smith"
}
```

**Response `201`:**
```json
{
  "userId": "uuid",
  "accessToken": "eyJ..."
}
```
A `refreshToken` HttpOnly cookie is also set.

---

#### `POST /auth/login`

Authenticate with email and password.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

**Response `200`:** Same shape as `/auth/register`.

---

#### `POST /auth/refresh`

Exchange the `refreshToken` cookie for a new access token. The refresh token is rotated on every call — the old cookie is invalidated immediately.

**Response `200`:**
```json
{ "accessToken": "eyJ..." }
```

---

#### `POST /auth/logout`

Revoke the current refresh token and clear the cookie.

**Response `204`** (no body).

---

#### `GET /auth/google`

Redirect to Google OAuth consent screen.

#### `GET /auth/google/callback`

OAuth callback. On success, redirects to `FRONTEND_URL` with the access token in the query string.

---

### Rooms

All room endpoints are public (no authentication required).

#### `GET /rooms`

List all rooms ordered by capacity. Cached for 5 minutes.

**Response `200`:**
```json
[
  {
    "roomId": "uuid",
    "name": "Orion",
    "capacity": 8,
    "features": ["projector", "whiteboard", "video_conf"],
    "timezone": "America/New_York",
    "status": "AVAILABLE"
  }
]
```

---

#### `GET /rooms/search`

Search for rooms available in a time window. Results are paginated and cached for 30 seconds.

**Query parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `start` | ISO 8601 datetime | **Yes** | Booking start time |
| `end` | ISO 8601 datetime | **Yes** | Booking end time (must be after start) |
| `capacity` | integer | No | Minimum required capacity |
| `features` | string (comma-separated) | No | Required features (e.g. `projector,whiteboard`) |
| `page` | integer | No | Page number, default `1` |
| `limit` | integer | No | Results per page, default `50` |

**Response `200`:**
```json
{
  "results": [{ "roomId": "...", "name": "...", "capacity": 8, "features": [...], "timezone": "..." }],
  "total": 42,
  "page": 1,
  "limit": 50
}
```

---

#### `GET /rooms/:id`

Get full room detail. Optionally check availability for a time range. Cached for 60 seconds.

**Query parameters:** `start` and `end` (ISO 8601, optional) — if provided, the response includes `availabilityStatus`.

**Response `200`:**
```json
{
  "roomId": "uuid",
  "name": "Orion",
  "capacity": 8,
  "description": "...",
  "features": ["projector", "whiteboard"],
  "images": ["https://..."],
  "timezone": "America/New_York",
  "availabilityStatus": "AVAILABLE"
}
```

`availabilityStatus` values: `AVAILABLE` · `HELD` · `BOOKED`

---

### Holds

Holds reserve a slot for 5 minutes while the user completes checkout. **Requires authentication.**

#### `POST /holds`

**Body:**
```json
{
  "roomId": "uuid",
  "start": "2025-06-01T09:00:00Z",
  "end": "2025-06-01T10:00:00Z"
}
```

**Response `201`:**
```json
{
  "holdId": "uuid",
  "expiresAt": "2025-06-01T09:05:00.000Z"
}
```

**Errors:**
- `409 ALREADY_HELD` — Another user holds this slot
- `409 ROOM_BOOKED` — The room is already confirmed for this time
- `503 HOLDS_UNAVAILABLE` — Redis is down; holds are temporarily disabled

---

#### `GET /holds/:holdId`

Retrieve a hold. Returns `410 HOLD_EXPIRED` if the hold no longer exists.

**Response `200`:**
```json
{
  "holdId": "uuid",
  "roomId": "uuid",
  "userId": "uuid",
  "start": "2025-06-01T09:00:00Z",
  "end": "2025-06-01T10:00:00Z",
  "expiresAt": "2025-06-01T09:05:00.000Z"
}
```

---

### Bookings

All booking endpoints require authentication.

#### `POST /bookings`

Create a booking. Idempotent — supply `Idempotency-Key: <uuid>` to safely retry.

Two modes:

**Mode 1 — from a hold (recommended):**
```json
{ "holdId": "uuid" }
```

**Mode 2 — direct (no hold required):**
```json
{
  "roomId": "uuid",
  "start": "2025-06-01T09:00:00Z",
  "end": "2025-06-01T10:00:00Z",
  "notes": "Team standup"
}
```

**Headers:**
```
Authorization: Bearer <token>
Idempotency-Key: <uuid>   (optional but strongly recommended)
```

**Response `201`:**
```json
{
  "bookingId": "uuid",
  "status": "CONFIRMED"
}
```

**Errors:**
- `409 BOOKING_CONFLICT` — Room already booked for this time range
- `410 HOLD_EXPIRED` — Hold no longer exists
- `503 HOLDS_UNAVAILABLE` — Redis unavailable when using holdId mode

---

#### `GET /bookings/me`

List the authenticated user's bookings, newest first.

**Response `200`:**
```json
[
  {
    "bookingId": "uuid",
    "roomId": "uuid",
    "roomName": "Orion",
    "start": "2025-06-01T09:00:00Z",
    "end": "2025-06-01T10:00:00Z",
    "status": "CONFIRMED",
    "notes": "Team standup",
    "createdAt": "2025-05-30T12:00:00Z"
  }
]
```

---

#### `GET /bookings/:id`

Get a single booking. Returns `403` if the booking belongs to a different user.

---

#### `DELETE /bookings/:id`

Soft-cancel a booking (sets `status = 'CANCELLED'`). Returns `409` if already cancelled.

**Response `200`:** Same shape as `GET /bookings/me` item, with `status: "CANCELLED"`.

---

### Users

All user endpoints require authentication.

#### `GET /users/me`

Get the current user's profile.

**Response `200`:**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "name": "Alice Smith",
  "hasPassword": true,
  "hasGoogleAccount": false,
  "createdAt": "2025-01-01T00:00:00Z"
}
```

---

#### `PATCH /users/me`

Update display name.

**Body:** `{ "name": "Alice Jones" }`

---

#### `POST /users/me/change-password`

Change password. Requires the current password.

**Body:**
```json
{
  "currentPassword": "old-secret",
  "newPassword": "new-secret"
}
```

---

#### `GET /users/me/data`

Export all personal data (GDPR right to access). Returns user profile, bookings, and consent records as JSON.

---

#### `DELETE /users/me`

Permanently delete the account. All bookings are soft-cancelled first.

**Response `204`** (no body).

---

### Health

#### `GET /health`

**Response `200`:**
```json
{
  "ok": true,
  "instance": "api1",
  "ts": "2025-06-01T09:00:00.000Z"
}
```

---

## Module Architecture

```
src/
├── main.ts                        # Bootstrap: helmet, CORS, validation, graceful shutdown
├── app.module.ts                  # Root module: TypeORM, CacheModule, Throttler, all features
├── health.controller.ts           # GET /health
│
├── modules/
│   ├── auth/                      # JWT + Google OAuth, refresh token rotation
│   ├── users/                     # Profile, password change, GDPR export & deletion
│   ├── rooms/                     # Room listing, search, seeding, caching
│   ├── bookings/                  # Create, list, cancel, idempotency
│   └── holds/                     # 5-min Redis slot reservations
│
└── common/
    ├── guards/
    │   └── custom-throttler.guard.ts   # Routes by userId (authed) or IP (anon)
    ├── filters/
    │   └── http-error.filter.ts        # Unified error response shape
    ├── interceptors/
    │   └── logging.interceptor.ts      # Request duration + metrics
    ├── middleware/
    │   └── request-id.middleware.ts    # UUID per request for log correlation
    ├── logger/
    │   └── json.logger.ts              # Structured JSON logger
    └── metrics/
        └── metrics.service.ts          # Prometheus counters and histograms
```

### Auth module detail

- **Access token**: HS256 JWT, 15-minute expiry, never persisted (in-memory only)
- **Refresh token**: 256-bit cryptographically random string, stored as SHA-256 hash in the `refresh_tokens` table. Sent as an HttpOnly, Secure, SameSite=Strict cookie with a 14-day `maxAge`. Rotated on every `/auth/refresh` call — the previous token is revoked immediately.
- **Google OAuth**: Passport `GoogleStrategy`. On callback, finds or creates user by `googleId`; issues the same JWT + cookie pair.

### Bookings module detail

**Overlap prevention** (three layers, strongest to weakest):

1. **PostgreSQL exclusion constraint** — enforced at storage level, cannot be bypassed
2. **Pessimistic row lock** (`SELECT ... FOR UPDATE`) inside the transaction
3. **Hold slot check** in Redis before inserting (UX-only, not a correctness guarantee)

**Idempotency flow:**
```
Request arrives with Idempotency-Key
  → Fast-path: check idempotency_keys table (read-only, outside transaction)
    → Found + completed: replay stored response
    → Found + in-flight (NULL response_code): 503 IDEMPOTENT_REQUEST_IN_PROGRESS
    → Not found: continue
  → Transaction:
      INSERT idempotency_key (NULL response) ON CONFLICT DO NOTHING
      → 0 rows affected: concurrent duplicate, handle same as fast-path
      INSERT booking
      UPDATE idempotency_key SET response_code=201, response_body={...}
    COMMIT
  → Side effects (fire-and-forget):
      consumeHold() — cleans up Redis slot
      invalidateRoomsCache() — deletes rooms:list and rooms:detail:{id}
```

---

## Database Schema

```sql
-- Users
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT,                    -- nullable for Google-only accounts
  name          TEXT,
  google_id     TEXT,                    -- partial unique index (WHERE google_id IS NOT NULL)
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Rooms (500 seeded on boot)
CREATE TABLE rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  capacity    INTEGER NOT NULL,          -- indexed
  features    TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  images      TEXT[] NOT NULL DEFAULT '{}',
  timezone    TEXT,                      -- IANA timezone string
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings
CREATE TABLE bookings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID NOT NULL REFERENCES rooms(id),
  user_id    UUID NOT NULL REFERENCES users(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time   TIMESTAMPTZ NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('CONFIRMED', 'CANCELLED')),
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Prevents overlapping CONFIRMED bookings for the same room at the DB level
  CONSTRAINT bookings_no_overlap
    EXCLUDE USING GIST (
      room_id WITH =,
      tstzrange(start_time, end_time, '[)') WITH &&
    ) WHERE (status = 'CONFIRMED')
);

-- Refresh tokens
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT UNIQUE NOT NULL,      -- SHA-256 of the raw token
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotency keys
CREATE TABLE idempotency_keys (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key  TEXT NOT NULL,
  user_id          UUID NOT NULL,
  response_code    INTEGER,              -- NULL while in-flight
  response_body    JSONB,
  expires_at       TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (idempotency_key, user_id)
);
```

**Connection pool:** 20 connections per instance (60 total across 3 replicas). Connection timeout: 5 s. Idle timeout: 30 s. Statement timeout: 10 s (set via `options: '-c statement_timeout=10000'`).

---

## Redis Usage & Fault Tolerance

Redis is **not required** for the API to function. Booking correctness depends entirely on PostgreSQL.

### What Redis provides

| Data | Key pattern | TTL | Fallback |
|---|---|---|---|
| Room list | `rooms:list` | 5 min | Query DB |
| Room detail | `rooms:detail:{id}` | 60 s | Query DB |
| Search results | `rooms:search:{params}` | 30 s | Query DB |
| Hold data | `hold:{holdId}` | 5 min | 503 HOLDS_UNAVAILABLE |
| Hold slot lock | `hold:slot:{roomId}:{start}:{end}` | 5 min | Skip hold, check DB |

### How the fallback works

**1. Startup resilience** (`app.module.ts`)

`redisStore()` is wrapped in a try/catch with a 5-second connect timeout. If Redis is unreachable, the app boots with an in-memory cache store and logs a warning.

**2. Runtime socket-close resilience** (`app.module.ts`)

```typescript
store.client.on('error', (err) =>
  logger.warn(`Redis connection error — cache degraded: ${err.message}`)
);
```

Without this listener, Node.js re-throws unhandled `error` events on EventEmitters as uncaught exceptions, crashing the process. The listener absorbs the event and logs it.

**3. Hanging command prevention** (`rooms.service.ts`)

`node-redis` queues commands in an offline buffer while reconnecting. A queued `await cache.get(key)` hangs indefinitely — try/catch alone cannot intercept this. The solution is to check `client.isReady` before issuing any command:

```typescript
private cacheIsReady(): boolean {
  const client = (this.cache as any).store?.client;
  return client === undefined || client.isReady === true;
}
```

`safeGet` and `safeSet` helpers call this check first and return `null` / no-op immediately when Redis is not ready. All three service methods (`listRooms`, `getRoom`, `searchAvailable`) use these helpers — they fall through to the database instantly when Redis is unavailable.

**4. No KEYS wildcard scans**

Cache invalidation avoids `KEYS rooms:search:*` (O(N), blocks Redis event loop). Instead:
- `rooms:list` and `rooms:detail:{roomId}` are deleted by exact key on booking create/cancel
- Search result keys expire naturally via their 30-second TTL

---

## Rate Limiting

Implemented with `@nestjs/throttler`. Limits are per-instance (in-memory); Nginx distributes traffic evenly so this is effective for preventing abuse. For true cross-replica enforcement, replace with a Redis-backed storage adapter.

| Scope | Limit | Key |
|---|---|---|
| Global default | 100 req / 60 s | IP address |
| Auth endpoints | 10 req / 60 s | IP address |
| Search (`GET /rooms/search`) | 60 req / 60 s | IP address |
| Bookings (`POST /bookings`) | 10 req / 60 s | User ID |

Throttled requests receive `429 Too Many Requests` with `Retry-After: 60`.

---

## Error Format

All errors — validation failures, business errors, unexpected exceptions — use the same JSON envelope:

```json
{
  "statusCode": 409,
  "code": "BOOKING_CONFLICT",
  "message": "Room already booked for this time range",
  "requestId": "3e4a1b2c-..."
}
```

| Field | Description |
|---|---|
| `statusCode` | HTTP status code |
| `code` | Machine-readable error identifier |
| `message` | Human-readable description |
| `requestId` | UUID for log correlation |

**Common error codes:**

| Code | Status | Description |
|---|---|---|
| `EMAIL_NOT_FOUND` | 401 | No account with that email |
| `INVALID_CREDENTIALS` | 401 | Wrong password |
| `ROOM_NOT_FOUND` | 404 | Room does not exist |
| `BOOKING_NOT_FOUND` | 404 | Booking does not exist |
| `HOLD_EXPIRED` | 410 | Hold no longer exists in Redis |
| `ALREADY_HELD` | 409 | Another user holds this slot |
| `ROOM_BOOKED` | 409 | Room is already confirmed for this range |
| `BOOKING_CONFLICT` | 409 | DB exclusion constraint triggered |
| `BOOKING_ALREADY_CANCELLED` | 409 | Booking was already cancelled |
| `INVALID_TIME_RANGE` | 400 | end is not after start |
| `MISSING_FIELDS` | 400 | Required fields not provided |
| `HOLDS_UNAVAILABLE` | 503 | Redis is unreachable |
| `IDEMPOTENT_REQUEST_IN_PROGRESS` | 503 | Another request with the same key is in-flight |

---

## Observability

### Structured logging

All log output is JSON (via `JsonLogger`). Fields on every line:

```json
{
  "level": "log",
  "timestamp": "2025-06-01T09:00:00.000Z",
  "instance": "api1",
  "context": "BookingsService",
  "message": "Booking created",
  "event": "booking.created",
  "bookingId": "uuid",
  "requestId": "uuid"
}
```

Emails, passwords, and tokens are never logged.

### Prometheus metrics

Exposed at `GET /metrics` (Prometheus text format). Blocked at Nginx — only scraped internally.

Key metric names:

| Metric | Type |
|---|---|
| `http_request_duration_seconds` | Histogram |
| `http_requests_total` | Counter |
| `auth_operations_total` | Counter |
| `bookings_total` | Counter |
| `holds_total` | Counter |
| `cache_operations_total` | Counter |

---

## Testing

Tests use Jest. Run all tests:

```bash
npm test
```

With coverage:

```bash
npm run test:cov
```

Test files are co-located with source files in `__tests__/` subdirectories or as `.spec.ts` siblings.

---

## Docker Build

The Dockerfile uses a three-stage build:

1. **deps** — Install production + dev dependencies
2. **build** — Compile TypeScript with `nest build`
3. **runtime** — Node 20 Alpine, production deps only, runs `node dist/main.js`

**Critical notes:**

- `.dockerignore` must exclude `dist/` and `*.tsbuildinfo`. If stale incremental build info is present, TypeScript skips compilation entirely, producing no `dist/`.
- `tsconfig.build.json` sets `"rootDir": "src"` so output lands in `dist/` (not `dist/src/`), matching `CMD ["node", "dist/main.js"]`.

Build manually:

```bash
docker build -t room-booking-api .
docker run -p 3000:3000 \
  -e DATABASE_URL=... \
  -e JWT_SECRET=... \
  room-booking-api
```
