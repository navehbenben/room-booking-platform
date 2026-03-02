import { execSync } from 'child_process';
import * as path from 'path';

/**
 * Runs once before all e2e tests.
 * In CI (process.env.CI is set by GitHub Actions) services are provided by
 * the workflow — skip local Docker startup.
 * Locally, spin up the lightweight test stack defined in docker-compose.test.yml.
 */
export default async function globalSetup(): Promise<void> {
  if (process.env.CI) return;

  const composeFile = path.resolve(__dirname, '..', '..', '..', 'docker-compose.test.yml');
  console.log('\n[e2e] Starting test services via Docker Compose…');
  execSync(`docker compose -f "${composeFile}" up -d --wait`, { stdio: 'inherit' });
  console.log('[e2e] Test services ready.\n');
}
