import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';
import { MetricsService } from '../metrics/metrics.service';

// Thresholds for slow-request alerts (milliseconds)
const WARN_THRESHOLD_MS = 1000;
const ERROR_THRESHOLD_MS = 3000;

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startMs = Date.now();
    const req = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      tap({
        next: () => this.record(context, req, startMs),
        error: () => this.record(context, req, startMs),
      }),
    );
  }

  private record(context: ExecutionContext, req: Request, startMs: number) {
    const res = context.switchToHttp().getResponse<Response>();
    const durationMs = Date.now() - startMs;
    const durationSec = durationMs / 1000;
    // Use the matched route pattern (e.g. /rooms/:id) rather than the raw URL
    const route = (req as any).route?.path ?? req.path ?? 'unknown';
    const { method } = req;
    const { statusCode } = res;

    this.metricsService.recordHttp(method, route, statusCode, durationSec);

    // Only log anomalies — logging every request creates noise (metrics cover normal traffic)
    if (durationMs >= ERROR_THRESHOLD_MS) {
      this.logger.error({
        event: 'request.very_slow',
        method,
        route,
        statusCode,
        durationMs,
        message: `Very slow request: ${method} ${route} took ${durationMs}ms`,
      });
    } else if (durationMs >= WARN_THRESHOLD_MS) {
      this.logger.warn({
        event: 'request.slow',
        method,
        route,
        statusCode,
        durationMs,
        message: `Slow request: ${method} ${route} took ${durationMs}ms`,
      });
    }
  }
}
