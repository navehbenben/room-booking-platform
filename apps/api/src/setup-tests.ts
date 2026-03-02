// Polyfill Web Crypto API for Jest test environment (Node 18 globalThis.crypto may not be in scope)
if (typeof crypto === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { webcrypto } = require('crypto') as typeof import('crypto');
  (globalThis as any).crypto = webcrypto;
}
