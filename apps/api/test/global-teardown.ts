import { execSync } from 'child_process';
import * as path from 'path';

/**
 * Runs once after all e2e tests.
 * Tears down the local test stack started in global-setup.ts.
 * No-op in CI.
 */
export default async function globalTeardown(): Promise<void> {
  if (process.env.CI) return;

  const composeFile = path.resolve(__dirname, '..', '..', '..', 'docker-compose.test.yml');
  console.log('\n[e2e] Stopping test services…');
  execSync(`docker compose -f "${composeFile}" down`, { stdio: 'inherit' });
  console.log('[e2e] Test services stopped.\n');
}
