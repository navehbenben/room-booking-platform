import { LoggerService } from '@nestjs/common';

const INSTANCE_ID = process.env.INSTANCE_ID || process.env.HOSTNAME || 'default';
const SERVICE = 'room-booking-api';
const ENV = process.env.NODE_ENV || 'development';

// Datadog standard severity field values
const DD_STATUS: Record<string, string> = {
  info: 'info',
  warn: 'warning', // Datadog expects "warning", not "warn"
  error: 'error',
  debug: 'debug',
  verbose: 'trace',
};

export class JsonLogger implements LoggerService {
  log(message: any, context?: string) {
    this.write('info', message, context);
  }

  error(message: any, trace?: string, context?: string) {
    this.write('error', message, context, trace);
  }

  warn(message: any, context?: string) {
    this.write('warn', message, context);
  }

  debug(message: any, context?: string) {
    this.write('debug', message, context);
  }

  verbose(message: any, context?: string) {
    this.write('verbose', message, context);
  }

  private write(level: string, message: any, context?: string, trace?: string) {
    const entry: Record<string, unknown> = {
      ts: new Date().toISOString(),
      level,
      // Datadog standard fields — the agent uses these for routing and severity
      status: DD_STATUS[level] ?? level,
      service: SERVICE,
      env: ENV,
      instance: INSTANCE_ID,
      ddsource: 'nodejs',
      context: context ?? 'App',
    };

    if (typeof message === 'object' && message !== null) {
      // Spread structured log fields directly into the entry so Datadog can index them.
      // Services log as objects: { event: 'booking.created', bookingId, roomId, ... }
      Object.assign(entry, message);
      // Ensure the 'message' field always exists (required by Datadog)
      if (!entry.message) entry.message = entry.event ?? '[structured log]';
    } else {
      entry.message = String(message);
    }

    if (trace) entry.trace = trace;

    process.stdout.write(JSON.stringify(entry) + '\n');
  }
}
