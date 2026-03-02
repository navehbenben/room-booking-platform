# Room Booking Platform

A production-grade, horizontally-scalable room reservation system built with NestJS, React, PostgreSQL, and Redis. Three API replicas sit behind an Nginx load balancer; an integrated observability stack (Prometheus, Grafana, Loki) provides real-time metrics and log aggregation out of the box.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Services](#services)
- [Observability](#observability)
- [Security](#security)
- [Key Design Decisions](#key-design-decisions)
- [Project Structure](#project-structure)

---

## Architecture Overview

```
Browser
  │
  ▼
┌──────────────────────────────┐
│  Nginx  :8080  (web / SPA)   │  Serves static React build
│  proxies /api/* → api-lb     │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  Nginx  :3001  (api-lb)      │  least_conn load balancer
└──────┬───────┬───────┬───────┘
       │       │       │
   api1:3000 api2:3000 api3:3000   NestJS instances
       │       │       │
       └───────┼───────┘
               │
       ┌───────┴───────┐
       │               │
  PostgreSQL 16     Redis 7
  (primary store)  (cache + holds)
```

**Booking correctness** is enforced exclusively at the database layer via a PostgreSQL exclusion constraint — Redis is an optional performance layer that degrades gracefully if unavailable. All three API instances are stateless and share the same database and Redis.

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | NestJS 10 · TypeORM 0.3 · Passport (JWT + Google OAuth) |
| Database | PostgreSQL 16 (btree_gist extension for exclusion constraints) |
| Cache / Holds | Redis 7 (optional — API continues without it) |
| Frontend | React 18 · Vite 5 · React Router 6 · i18next (6 languages) |
| Load Balancer | Nginx 1.27 (least_conn) |
| Metrics | Prometheus · Grafana |
| Logs | Loki · Promtail · Grafana |
| Observability (opt.) | Datadog Agent |
| Containers | Docker Compose |

---

## Quick Start

### Prerequisites

- Docker 24+ and Docker Compose v2
- (Optional) Google OAuth credentials for social login

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET
```

### 2. Start everything

```bash
docker compose up --build
```

| URL | Service |
|---|---|
| http://localhost:8080 | Web app |
| http://localhost:3001 | API load balancer |
| http://localhost:9090 | Prometheus |
| http://localhost:3100 | Grafana (admin / admin) |

### 3. Start with Datadog observability

```bash
# Requires DD_API_KEY and DD_SITE in .env
docker compose --profile datadog up --build
```

### Local development (without Docker)

See [`apps/api/README.md`](apps/api/README.md) and [`apps/web/README.md`](apps/web/README.md) for per-service dev setup.

---

## Environment Variables

Copy `.env.example` to `.env` before starting. Variables with defaults are optional.

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | **Yes** | — | HS256 signing secret (min 32 chars recommended) |
| `GOOGLE_CLIENT_ID` | No | `dev_placeholder` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | `dev_placeholder` | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | No | `http://localhost:3001/auth/google/callback` | OAuth redirect URI |
| `FRONTEND_URL` | No | `http://localhost:8080` | Used for OAuth post-login redirect |
| `SEED_ROOMS_COUNT` | No | `500` | Rooms to seed on first boot |
| `DD_API_KEY` | No | — | Datadog API key (only needed with `--profile datadog`) |
| `DD_SITE` | No | `datadoghq.com` | Datadog intake site |

Database and Redis connection strings are set in `docker-compose.yml` (`postgres://app:app@postgres:5432/room_booking`, `redis://redis:6379`). Override via `DATABASE_URL` / `REDIS_URL` when using external services.

---

## Services

### API — three identical NestJS replicas

Stateless REST API. All instances share the same PostgreSQL and Redis. See [`apps/api/README.md`](apps/api/README.md) for the full endpoint reference, module breakdown, and development guide.

**Health check:** `GET http://localhost:3001/health` → `{"ok": true, "instance": "api1", "ts": "..."}`

### Web — React SPA

Single-page application served by Nginx on port 8080. All routes fall back to `index.html`; `/api/*` requests are transparently proxied to the load balancer. See [`apps/web/README.md`](apps/web/README.md).

### PostgreSQL 16

Data persisted to the `pgdata` Docker volume. Schema is applied by TypeORM `synchronize: true` on first boot (use TypeORM migrations for production deployments). The `bookings` table carries a GIST exclusion constraint that makes overlapping confirmed reservations physically impossible at the storage layer.

### Redis 7

Used for three purposes:

| Purpose | Key pattern | TTL |
|---|---|---|
| Room list cache | `rooms:list` | 5 minutes |
| Room detail cache | `rooms:detail:{id}` | 60 seconds |
| Search result cache | `rooms:search:{params}` | 30 seconds |
| Slot hold | `hold:{holdId}` / `hold:slot:{roomId}:...` | 5 minutes |

If Redis becomes unavailable the API falls back to direct database queries automatically. Holds return `503 HOLDS_UNAVAILABLE` — booking without a prior hold (by providing `roomId + start + end` directly) continues to work.

### Nginx load balancer (api-lb)

`least_conn` algorithm. `proxy_next_upstream error timeout` silently routes around unhealthy instances. The `/metrics` path is blocked at this layer so Prometheus can only scrape internally.

---

## Observability

### Prometheus + Grafana

Prometheus scrapes `/metrics` on all three API instances every 10 seconds. A pre-built dashboard is provisioned automatically in Grafana.

**Tracked metrics:**

| Metric | Labels |
|---|---|
| HTTP request duration (histogram) | route, method, status code |
| HTTP request count (counter) | route, method, status code |
| Auth operations | operation (register/login/refresh), result (success/failure) |
| Booking outcomes | outcome (created/conflict/cancelled) |
| Hold outcomes | outcome (created/conflict/already_held/expired) |
| Cache operations | operation (list/search/detail), status (hit/miss) |

Access Grafana at **http://localhost:3100** (anonymous admin, no login needed).

### Loki + Promtail

Promtail tails all container logs via the Docker socket and ships them to Loki. All API logs are structured JSON with `level`, `message`, `instance`, `context`, and `requestId` fields.

Explore logs in Grafana → **Explore** → Loki datasource. Filter by service: `{service="room-booking-api"}`.

### Request tracing

Every inbound request is assigned a UUID `X-Request-Id` (generated if not provided by the client). The ID is propagated to all log lines emitted during that request, enabling end-to-end tracing across load balancer and all API instances.

---

## Security

| Concern | Implementation |
|---|---|
| Session tokens | JWT (15 min, in-memory) + refresh token (14 d, HttpOnly cookie, SHA-256 hashed, rotated on use) |
| Password storage | bcrypt, 10 rounds |
| HTTP hardening | `helmet` middleware (CSP, HSTS, X-Frame-Options, referrer policy) |
| CORS | Restricted to `CORS_ORIGIN` env var |
| Request body | 1 MB size limit |
| Rate limiting | Auth: 10/min · Search: 60/min · Bookings: 10/min/user · Global: 100/min |
| Double-booking | PostgreSQL exclusion constraint — race-condition-proof |
| Idempotency | `Idempotency-Key` header; outcomes stored for 24 h |
| PII | Emails and tokens never written to logs |
| Metrics exposure | `/metrics` blocked at Nginx; Prometheus scrapes internally only |

---

## Key Design Decisions

**Access token in memory only**
The JWT is stored in a JavaScript variable, never in `localStorage` or `sessionStorage`. This eliminates XSS-based token theft. A 15-minute expiry and an HttpOnly refresh cookie provide transparent session continuity across page reloads.

**Booking correctness is database-only**
`EXCLUDE USING GIST (room_id WITH =, tstzrange(start_time, end_time, '[)') WITH &&) WHERE (status = 'CONFIRMED')` makes overlapping confirmed bookings physically impossible at the PostgreSQL level. No race condition, cache staleness, or retry storm can produce a double-booking.

**Redis is optional**
The API boots successfully without Redis and falls back to an in-memory cache. If Redis drops at runtime, a registered error listener on the `node-redis` client absorbs the socket-close event (preventing an unhandled-event Node.js crash), and an `isReady` guard on all cache calls causes requests to skip the cache entirely and hit the database — with zero latency penalty from a hanging offline command queue.

**Holds are UX-only**
A 5-minute Redis hold lets the checkout UI show a countdown and surface slot conflicts early. It is not a booking. Booking without a prior hold (by supplying `roomId + start + end` directly) is always supported.

**Idempotent bookings**
An `idempotency_keys` table stores every booking attempt and its outcome. Replaying the same `Idempotency-Key` within 24 hours returns the identical HTTP response without re-executing. In-flight keys (NULL response code) cause `503 IDEMPOTENT_REQUEST_IN_PROGRESS`, prompting clients to back off and retry after ~1 second.

**Three stateless replicas with least_conn**
Adding more API replicas requires no code changes — only an update to `docker-compose.yml` and Nginx upstream config. Per-instance in-memory rate limiting is fair because Nginx distributes load evenly; for true cross-replica limits, replace `ThrottlerModule` with a Redis-backed store.

---

## Project Structure

```
room-booking-platform/
├── apps/
│   ├── api/                   # NestJS backend
│   │   └── README.md          # API docs, endpoints, dev guide
│   └── web/                   # React frontend
│       └── README.md          # UI docs, routes, dev guide
├── infra/
│   ├── nginx/
│   │   └── nginx.conf         # API load balancer (least_conn, /metrics block)
│   ├── prometheus/
│   │   └── prometheus.yml     # Scrape config for 3 API instances
│   ├── loki/
│   │   └── loki-config.yml    # Log storage config
│   ├── promtail/
│   │   └── promtail-config.yml # Docker log shipper config
│   └── grafana/
│       ├── provisioning/      # Automatic datasource + dashboard provisioning
│       └── dashboards/        # room-booking.json dashboard
├── docker-compose.yml         # Full-stack orchestration
├── .env.example               # Environment variable template
└── README.md                  # This file
```
