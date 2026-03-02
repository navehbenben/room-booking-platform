import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpErrorFilter } from './common/filters/http-error.filter';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { JsonLogger } from './common/logger/json-logger.service';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { MetricsService } from './common/metrics/metrics.service';

async function bootstrap() {
  // Fail fast if required secrets are missing — never run production with defaults
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required but not set');
  }

  const logger = new JsonLogger();
  const app = await NestFactory.create(AppModule, { cors: false, logger });

  app.use(helmet());
  app.use(cookieParser());
  // Limit request body to 1 MB to prevent abuse
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));
  app.use(requestIdMiddleware);

  // Graceful shutdown: wait for in-flight requests before stopping
  app.enableShutdownHooks();

  const corsOrigin = process.env.CORS_ORIGIN;
  if (!corsOrigin && process.env.NODE_ENV === 'production') {
    throw new Error('CORS_ORIGIN environment variable is required in production');
  }
  app.enableCors({
    // In dev, reflect any origin. In production CORS_ORIGIN must be set.
    origin: corsOrigin ? corsOrigin.split(',').map((s) => s.trim()) : true,
    credentials: true,
    // Cache preflight responses for 24 h to avoid OPTIONS round-trips on every request
    maxAge: 86400,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpErrorFilter());

  const metricsService = app.get(MetricsService);
  app.useGlobalInterceptors(new LoggingInterceptor(metricsService));

  const port = Number(process.env.PORT || 3000);
  await app.listen(port);

  const instanceId = process.env.INSTANCE_ID || process.env.HOSTNAME || 'default';
  logger.log(`Instance ${instanceId} listening on port ${port}`, 'Bootstrap');
}

bootstrap();
