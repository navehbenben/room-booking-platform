import i18next from 'i18next';
import type { ApiError } from '../api/client';

export function friendlyError(e: unknown, fallback?: string): string {
  const defaultMsg = fallback ?? i18next.t('errors.default');
  const err = e as ApiError;
  const code = err?.error?.code;

  if (code) {
    // Exact code lookup
    if (i18next.exists(`errors.${code}`)) return i18next.t(`errors.${code}`);

    // NestJS throttler produces codes like "ThrottlerException"
    if (/throttl/i.test(code)) return i18next.t('errors.THROTTLE');

    // HTTP_ERROR carries the status in the message: "HTTP 503"
    if (code === 'HTTP_ERROR') {
      const match = err.error?.message?.match(/(\d{3})/);
      if (match) {
        const status = Number(match[1]);
        const key = `errors.http${status}`;
        if (i18next.exists(key)) return i18next.t(key);
      }
      return defaultMsg;
    }
  }

  // If the server sent a human-readable sentence (not an ALL_CAPS code),
  // surface it directly — it is already informative.
  const msg = err?.error?.message;
  if (msg && !/^[A-Z0-9_]{3,}$/.test(msg) && !/^\d{3}/.test(msg)) {
    return msg;
  }

  return defaultMsg;
}

/** Extract the raw error code from an unknown thrown value. */
export function errorCode(e: unknown): string | null {
  return (e as ApiError)?.error?.code ?? null;
}
