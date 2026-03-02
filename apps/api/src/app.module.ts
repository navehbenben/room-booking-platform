import { Logger, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { HealthController } from './health.controller';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { HoldsModule } from './modules/holds/holds.module';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';
import { MetricsModule } from './common/metrics/metrics.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: true,
      logging: false,
      // Connection pool: limit to 20 connections per instance
      extra: {
        max: 20,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
        // Set PostgreSQL statement timeout to 10s to prevent runaway queries
        options: '-c statement_timeout=10000',
      },
    }),
    // Global rate limiter: 100 req/min default (in-memory per instance).
    // NOTE: For true per-cluster limiting, replace with Redis-backed storage
    // (e.g. @nest-lab/throttler-storage-redis). Per-instance limiting is still
    // effective because Nginx distributes traffic evenly across replicas.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const logger = new Logger('Redis');
        try {
          const store = await redisStore({
            url: process.env.REDIS_URL,
            socket: { connectTimeout: 5_000 },
          });
          // Without this listener Node.js throws unhandled 'error' and crashes
          // the process when the Redis socket closes unexpectedly at runtime.
          store.client.on('error', (err: Error) =>
            logger.warn(`Redis connection error — cache degraded: ${err.message}`),
          );
          return { store };
        } catch (err: any) {
          logger.warn(`Redis unavailable at startup — falling back to in-memory cache: ${err?.message}`);
          return {}; // cache-manager default: in-memory store
        }
      },
    }),
    MetricsModule,
    UsersModule,
    AuthModule,
    RoomsModule,
    BookingsModule,
    HoldsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
