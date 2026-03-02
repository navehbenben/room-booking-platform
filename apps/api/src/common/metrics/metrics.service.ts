import { Injectable, OnModuleInit } from '@nestjs/common';
import { Registry, collectDefaultMetrics, Counter, Histogram, RegistryContentType } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry = new Registry();

  private readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code', 'instance'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [this.registry],
  });

  private readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code', 'instance'],
    registers: [this.registry],
  });

  private readonly authOperationsTotal = new Counter({
    name: 'auth_operations_total',
    help: 'Total number of auth operations',
    labelNames: ['operation', 'result', 'instance'],
    registers: [this.registry],
  });

  private readonly bookingsTotal = new Counter({
    name: 'bookings_total',
    help: 'Total number of booking operations',
    labelNames: ['outcome', 'instance'],
    registers: [this.registry],
  });

  private readonly holdsTotal = new Counter({
    name: 'holds_total',
    help: 'Total number of hold operations',
    labelNames: ['outcome', 'instance'],
    registers: [this.registry],
  });

  private readonly cacheOperationsTotal = new Counter({
    name: 'cache_operations_total',
    help: 'Total number of cache operations',
    labelNames: ['cache', 'status', 'instance'],
    registers: [this.registry],
  });

  private readonly instance = process.env.INSTANCE_ID || process.env.HOSTNAME || 'default';

  onModuleInit() {
    collectDefaultMetrics({ register: this.registry });
  }

  recordHttp(method: string, route: string, statusCode: number, durationSec: number) {
    const labels = { method, route, status_code: String(statusCode), instance: this.instance };
    this.httpRequestDuration.observe(labels, durationSec);
    this.httpRequestsTotal.inc(labels);
  }

  recordAuth(operation: 'register' | 'login' | 'refresh' | 'logout', result: 'success' | 'failure') {
    this.authOperationsTotal.inc({ operation, result, instance: this.instance });
  }

  recordBooking(outcome: 'created' | 'conflict' | 'cancelled' | 'not_found') {
    this.bookingsTotal.inc({ outcome, instance: this.instance });
  }

  recordHold(outcome: 'created' | 'conflict' | 'already_held' | 'expired') {
    this.holdsTotal.inc({ outcome, instance: this.instance });
  }

  recordCacheOp(cache: 'list' | 'search' | 'detail', status: 'hit' | 'miss') {
    this.cacheOperationsTotal.inc({ cache, status, instance: this.instance });
  }

  async getMetrics(): Promise<{ contentType: RegistryContentType; metrics: string }> {
    return {
      contentType: this.registry.contentType,
      metrics: await this.registry.metrics(),
    };
  }
}
