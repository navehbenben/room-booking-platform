/**
 * Structured frontend logger.
 *
 * - Always writes to the browser console with level-appropriate methods.
 * - When Datadog Browser Logs is initialised (VITE_DD_CLIENT_TOKEN is set),
 *   every log entry is also forwarded to Datadog so server and browser logs
 *   appear in the same platform.
 * - No PII is logged: never pass email, name, or any user-identifying string
 *   other than a userId UUID.
 */

import { datadogLogs } from '@datadog/browser-logs';

export type LogContext = Record<string, unknown>;

type Level = 'debug' | 'info' | 'warn' | 'error';

const SERVICE = 'room-booking-web';

function buildEntry(level: Level, message: string, context?: LogContext) {
  return {
    ts: new Date().toISOString(),
    level,
    service: SERVICE,
    message,
    url: window.location.pathname,
    ...context,
  };
}

function toConsole(level: Level, message: string, context?: LogContext) {
  const entry = buildEntry(level, message, context);
  if (level === 'error') console.error(entry);
  else if (level === 'warn') console.warn(entry);
  else if (level === 'debug') console.debug(entry);
  else console.info(entry);
}

function toDatadog(level: Level, message: string, context?: LogContext) {
  try {
    const ctx = context ?? {};
    if (level === 'error') datadogLogs.logger.error(message, ctx);
    else if (level === 'warn') datadogLogs.logger.warn(message, ctx);
    else if (level === 'debug') datadogLogs.logger.debug(message, ctx);
    else datadogLogs.logger.info(message, ctx);
  } catch {
    // Datadog SDK not initialised yet — console-only mode
  }
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (import.meta.env.DEV) toConsole('debug', message, context);
    toDatadog('debug', message, context);
  },

  info(message: string, context?: LogContext) {
    toConsole('info', message, context);
    toDatadog('info', message, context);
  },

  warn(message: string, context?: LogContext) {
    toConsole('warn', message, context);
    toDatadog('warn', message, context);
  },

  /** Pass the raw Error object for automatic stack-trace extraction. */
  error(message: string, error?: unknown, context?: LogContext) {
    const extra: LogContext = {
      ...context,
      ...(error instanceof Error
        ? { errorMessage: error.message, stack: error.stack, errorName: error.name }
        : error != null
          ? { errorDetail: String(error) }
          : {}),
    };
    toConsole('error', message, extra);
    toDatadog('error', message, extra);
  },
};
