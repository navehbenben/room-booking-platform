import { BadRequestException, Inject, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { RoomEntity } from './entities/room.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { MetricsService } from '../../common/metrics/metrics.service';

// ── Seed data ──────────────────────────────────────────────────────────────
const ROOM_NAMES = [
  // Cosmic / Space
  'Orion', 'Nova', 'Atlas', 'Luna', 'Zenith', 'Apex', 'Horizon', 'Summit', 'Vertex', 'Nexus',
  'Pulse', 'Ember', 'Flare', 'Drift', 'Echo', 'Harbor', 'Iris', 'Jade', 'Maple', 'Neon',
  'Opal', 'Prism', 'Quartz', 'Raven', 'Solar', 'Titan', 'Umbra', 'Vega', 'Aurora', 'Blaze',
  // Nature / Landscapes
  'Crest', 'Dawn', 'Eclipse', 'Forge', 'Grove', 'Haven', 'Indigo', 'Journey', 'Kestrel', 'Lake',
  'Muse', 'Nordic', 'Orbit', 'Peak', 'Quest', 'River', 'Sage', 'Thunder', 'Unity', 'Valor',
  'Wave', 'Xenon', 'Zephyr', 'Amber', 'Birch', 'Cedar', 'Dune', 'Elm', 'Fjord', 'Gale',
  // Gems / Minerals
  'Heath', 'Isle', 'Juniper', 'Kelp', 'Larch', 'Mist', 'Oak', 'Pine', 'Reef', 'Sand',
  'Teal', 'Vale', 'Willow', 'Coral', 'Delta', 'Falcon', 'Griffin', 'Hydra', 'Ion', 'Juno',
  // Astronomy
  'Kronos', 'Leo', 'Marina', 'Neptune', 'Omega', 'Perseus', 'Rigel', 'Sirius', 'Talon', 'Ursa',
  // Architecture / Elements
  'Viper', 'Wren', 'Aster', 'Basalt', 'Cairn', 'Dusk', 'Ether', 'Frost', 'Gleam', 'Halo',
];

const CAPACITIES = [2, 2, 4, 4, 4, 6, 6, 8, 8, 10, 12, 14, 16, 20, 24, 30];

// A diverse set of IANA timezones spanning every continent — assigned by room index.
const TIMEZONES = [
  'America/New_York',    // UTC-5 / EDT-4
  'America/Chicago',     // UTC-6
  'America/Denver',      // UTC-7
  'America/Los_Angeles', // UTC-8
  'America/Sao_Paulo',   // UTC-3
  'America/Toronto',     // UTC-5
  'Europe/London',       // UTC+0
  'Europe/Paris',        // UTC+1
  'Europe/Rome',         // UTC+1
  'Europe/Berlin',       // UTC+1
  'Europe/Amsterdam',    // UTC+1
  'Europe/Madrid',       // UTC+1
  'Europe/Warsaw',       // UTC+1
  'Europe/Helsinki',     // UTC+2
  'Europe/Athens',       // UTC+2
  'Europe/Moscow',       // UTC+3
  'Asia/Dubai',          // UTC+4
  'Asia/Kolkata',        // UTC+5:30
  'Asia/Bangkok',        // UTC+7
  'Asia/Singapore',      // UTC+8
  'Asia/Tokyo',          // UTC+9
  'Asia/Seoul',          // UTC+9
  'Asia/Shanghai',       // UTC+8
  'Australia/Sydney',    // UTC+10/11
  'Pacific/Auckland',    // UTC+12/13
];

const ALL_FEATURES = [
  'projector',
  'whiteboard',
  'tv',
  'video_conf',
  'phone',
  'standing_desk',
  'natural_light',
  'ac',
  'webcam',
  'soundproof',
  'lounge_seating',
  'dual_screen',
];

const FEATURE_LABELS: Record<string, string> = {
  projector:       'projector',
  whiteboard:      'whiteboard',
  tv:              'TV screen',
  video_conf:      'video conferencing',
  phone:           'conference phone',
  standing_desk:   'standing desks',
  natural_light:   'natural light',
  ac:              'air conditioning',
  webcam:          'webcam',
  soundproof:      'soundproofing',
  lounge_seating:  'lounge seating',
  dual_screen:     'dual screens',
};

const ROOM_TYPES: Record<number, string> = {
  2:  'Focus Pod',
  4:  'Small Meeting Room',
  6:  'Collaboration Room',
  8:  'Conference Room',
  10: 'Conference Room',
  12: 'Large Meeting Room',
  14: 'Large Meeting Room',
  16: 'Board Room',
  20: 'Training Room',
  24: 'Event Space',
  30: 'Auditorium',
};

function getRoomType(capacity: number): string {
  // Find exact match or closest smaller key
  const keys = Object.keys(ROOM_TYPES).map(Number).sort((a, b) => a - b);
  let best = keys[0];
  for (const k of keys) {
    if (k <= capacity) best = k;
  }
  return ROOM_TYPES[best];
}

function generateImages(name: string): string[] {
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  return [
    `https://picsum.photos/seed/${slug}/1200/700`,
    `https://picsum.photos/seed/${slug}-b/1200/700`,
    `https://picsum.photos/seed/${slug}-c/1200/700`,
  ];
}

function generateDescription(room: { name: string; capacity: number; features: string[] }): string {
  const type = getRoomType(room.capacity);
  const featureList = room.features.map((f) => FEATURE_LABELS[f] || f);
  const featureStr =
    featureList.length === 0
      ? ''
      : featureList.length === 1
        ? ` equipped with ${featureList[0]}`
        : ` equipped with ${featureList.slice(0, -1).join(', ')} and ${featureList[featureList.length - 1]}`;
  return `${room.name} is a modern ${room.capacity}-person ${type}${featureStr}. ` +
    `Ideal for ${room.capacity <= 4 ? 'focused work sessions and one-on-ones' : room.capacity <= 10 ? 'team meetings and collaborative sessions' : 'large presentations and company events'}.`;
}

function generateRooms(
  count: number,
): Array<Pick<RoomEntity, 'name' | 'capacity' | 'features' | 'images' | 'description' | 'timezone'>> {
  const rooms: Array<Pick<RoomEntity, 'name' | 'capacity' | 'features' | 'images' | 'description' | 'timezone'>> = [];
  for (let i = 0; i < count; i++) {
    const baseName = ROOM_NAMES[i % ROOM_NAMES.length];
    const series   = Math.floor(i / ROOM_NAMES.length) + 1;
    const name     = series === 1 ? baseName : `${baseName} ${series}`;
    const capacity = CAPACITIES[i % CAPACITIES.length];
    const timezone = TIMEZONES[i % TIMEZONES.length];

    // Mix 4–6 features per room using three different modular patterns so
    // consecutive rooms have clearly different feature sets.
    const features = ALL_FEATURES.filter((_, fi) => {
      const a = (i * 3 + fi * 7) % 11 < 4;
      const b = (i * 5 + fi * 2) % 13 < 5;
      return a || b;
    }).slice(0, 6);

    const images      = generateImages(name);
    const description = generateDescription({ name, capacity, features });
    rooms.push({ name, capacity, features, images, description, timezone });
  }
  return rooms;
}
// ── End seed data ───────────────────────────────────────────────────────────

@Injectable()
export class RoomsService implements OnModuleInit {
  private readonly logger = new Logger(RoomsService.name);

  constructor(
    @InjectRepository(RoomEntity)
    private readonly roomsRepo: Repository<RoomEntity>,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    private readonly metrics: MetricsService,
  ) {}

  async onModuleInit() {
    // Use a pinned QueryRunner so the pg_advisory_lock (session-level) stays
    // on the same connection for both the lock and the unlock calls.
    // This prevents the race where three API instances seed simultaneously.
    const LOCK_KEY     = 7_432_891;
    const queryRunner  = this.roomsRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    try {
      await queryRunner.query(`SELECT pg_advisory_lock($1)`, [LOCK_KEY]);
      try {
        await this.runInit(queryRunner);
      } finally {
        await queryRunner.query(`SELECT pg_advisory_unlock($1)`, [LOCK_KEY]);
      }
    } finally {
      await queryRunner.release();
    }
  }

  private async runInit(_queryRunner: import('typeorm').QueryRunner) {
    const seedCount = parseInt(process.env.SEED_ROOMS_COUNT || '500', 10);
    const count     = await this.roomsRepo.count();

    if (count < seedCount) {
      // Top up: generate all seedCount rooms and insert only those beyond
      // what the DB already has. Slicing by index keeps deterministic ordering
      // so existing rooms stay stable and only new ones are appended.
      const toInsert = generateRooms(seedCount).slice(count);
      for (let i = 0; i < toInsert.length; i += 50) {
        await this.roomsRepo.save(toInsert.slice(i, i + 50).map((r) => this.roomsRepo.create(r)));
      }
      this.logger.log({
        event:   'rooms.seeded',
        added:   toInsert.length,
        total:   count + toInsert.length,
        message: `Seeded ${toInsert.length} rooms (total: ${count + toInsert.length})`,
      });
    } else {
      // Backfill rooms missing images, descriptions, or timezones.
      // Load all rooms ordered by creation time so index-based assignment
      // stays consistent across restarts.
      const allRooms = await this.roomsRepo.find({ order: { createdAt: 'ASC' } });
      const needsUpdate = allRooms.filter(
        (r) => !r.images?.length || !r.description || r.timezone === null,
      );

      if (needsUpdate.length > 0) {
        for (const room of needsUpdate) {
          const idx = allRooms.indexOf(room);
          if (!room.images?.length) room.images = generateImages(room.name);
          if (!room.description)   room.description = generateDescription(room);
          if (room.timezone === null) room.timezone = TIMEZONES[idx % TIMEZONES.length];
        }
        for (let i = 0; i < needsUpdate.length; i += 50) {
          await this.roomsRepo.save(needsUpdate.slice(i, i + 50));
        }
        this.logger.log({
          event:   'rooms.backfill',
          count:   needsUpdate.length,
          message: `Backfilled images/description/timezone for ${needsUpdate.length} rooms`,
        });
      }
    }
  }

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
      const endISO   = opts.end.toISOString();
      const slotKey  = `hold:slot:${id}:${startISO}:${endISO}`;

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
    roomId:   r.id,
    name:     r.name,
    capacity: r.capacity,
    features: r.features,
    timezone: r.timezone ?? 'UTC',
    status:   'AVAILABLE' as const,
  };
}

function mapRoomDetail(r: RoomEntity, availabilityStatus: 'AVAILABLE' | 'HELD' | 'BOOKED') {
  return {
    roomId:             r.id,
    name:               r.name,
    capacity:           r.capacity,
    description:        r.description ?? '',
    features:           r.features,
    images:             r.images ?? [],
    timezone:           r.timezone ?? 'UTC',
    availabilityStatus,
  };
}
