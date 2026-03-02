import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { MetricsService } from '../../common/metrics/metrics.service';

const HOLD_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface HoldData {
  holdId: string;
  roomId: string;
  userId: string;
  start: string;
  end: string;
  expiresAt: string;
}

@Injectable()
export class HoldsService {
  private readonly logger = new Logger(HoldsService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @InjectRepository(BookingEntity) private readonly bookingsRepo: Repository<BookingEntity>,
    private readonly metrics: MetricsService,
  ) {}

  async createHold(userId: string, roomId: string, start: Date, end: Date) {
    if (end <= start) {
      throw new ConflictException({ code: 'INVALID_TIME_RANGE', message: 'end must be after start' });
    }

    const startISO = start.toISOString();
    const endISO = end.toISOString();
    const slotKey = `hold:slot:${roomId}:${startISO}:${endISO}`;

    // If Redis is unavailable, holds are disabled — degrade gracefully per design spec.
    // Bookings remain safe because the DB exclusion constraint is the source of truth.
    let existingHold: string | undefined | null;
    try {
      existingHold = await this.cache.get<string>(slotKey);
    } catch (err: any) {
      this.logger.error({ event: 'hold.redis_unavailable', operation: 'get', message: err.message }, err.stack);
      throw new ServiceUnavailableException({
        code: 'HOLDS_UNAVAILABLE',
        message: 'Hold service temporarily unavailable',
      });
    }

    if (existingHold) {
      this.metrics.recordHold('already_held');
      this.logger.warn({
        event: 'hold.already_held',
        roomId,
        start: startISO,
        end: endISO,
        message: 'Slot already held by another user',
      });
      throw new ConflictException({ code: 'ALREADY_HELD', message: 'This slot is already reserved by another user' });
    }

    // Check DB overlap against CONFIRMED bookings
    const overlap = await this.bookingsRepo
      .createQueryBuilder('b')
      .where('b.room_id = :roomId', { roomId })
      .andWhere("b.status = 'CONFIRMED'")
      .andWhere('b.start_time < :end', { end })
      .andWhere('b.end_time > :start', { start })
      .getOne();

    if (overlap) {
      this.metrics.recordHold('conflict');
      this.logger.warn({
        event: 'hold.room_booked',
        roomId,
        start: startISO,
        end: endISO,
        message: 'Room already booked for requested slot',
      });
      throw new ConflictException({ code: 'ROOM_BOOKED', message: 'Room is already booked for this time range' });
    }

    const holdId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + HOLD_TTL_MS);

    const holdData: HoldData = {
      holdId,
      roomId,
      userId,
      start: startISO,
      end: endISO,
      expiresAt: expiresAt.toISOString(),
    };

    try {
      await this.cache.set(`hold:${holdId}`, holdData, HOLD_TTL_MS);
      await this.cache.set(slotKey, holdId, HOLD_TTL_MS);
    } catch (err: any) {
      this.logger.error({ event: 'hold.redis_unavailable', operation: 'set', message: err.message }, err.stack);
      throw new ServiceUnavailableException({
        code: 'HOLDS_UNAVAILABLE',
        message: 'Hold service temporarily unavailable',
      });
    }

    this.metrics.recordHold('created');
    this.logger.log({
      event: 'hold.created',
      holdId,
      roomId,
      userId,
      expiresAt: expiresAt.toISOString(),
      message: 'Hold created',
    });
    return { holdId, expiresAt: expiresAt.toISOString() };
  }

  async getHold(holdId: string, userId: string): Promise<HoldData> {
    let holdData: HoldData | undefined | null;
    try {
      holdData = await this.cache.get<HoldData>(`hold:${holdId}`);
    } catch (err: any) {
      this.logger.error(
        { event: 'hold.redis_unavailable', operation: 'get_hold', holdId, message: err.message },
        err.stack,
      );
      throw new ServiceUnavailableException({
        code: 'HOLDS_UNAVAILABLE',
        message: 'Hold service temporarily unavailable',
      });
    }

    if (!holdData) {
      this.logger.warn({ event: 'hold.expired', holdId, message: 'Hold not found or expired' });
      throw new GoneException({ code: 'HOLD_EXPIRED', message: 'Hold has expired or does not exist' });
    }

    if (holdData.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Access denied' });
    }

    return holdData;
  }

  async consumeHold(holdId: string, roomId: string, startISO: string, endISO: string) {
    // Booking is already committed — hold cleanup failure is non-fatal
    try {
      await this.cache.del(`hold:${holdId}`);
      await this.cache.del(`hold:slot:${roomId}:${startISO}:${endISO}`);
    } catch (err: any) {
      // Redis unavailable: hold will expire naturally after TTL — log as warning, not error
      this.logger.warn({
        event: 'hold.consume_failed',
        holdId,
        roomId,
        message: 'Failed to clean up hold after booking — will expire via TTL',
      });
    }
  }
}
