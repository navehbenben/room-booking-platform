import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { RoomEntity } from './entities/room.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { MetricsService } from '../../common/metrics/metrics.service';

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  constructor(
    @InjectRepository(RoomEntity)
    private readonly roomsRepo: Repository<RoomEntity>,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    private readonly metrics: MetricsService,
  ) {}

  // ── Cache helpers ─────────────────────────────────────────────────────────
  //
  // node-redis queues commands in an offline buffer while reconnecting, so
  // awaiting cache.get/set hangs instead of throwing — try/catch alone is not
  // enough.  We check client.isReady first: if false, we skip the cache
  // entirely and fall through to the DB, degrading gracefully with zero latency.
  //
  // isReady is undefined for the in-memory store (no Redis client), which we
  // treat as always-available.

  private cacheIsReady(): boolean {
    const client = (this.cache as any).store?.client;
    return client === undefined || client.isReady === true;
  }

  private async safeGet<T>(key: string): Promise<T | null> {
    if (!this.cacheIsReady()) return null;
    try {
      return (await this.cache.get<T>(key)) ?? null;
    } catch {
      this.logger.warn({ event: 'cache.get_failed', key });
      return null;
    }
  }

  private async safeSet(key: string, value: unknown, ttl: number): Promise<void> {
    if (!this.cacheIsReady()) return;
    try {
      await this.cache.set(key, value, ttl);
    } catch {
      this.logger.warn({ event: 'cache.set_failed', key });
    }
  }

  // ── Public methods ─────────────────────────────────────────────────────────

  async listRooms() {
    const cacheKey = 'rooms:list';
    const cached = await this.safeGet<RoomEntity[]>(cacheKey);
    if (cached) {
      this.metrics.recordCacheOp('list', 'hit');
      return cached;
    }
    this.metrics.recordCacheOp('list', 'miss');
    const rooms = await this.roomsRepo.find({ order: { capacity: 'ASC' } });
    await this.safeSet(cacheKey, rooms, 300_000); // 5 min TTL
    return rooms;
  }

  async getRoom(id: string, opts?: { start?: Date; end?: Date }) {
    const cacheKey = `rooms:detail:${id}`;
    const cached = await this.safeGet<ReturnType<typeof mapRoomDetail>>(cacheKey);
    if (cached) {
      this.metrics.recordCacheOp('detail', 'hit');
      return cached;
    }
    this.metrics.recordCacheOp('detail', 'miss');

    const room = await this.roomsRepo.findOne({ where: { id } });
    if (!room) {
      throw new NotFoundException({ code: 'ROOM_NOT_FOUND', message: 'Room not found' });
    }

    let availabilityStatus: 'AVAILABLE' | 'HELD' | 'BOOKED' = 'AVAILABLE';

    if (opts?.start && opts?.end) {
      const startISO = opts.start.toISOString();
      const endISO = opts.end.toISOString();
      const slotKey = `hold:slot:${id}:${startISO}:${endISO}`;

      // safeGet returns null both when slot is not held AND when Redis is down.
      // Either way we fall through to the DB overlap check, which is correct:
      // holds are UX-only; the DB exclusion constraint is the source of truth.
      const held = await this.safeGet<string>(slotKey);
      if (held) {
        availabilityStatus = 'HELD';
      } else {
        const overlap = await this.roomsRepo
          .createQueryBuilder('room')
          .innerJoin(
            BookingEntity,
            'booking',
            "booking.room_id = room.id AND booking.status = 'CONFIRMED' AND booking.start_time < :end AND booking.end_time > :start",
            { start: opts.start, end: opts.end },
          )
          .where('room.id = :id', { id })
          .getOne();
        if (overlap) {
          availabilityStatus = 'BOOKED';
        }
      }
    }

    const result = mapRoomDetail(room, availabilityStatus);
    await this.safeSet(cacheKey, result, 60_000); // 60s TTL
    return result;
  }

  /**
   * Search rooms available for [start, end) with optional filters and pagination.
   * Availability is determined against CONFIRMED bookings only.
   */
  async searchAvailable(params: {
    start: Date;
    end: Date;
    capacity?: number;
    features?: string[];
    page?: number;
    limit?: number;
  }) {
    const { start, end, capacity, features, page = 1, limit = 50 } = params;

    if (end <= start) {
      throw new BadRequestException({ code: 'INVALID_TIME_RANGE', message: 'end must be after start' });
    }

    const featuresKey = features && features.length > 0 ? features.slice().sort().join(',') : '';
    const cacheKey = `rooms:search:${start.toISOString()}:${end.toISOString()}:${capacity ?? ''}:${featuresKey}:${page}:${limit}`;

    const cached = await this.safeGet<{ results: ReturnType<typeof mapRoom>[]; total: number }>(cacheKey);
    if (cached) {
      this.metrics.recordCacheOp('search', 'hit');
      return cached;
    }
    this.metrics.recordCacheOp('search', 'miss');

    // Overlap condition: booking.start < end AND booking.end > start
    let qb = this.roomsRepo
      .createQueryBuilder('room')
      .leftJoin(
        BookingEntity,
        'booking',
        "booking.room_id = room.id AND booking.status = 'CONFIRMED' AND booking.start_time < :end AND booking.end_time > :start",
        { start, end },
      )
      .where('booking.id IS NULL');

    if (capacity) {
      qb = qb.andWhere('room.capacity >= :capacity', { capacity });
    }

    if (features && features.length > 0) {
      qb = qb.andWhere('room.features @> :features', { features });
    }

    const [rooms, total] = await qb
      .orderBy('room.capacity', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const result = { results: rooms.map(mapRoom), total, page, limit };
    await this.safeSet(cacheKey, result, 30_000); // 30s TTL
    return result;
  }
}

function mapRoom(r: RoomEntity) {
  return {
    roomId: r.id,
    name: r.name,
    capacity: r.capacity,
    features: r.features,
    timezone: r.timezone ?? 'UTC',
    status: 'AVAILABLE' as const,
  };
}

function mapRoomDetail(r: RoomEntity, availabilityStatus: 'AVAILABLE' | 'HELD' | 'BOOKED') {
  return {
    roomId: r.id,
    name: r.name,
    capacity: r.capacity,
    description: r.description ?? '',
    features: r.features,
    images: r.images ?? [],
    timezone: r.timezone ?? 'UTC',
    availabilityStatus,
  };
}
