import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { BookingEntity } from './entities/booking.entity';
import { IdempotencyKeyEntity } from './entities/idempotency-key.entity';
import { RoomEntity } from '../rooms/entities/room.entity';
import { HoldsService } from '../holds/holds.service';
import { MetricsService } from '../../common/metrics/metrics.service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** How long an idempotency record is authoritative. */
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateBookingParams {
  userId: string;
  holdId?: string;
  roomId?: string;
  start?: Date;
  end?: Date;
  notes?: string;
  idempotencyKey?: string;
}

interface BookingResult {
  bookingId: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class BookingsService implements OnModuleInit {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(BookingEntity)
    private readonly bookingsRepo: Repository<BookingEntity>,
    @InjectRepository(RoomEntity)
    private readonly roomsRepo: Repository<RoomEntity>,
    @InjectRepository(IdempotencyKeyEntity)
    private readonly idempotencyRepo: Repository<IdempotencyKeyEntity>,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    private readonly holdsService: HoldsService,
    private readonly metrics: MetricsService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // Module init — ensure DB-level constraints exist
  // ──────────────────────────────────────────────────────────────────────────

  async onModuleInit() {
    // btree_gist enables mixing uuid (=) with tstzrange (&&) in a single GIST index.
    await this.dataSource.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);

    // Exclusion constraint: overlapping CONFIRMED bookings for the same room are
    // physically impossible at the DB level — no application-layer check can be
    // bypassed, race-conditioned around, or replicated out of sync.
    await this.dataSource.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'bookings_no_overlap'
        ) THEN
          ALTER TABLE bookings
          ADD CONSTRAINT bookings_no_overlap
          EXCLUDE USING GIST (
            room_id WITH =,
            tstzrange(start_time, end_time, '[)') WITH &&
          )
          WHERE (status = 'CONFIRMED');
        END IF;
      END $$;
    `);

    // DB-level check prevents direct SQL inserts from writing invalid statuses.
    await this.dataSource.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'bookings_valid_status'
        ) THEN
          ALTER TABLE bookings
          ADD CONSTRAINT bookings_valid_status
          CHECK (status IN ('CONFIRMED', 'CANCELLED'));
        END IF;
      END $$;
    `);

    this.logger.log({ event: 'bookings.init', message: 'Exclusion constraint verified' });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // POST /bookings  (idempotent)
  // ──────────────────────────────────────────────────────────────────────────

  async createBooking(params: CreateBookingParams): Promise<BookingResult> {
    let { userId, holdId, roomId, start, end, notes, idempotencyKey } = params;

    // ── 1. Resolve hold → concrete roomId / start / end ──────────────────
    if (holdId) {
      const hold = await this.holdsService.getHold(holdId, userId);
      roomId = hold.roomId;
      start  = new Date(hold.start);
      end    = new Date(hold.end);
    }

    // ── 2. Input validation ───────────────────────────────────────────────
    if (!roomId || !start || !end) {
      throw new BadRequestException({ code: 'MISSING_FIELDS', message: 'roomId, start, and end are required' });
    }
    if (end <= start) {
      throw new BadRequestException({ code: 'INVALID_TIME_RANGE', message: 'end must be after start' });
    }

    // ── 3. Fast-path idempotency check (read-only, outside transaction) ───
    //
    // Most replays are caught here without touching the write path at all.
    // We only skip this when the response_code is NULL (in-flight) and fall
    // through to the transactional check below for the concurrent-duplicate edge
    // case.
    if (idempotencyKey) {
      const existing = await this.idempotencyRepo.findOne({ where: { idempotencyKey, userId } });
      if (existing) {
        if (existing.responseCode !== null) {
          // Already completed — replay exact original outcome
          return this.replayIdempotentResponse(existing.responseCode, existing.responseBody!);
        }
        // responseCode IS NULL → the first request is still in-flight.
        // Client should back off and retry after ~1 s.
        throw new ServiceUnavailableException({
          code: 'IDEMPOTENT_REQUEST_IN_PROGRESS',
          message: 'A request with this Idempotency-Key is already being processed. Retry after 1 second.',
        });
      }
    }

    // ── 4. Verify room exists (pre-flight, avoids starting a transaction for
    //      an obviously invalid roomId) ────────────────────────────────────
    const room = await this.roomsRepo.findOne({ where: { id: roomId } });
    if (!room) {
      this.logger.warn({ event: 'booking.room_not_found', roomId, userId });
      throw new NotFoundException({ code: 'ROOM_NOT_FOUND', message: 'Room not found' });
    }

    // ── 5. Atomic booking + idempotency record ────────────────────────────
    //
    // Design:  booking row  AND  idempotency record are written in a single
    // transaction.  Either both commit or neither does.  This eliminates the
    // crash-window where the booking commits but the idempotency record does
    // not, which would cause a retry to attempt a second booking.
    //
    //   BEGIN
    //     INSERT idempotency_keys ... (NULL response) ON CONFLICT DO NOTHING
    //     → if 0 rows: key was already claimed (concurrent duplicate)
    //       → SELECT existing record, replay or return in-flight error
    //     INSERT bookings
    //     UPDATE idempotency_keys SET response_code=201, response_body=...
    //   COMMIT
    //
    // On 23P01 (booking overlap) the transaction rolls back automatically.
    // We then record the failure in a *separate* INSERT outside the
    // rolled-back transaction so future replays receive the same 409.

    let result: BookingResult;
    try {
      result = await this.dataSource.transaction(async (manager) => {
        // 5a. Claim idempotency key inside the transaction ─────────────────
        if (idempotencyKey) {
          const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS);
          const claimed = await this.claimIdempotencyKey(manager, idempotencyKey, userId, expiresAt);

          if (!claimed) {
            // Another concurrent request already claimed this key.
            // Read what it stored (may still be NULL if truly concurrent).
            const existing = await manager
              .getRepository(IdempotencyKeyEntity)
              .findOne({ where: { idempotencyKey, userId } });

            if (!existing || existing.responseCode === null) {
              // In-flight concurrent duplicate — cannot wait inside a transaction
              throw new ServiceUnavailableException({
                code: 'IDEMPOTENT_REQUEST_IN_PROGRESS',
                message: 'A request with this Idempotency-Key is already being processed. Retry after 1 second.',
              });
            }
            return this.replayIdempotentResponse(existing.responseCode, existing.responseBody!);
          }
        }

        // 5b. Insert the booking ───────────────────────────────────────────
        //
        // The PostgreSQL exclusion constraint (bookings_no_overlap) prevents
        // overlapping CONFIRMED bookings at the DB level.  We attempt the
        // insert and let the constraint raise 23P01 if needed.
        const booking = manager.getRepository(BookingEntity).create({
          roomId,
          userId,
          startTime: start,
          endTime:   end,
          notes:     notes ?? null,
          status:    'CONFIRMED',
        });
        const saved = await manager.getRepository(BookingEntity).save(booking);
        this.metrics.recordBooking('created');

        const bookingResult: BookingResult = { bookingId: saved.id, status: saved.status };

        // 5c. Seal the idempotency record with the success response ────────
        //
        // Same transaction: if the booking commit fails for any reason, the
        // idempotency record also rolls back, keeping the two in sync.
        if (idempotencyKey) {
          await manager
            .getRepository(IdempotencyKeyEntity)
            .update({ idempotencyKey, userId }, { responseCode: 201, responseBody: bookingResult });
        }

        return bookingResult;
      });
    } catch (err: any) {
      if (err.code === '23P01') {
        // ── Booking conflict ───────────────────────────────────────────────
        //
        // The transaction has already rolled back.  Persist the failure
        // outcome so future replays with the same key get a consistent 409
        // instead of re-executing.  orIgnore() handles the case where two
        // concurrent requests both fail and race to write this record.
        this.metrics.recordBooking('conflict');
        this.logger.warn({
          event:   'booking.conflict',
          roomId,
          start:   start?.toISOString(),
          end:     end?.toISOString(),
          message: 'Booking conflict — slot already taken',
        });

        if (idempotencyKey) {
          const conflictBody = { code: 'BOOKING_CONFLICT', message: 'Room already booked for this time range' };
          await this.persistIdempotencyFailure(idempotencyKey, userId, 409, conflictBody);
        }

        throw new ConflictException({ code: 'BOOKING_CONFLICT', message: 'Room already booked for this time range' });
      }

      // Non-constraint errors (connection loss, timeout, etc.) — idempotency
      // key stays NULL (in-flight), which causes the next retry to get
      // IDEMPOTENT_REQUEST_IN_PROGRESS.  A cleanup job should prune stale
      // in-flight keys older than a few minutes.
      this.logger.error({ event: 'booking.db_error', roomId, userId, message: err.message }, err.stack);
      throw err;
    }

    this.logger.log({
      event:     'booking.created',
      bookingId: result.bookingId,
      roomId,
      userId,
      message:   'Booking created',
    });

    // ── 6. Async side effects ─────────────────────────────────────────────
    //
    // Booking persistence is the authoritative operation and has already
    // committed.  Everything below is a side effect:
    //
    //   • Hold consumption  — if it fails, the hold expires naturally (5 min)
    //   • Cache invalidation — stale cache is recoverable; a miss just hits the DB
    //   • Notifications     — email / analytics would go here via a message queue
    //
    // None of these may roll back or reject the booking.  They run
    // fire-and-forget so the HTTP response is returned immediately.
    this.dispatchSideEffects({ holdId, roomId, start, end, bookingId: result.bookingId, userId });

    return result;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GET /bookings/me
  // ──────────────────────────────────────────────────────────────────────────

  async getMyBookings(userId: string) {
    const bookings = await this.bookingsRepo.find({
      where:     { userId },
      relations: ['room'],
      order:     { createdAt: 'DESC' },
    });
    return bookings.map(formatBooking);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GET /bookings/:id
  // ──────────────────────────────────────────────────────────────────────────

  async getBooking(id: string): Promise<BookingEntity> {
    const b = await this.bookingsRepo.findOne({ where: { id } });
    if (!b) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found' });
    }
    return b;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DELETE /bookings/:id  (soft-cancel)
  // ──────────────────────────────────────────────────────────────────────────

  async cancelBooking(id: string, userId: string) {
    const b = await this.bookingsRepo.findOne({ where: { id } });
    if (!b) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found' });
    }
    if (b.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Access denied' });
    }
    if (b.status === 'CANCELLED') {
      throw new ConflictException({ code: 'BOOKING_ALREADY_CANCELLED', message: 'Booking is already cancelled' });
    }

    b.status = 'CANCELLED';
    const saved = await this.bookingsRepo.save(b);
    this.metrics.recordBooking('cancelled');
    this.logger.log({ event: 'booking.cancelled', bookingId: id, roomId: b.roomId, userId });

    // Cache invalidation is non-critical — fire and forget
    this.invalidateRoomsCache(b.roomId).catch((err) =>
      this.logger.warn({ event: 'booking.cache_invalidation_failed', message: err?.message }),
    );

    return formatBooking(saved);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Attempts to INSERT an idempotency_key row with NULL response fields.
   * Returns `true` if the row was inserted (we own this request),
   * `false` if the key already existed (duplicate or concurrent).
   *
   * Using raw SQL so the INSERT ... ON CONFLICT DO NOTHING RETURNING id
   * pattern is expressed clearly and atomically — TypeORM's QueryBuilder
   * does not support RETURNING with orIgnore() cleanly.
   */
  private async claimIdempotencyKey(
    manager: EntityManager,
    idempotencyKey: string,
    userId: string,
    expiresAt: Date,
  ): Promise<boolean> {
    const rows: Array<{ id: string }> = await manager.query(
      `INSERT INTO idempotency_keys (idempotency_key, user_id, response_code, response_body, expires_at)
       VALUES ($1, $2, NULL, NULL, $3)
       ON CONFLICT (idempotency_key, user_id) DO NOTHING
       RETURNING id`,
      [idempotencyKey, userId, expiresAt],
    );
    return rows.length > 0;
  }

  /**
   * Persists a failure outcome for a given idempotency key.
   * Called outside the (already rolled-back) booking transaction.
   *
   * orIgnore() is intentional: if two concurrent requests both fail with a
   * conflict, both will try to save the failure record — only the first
   * succeeds, which is correct.
   */
  private async persistIdempotencyFailure(
    idempotencyKey: string,
    userId: string,
    responseCode: number,
    responseBody: object,
  ): Promise<void> {
    try {
      await this.idempotencyRepo
        .createQueryBuilder()
        .insert()
        .into(IdempotencyKeyEntity)
        .values({
          idempotencyKey,
          userId,
          responseCode,
          responseBody,
          expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
        })
        .orIgnore()
        .execute();
    } catch (err: any) {
      // Non-critical: a replay of this key may re-execute, but the DB
      // constraint prevents actual damage (no double booking).
      this.logger.warn({ event: 'booking.idempotency_persist_failed', message: err?.message });
    }
  }

  /**
   * Replays a previously stored response.
   *
   * For 201 responses, returns the success body normally (the controller
   * will send HTTP 201 as usual).
   *
   * For 409 responses, throws ConflictException so the controller returns
   * HTTP 409 — identical to the original response the client received.
   */
  private replayIdempotentResponse(responseCode: number, responseBody: object): BookingResult {
    this.logger.log({ event: 'booking.idempotent_replay', responseCode });

    if (responseCode === 201) {
      return responseBody as BookingResult;
    }
    if (responseCode === 409) {
      throw new ConflictException(responseBody);
    }
    // Defensive fallback for any other stored failure codes
    throw new BadRequestException(responseBody);
  }

  /**
   * Fires side effects after a successful booking commit.
   * All errors are caught and logged — none may propagate to the caller.
   *
   * Extend this method with:
   *   - Email confirmation: this.mailerQueue.add({ type: 'BOOKING_CONFIRMED', ... })
   *   - Analytics events:  this.analyticsService.track(...)
   *   - Push notifications
   */
  private dispatchSideEffects(ctx: {
    holdId?: string;
    roomId?: string;
    start?: Date;
    end?: Date;
    bookingId: string;
    userId: string;
  }): void {
    const { holdId, roomId, start, end } = ctx;

    // Consume hold — frees the Redis slot early (hold expires naturally if this fails)
    if (holdId && roomId && start && end) {
      this.holdsService
        .consumeHold(holdId, roomId, start.toISOString(), end.toISOString())
        .catch((err) => this.logger.warn({ event: 'booking.hold_consume_failed', message: err?.message }));
    }

    // Invalidate search / availability cache
    this.invalidateRoomsCache(roomId).catch((err) =>
      this.logger.warn({ event: 'booking.cache_invalidation_failed', message: err?.message }),
    );

    // Future: dispatch notification / analytics event via message queue
    // this.notificationQueue.add({ type: 'BOOKING_CONFIRMED', bookingId, userId });
  }

  private async invalidateRoomsCache(roomId?: string): Promise<void> {
    // Avoid KEYS wildcard scans (O(N), blocks Redis). Instead:
    //  • Delete the known list key and the affected room's detail key immediately.
    //  • Search results have a 30s TTL and expire on their own — acceptable staleness
    //    for a booking platform where the DB exclusion constraint is authoritative.
    //
    // Check isReady before issuing commands: node-redis queues commands in an
    // offline buffer while reconnecting, which would cause this to hang rather
    // than fail fast.
    try {
      const client = (this.cache as any).store?.client;
      if (client && !client.isReady) return;
      if (roomId) await this.cache.del(`rooms:detail:${roomId}`);
      await this.cache.del('rooms:list');
    } catch (err: any) {
      this.logger.warn({ event: 'cache.invalidation_failed', message: err?.message });
    }
  }
}

// ---------------------------------------------------------------------------
// Formatter (keep out of the class to avoid accidental `this` capture)
// ---------------------------------------------------------------------------

function formatBooking(b: BookingEntity) {
  return {
    bookingId: b.id,
    roomId:    b.roomId,
    roomName:  b.room?.name,
    userId:    b.userId,
    start:     b.startTime,
    end:       b.endTime,
    status:    b.status,
    notes:     b.notes ?? undefined,
    createdAt: b.createdAt,
  };
}