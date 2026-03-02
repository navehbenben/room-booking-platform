/**
 * Loaded by Jest as the first setupFile — runs before any module is imported.
 * This ensures env vars are in place when app.module.ts evaluates @Module
 * decorators (which read process.env at decoration time, not at test time).
 *
 * CI overrides these values via GitHub Actions environment variables.
 * Locally, start services with: docker compose up postgres redis -d
 */
// Local ports differ from dev-stack (5432/6379) to allow parallel operation.
// CI overrides these with its own service ports (5432/6379) via env vars.
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5433/room_booking_test';
process.env.REDIS_URL ??= 'redis://localhost:6380';
process.env.JWT_SECRET ??= 'e2e-test-secret-32-chars-minimum!!';
process.env.GOOGLE_CLIENT_ID ??= 'test_google_client_id';
process.env.GOOGLE_CLIENT_SECRET ??= 'test_google_client_secret';
// Fail fast when DB is unreachable rather than waiting ~30 s (3 retries × 3 s delay)
process.env.TYPEORM_RETRY_ATTEMPTS ??= '3';
process.env.TYPEORM_RETRY_DELAY ??= '1000';
