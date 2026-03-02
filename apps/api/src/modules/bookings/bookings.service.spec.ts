import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const FUTURE_START = new Date('2099-06-01T10:00:00Z');
const FUTURE_END   = new Date('2099-06-01T11:00:00Z');

const BASE_PARAMS = {
  userId: 'user-1',
  roomId: 'room-1',
  start:  FUTURE_START,
  end:    FUTURE_END,
};

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let service: BookingsService;
let mockDataSource: { query: jest.Mock; transaction: jest.Mock };
let mockBookingsRepo: {
  find: jest.Mock;
  findOne: jest.Mock;
  save: jest.Mock;
};
let mockRoomsRepo: { findOne: jest.Mock };
let mockIdempotencyRepo: {
  findOne: jest.Mock;
  createQueryBuilder: jest.Mock;
  update: jest.Mock;
};
let mockCache: { get: jest.Mock; set: jest.Mock; del: jest.Mock; store?: any };
let mockHoldsService: { getHold: jest.Mock; consumeHold: jest.Mock };
let mockMetrics: { recordBooking: jest.Mock };
let mockTxBookingsRepo: { create: jest.Mock; save: jest.Mock };
let mockTxIdempRepo: { findOne: jest.Mock; update: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();

  mockTxBookingsRepo = {
    create: jest.fn(),
    save:   jest.fn(),
  };

  mockTxIdempRepo = {
    findOne: jest.fn().mockResolvedValue(null),
    update:  jest.fn().mockResolvedValue({}),
  };

  // Manager returned inside transactions — routes getRepository() to the
  // per-transaction mocks so we can assert exactly what was called.
  const txManager = {
    getRepository: jest.fn((entity) => {
      const name = entity?.name ?? '';
      if (name === 'BookingEntity')        return mockTxBookingsRepo;
      if (name === 'IdempotencyKeyEntity') return mockTxIdempRepo;
      return {};
    }),
    query: jest.fn().mockResolvedValue([{ id: 'idem-new' }]), // claimIdempotencyKey succeeds
  };

  mockDataSource = {
    query: jest.fn().mockResolvedValue(undefined),
    transaction: jest
      .fn()
      .mockImplementation(async (cb: (manager: any) => any) => cb(txManager)),
  };

  const mockIdempQb = {
    insert:  jest.fn().mockReturnThis(),
    into:    jest.fn().mockReturnThis(),
    values:  jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({}),
  };

  mockBookingsRepo = {
    find:    jest.fn(),
    findOne: jest.fn(),
    save:    jest.fn(),
  };
  mockRoomsRepo    = { findOne: jest.fn() };
  mockIdempotencyRepo = {
    findOne:          jest.fn().mockResolvedValue(null),
    createQueryBuilder: jest.fn().mockReturnValue(mockIdempQb),
    update:           jest.fn().mockResolvedValue({}),
  };
  mockCache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn(),
    del: jest.fn().mockResolvedValue(undefined),
  };
  mockHoldsService = {
    getHold:     jest.fn(),
    consumeHold: jest.fn().mockResolvedValue(undefined),
  };
  mockMetrics = { recordBooking: jest.fn() };

  service = new BookingsService(
    mockDataSource as any,
    mockBookingsRepo as any,
    mockRoomsRepo as any,
    mockIdempotencyRepo as any,
    mockCache as any,
    mockHoldsService as any,
    mockMetrics as any,
  );
});

// ---------------------------------------------------------------------------
// createBooking
// ---------------------------------------------------------------------------

describe('createBooking', () => {

  // ── Validation ────────────────────────────────────────────────────────────

  it('throws BadRequestException when roomId/start/end are missing', async () => {
    await expect(service.createBooking({ userId: 'u1' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException when end <= start', async () => {
    mockRoomsRepo.findOne.mockResolvedValue({ id: 'room-1' });
    await expect(
      service.createBooking({ ...BASE_PARAMS, end: FUTURE_START }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException when room does not exist', async () => {
    mockRoomsRepo.findOne.mockResolvedValue(null);
    await expect(service.createBooking(BASE_PARAMS)).rejects.toBeInstanceOf(NotFoundException);
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('creates booking and returns bookingId + status', async () => {
    mockRoomsRepo.findOne.mockResolvedValue({ id: 'room-1' });
    const saved = { id: 'booking-1', status: 'CONFIRMED' };
    mockTxBookingsRepo.create.mockReturnValue(saved);
    mockTxBookingsRepo.save.mockResolvedValue(saved);

    const result = await service.createBooking(BASE_PARAMS);

    expect(result.bookingId).toBe('booking-1');
    expect(result.status).toBe('CONFIRMED');
    expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('records a metric on successful creation', async () => {
    mockRoomsRepo.findOne.mockResolvedValue({ id: 'room-1' });
    const saved = { id: 'booking-1', status: 'CONFIRMED' };
    mockTxBookingsRepo.create.mockReturnValue(saved);
    mockTxBookingsRepo.save.mockResolvedValue(saved);

    await service.createBooking(BASE_PARAMS);

    expect(mockMetrics.recordBooking).toHaveBeenCalledWith('created');
  });

  // ── Overlap / exclusion constraint ────────────────────────────────────────

  it('maps 23P01 exclusion-constraint error to ConflictException', async () => {
    mockRoomsRepo.findOne.mockResolvedValue({ id: 'room-1' });
    const dbErr: any = new Error('exclusion_violation');
    dbErr.code = '23P01';
    mockTxBookingsRepo.create.mockReturnValue({});
    mockTxBookingsRepo.save.mockRejectedValue(dbErr);

    await expect(service.createBooking(BASE_PARAMS)).rejects.toMatchObject({
      response: { code: 'BOOKING_CONFLICT' },
    });
    expect(mockMetrics.recordBooking).toHaveBeenCalledWith('conflict');
  });

  it('re-throws non-23P01 DB errors', async () => {
    mockRoomsRepo.findOne.mockResolvedValue({ id: 'room-1' });
    mockTxBookingsRepo.create.mockReturnValue({});
    mockTxBookingsRepo.save.mockRejectedValue(new Error('connection lost'));

    await expect(service.createBooking(BASE_PARAMS)).rejects.toThrow('connection lost');
  });

  // ── Idempotency — success replay ──────────────────────────────────────────

  it('replays a stored 201 response without hitting the DB on retry', async () => {
    const storedBody = { bookingId: 'booking-cached', status: 'CONFIRMED' };
    mockIdempotencyRepo.findOne.mockResolvedValue({
      idempotencyKey: 'key-1',
      userId:         'user-1',
      responseCode:   201,
      responseBody:   storedBody,
      createdAt:      new Date(),
    });

    const result = await service.createBooking({ ...BASE_PARAMS, idempotencyKey: 'key-1' });

    expect(result.bookingId).toBe('booking-cached');
    expect(mockDataSource.transaction).not.toHaveBeenCalled();
    expect(mockRoomsRepo.findOne).not.toHaveBeenCalled();
  });

  // ── Idempotency — failure replay ──────────────────────────────────────────

  it('replays a stored 409 response as ConflictException without re-executing', async () => {
    const conflictBody = { code: 'BOOKING_CONFLICT', message: 'Room already booked for this time range' };
    mockIdempotencyRepo.findOne.mockResolvedValue({
      idempotencyKey: 'key-conflict',
      userId:         'user-1',
      responseCode:   409,
      responseBody:   conflictBody,
      createdAt:      new Date(),
    });

    await expect(
      service.createBooking({ ...BASE_PARAMS, idempotencyKey: 'key-conflict' }),
    ).rejects.toMatchObject({ response: { code: 'BOOKING_CONFLICT' } });

    // Must not re-execute the booking path
    expect(mockDataSource.transaction).not.toHaveBeenCalled();
  });

  it('saves idempotency failure record when a booking conflict occurs', async () => {
    mockRoomsRepo.findOne.mockResolvedValue({ id: 'room-1' });
    const dbErr: any = new Error('exclusion_violation');
    dbErr.code = '23P01';
    mockTxBookingsRepo.create.mockReturnValue({});
    mockTxBookingsRepo.save.mockRejectedValue(dbErr);

    await expect(
      service.createBooking({ ...BASE_PARAMS, idempotencyKey: 'key-new' }),
    ).rejects.toMatchObject({ response: { code: 'BOOKING_CONFLICT' } });

    // persistIdempotencyFailure must have been called
    const qb = mockIdempotencyRepo.createQueryBuilder();
    expect(qb.execute).toHaveBeenCalledTimes(1);
  });

  // ── Idempotency — in-flight ───────────────────────────────────────────────

  it('returns 503 when the same key is already in-flight (responseCode = null)', async () => {
    mockIdempotencyRepo.findOne.mockResolvedValue({
      idempotencyKey: 'key-inflight',
      userId:         'user-1',
      responseCode:   null,
      responseBody:   null,
      createdAt:      new Date(),
    });

    await expect(
      service.createBooking({ ...BASE_PARAMS, idempotencyKey: 'key-inflight' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(mockDataSource.transaction).not.toHaveBeenCalled();
  });

  // ── Hold resolution ───────────────────────────────────────────────────────

  it('resolves hold when holdId is provided', async () => {
    const hold = { roomId: 'room-1', start: FUTURE_START.toISOString(), end: FUTURE_END.toISOString() };
    mockHoldsService.getHold.mockResolvedValue(hold);
    mockRoomsRepo.findOne.mockResolvedValue({ id: 'room-1' });
    const saved = { id: 'booking-1', status: 'CONFIRMED' };
    mockTxBookingsRepo.create.mockReturnValue(saved);
    mockTxBookingsRepo.save.mockResolvedValue(saved);

    await service.createBooking({ userId: 'user-1', holdId: 'hold-1' });

    expect(mockHoldsService.getHold).toHaveBeenCalledWith('hold-1', 'user-1');
  });

  it('consumes the hold asynchronously after a successful booking', async () => {
    const hold = { roomId: 'room-1', start: FUTURE_START.toISOString(), end: FUTURE_END.toISOString() };
    mockHoldsService.getHold.mockResolvedValue(hold);
    mockRoomsRepo.findOne.mockResolvedValue({ id: 'room-1' });
    const saved = { id: 'booking-1', status: 'CONFIRMED' };
    mockTxBookingsRepo.create.mockReturnValue(saved);
    mockTxBookingsRepo.save.mockResolvedValue(saved);

    await service.createBooking({ userId: 'user-1', holdId: 'hold-1' });

    // consumeHold is fire-and-forget — give the micro-task queue a tick to run
    await Promise.resolve();
    expect(mockHoldsService.consumeHold).toHaveBeenCalledWith(
      'hold-1',
      'room-1',
      FUTURE_START.toISOString(),
      FUTURE_END.toISOString(),
    );
  });

  // ── Cache invalidation ────────────────────────────────────────────────────

  it('invalidates rooms:list cache after successful booking', async () => {
    mockRoomsRepo.findOne.mockResolvedValue({ id: 'room-1' });
    const saved = { id: 'booking-1', status: 'CONFIRMED' };
    mockTxBookingsRepo.create.mockReturnValue(saved);
    mockTxBookingsRepo.save.mockResolvedValue(saved);

    await service.createBooking(BASE_PARAMS);
    await Promise.resolve(); // let fire-and-forget run

    expect(mockCache.del).toHaveBeenCalledWith('rooms:list');
  });

  it('does NOT fail when cache invalidation throws', async () => {
    mockRoomsRepo.findOne.mockResolvedValue({ id: 'room-1' });
    const saved = { id: 'booking-1', status: 'CONFIRMED' };
    mockTxBookingsRepo.create.mockReturnValue(saved);
    mockTxBookingsRepo.save.mockResolvedValue(saved);
    mockCache.del.mockRejectedValue(new Error('Redis down'));

    // Should resolve cleanly — cache errors must not surface to the caller
    await expect(service.createBooking(BASE_PARAMS)).resolves.toMatchObject({
      bookingId: 'booking-1',
    });
  });
});

// ---------------------------------------------------------------------------
// getMyBookings
// ---------------------------------------------------------------------------

describe('getMyBookings', () => {
  it('returns formatted bookings for the given user', async () => {
    const b = {
      id:        'booking-1',
      roomId:    'room-1',
      userId:    'user-1',
      startTime: new Date(),
      endTime:   new Date(),
      status:    'CONFIRMED',
      notes:     null,
      createdAt: new Date(),
      room:      { name: 'Boardroom A' },
    };
    mockBookingsRepo.find.mockResolvedValue([b]);

    const result = await service.getMyBookings('user-1');

    expect(result[0].bookingId).toBe('booking-1');
    expect(result[0].roomName).toBe('Boardroom A');
    expect(result[0].status).toBe('CONFIRMED');
    expect(mockBookingsRepo.find).toHaveBeenCalledWith({
      where:     { userId: 'user-1' },
      relations: ['room'],
      order:     { createdAt: 'DESC' },
    });
  });

  it('returns empty array when user has no bookings', async () => {
    mockBookingsRepo.find.mockResolvedValue([]);
    await expect(service.getMyBookings('user-1')).resolves.toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getBooking
// ---------------------------------------------------------------------------

describe('getBooking', () => {
  it('throws NotFoundException when booking is not found', async () => {
    mockBookingsRepo.findOne.mockResolvedValue(null);
    await expect(service.getBooking('booking-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the booking entity when found', async () => {
    const b = { id: 'booking-1', status: 'CONFIRMED' };
    mockBookingsRepo.findOne.mockResolvedValue(b);
    await expect(service.getBooking('booking-1')).resolves.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// cancelBooking
// ---------------------------------------------------------------------------

describe('cancelBooking', () => {
  it('throws NotFoundException when booking is not found', async () => {
    mockBookingsRepo.findOne.mockResolvedValue(null);
    await expect(service.cancelBooking('booking-1', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ForbiddenException when booking belongs to another user', async () => {
    mockBookingsRepo.findOne.mockResolvedValue({ id: 'booking-1', userId: 'user-2', status: 'CONFIRMED' });
    await expect(service.cancelBooking('booking-1', 'user-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws ConflictException when booking is already cancelled', async () => {
    mockBookingsRepo.findOne.mockResolvedValue({ id: 'booking-1', userId: 'user-1', status: 'CANCELLED' });
    await expect(service.cancelBooking('booking-1', 'user-1')).rejects.toMatchObject({
      response: { code: 'BOOKING_ALREADY_CANCELLED' },
    });
  });

  it('sets status to CANCELLED and returns the formatted booking', async () => {
    const b = {
      id:        'booking-1',
      userId:    'user-1',
      status:    'CONFIRMED',
      roomId:    'room-1',
      startTime: new Date(),
      endTime:   new Date(),
      notes:     null,
      createdAt: new Date(),
    };
    mockBookingsRepo.findOne.mockResolvedValue(b);
    mockBookingsRepo.save.mockResolvedValue({ ...b, status: 'CANCELLED' });

    const result = await service.cancelBooking('booking-1', 'user-1');

    expect(b.status).toBe('CANCELLED');           // mutated in-place before save
    expect(result.status).toBe('CANCELLED');
    expect(result.bookingId).toBe('booking-1');
  });

  it('records a cancelled metric', async () => {
    const b = {
      id: 'booking-1', userId: 'user-1', status: 'CONFIRMED',
      roomId: 'room-1', startTime: new Date(), endTime: new Date(),
      notes: null, createdAt: new Date(),
    };
    mockBookingsRepo.findOne.mockResolvedValue(b);
    mockBookingsRepo.save.mockResolvedValue({ ...b, status: 'CANCELLED' });

    await service.cancelBooking('booking-1', 'user-1');

    expect(mockMetrics.recordBooking).toHaveBeenCalledWith('cancelled');
  });

  it('does NOT fail when cache invalidation throws on cancellation', async () => {
    const b = {
      id: 'booking-1', userId: 'user-1', status: 'CONFIRMED',
      roomId: 'room-1', startTime: new Date(), endTime: new Date(),
      notes: null, createdAt: new Date(),
    };
    mockBookingsRepo.findOne.mockResolvedValue(b);
    mockBookingsRepo.save.mockResolvedValue({ ...b, status: 'CANCELLED' });
    mockCache.del.mockRejectedValue(new Error('Redis down'));

    await expect(service.cancelBooking('booking-1', 'user-1')).resolves.toMatchObject({
      status: 'CANCELLED',
    });
  });
});