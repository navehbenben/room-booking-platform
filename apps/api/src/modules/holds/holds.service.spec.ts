import { ConflictException, ForbiddenException, GoneException, ServiceUnavailableException } from '@nestjs/common';
import { HoldsService } from './holds.service';

describe('HoldsService', () => {
  let service: HoldsService;
  let mockCache: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let mockBookingsRepo: { createQueryBuilder: jest.Mock };
  let mockMetrics: { recordHold: jest.Mock };
  let mockQb: { where: jest.Mock; andWhere: jest.Mock; getOne: jest.Mock };

  const start = new Date('2024-06-01T10:00:00Z');
  const end = new Date('2024-06-01T11:00:00Z');

  beforeEach(() => {
    jest.clearAllMocks();

    mockQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };
    mockBookingsRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    };
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    mockMetrics = {
      recordHold: jest.fn(),
    };

    service = new HoldsService(mockCache as any, mockBookingsRepo as any, mockMetrics as any);
  });

  describe('createHold', () => {
    it('throws ConflictException when end <= start', async () => {
      await expect(service.createHold('u1', 'r1', end, start)).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws ServiceUnavailableException when cache.get throws', async () => {
      mockCache.get.mockRejectedValue(new Error('Redis connection refused'));

      await expect(service.createHold('u1', 'r1', start, end)).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('throws ConflictException with ALREADY_HELD when slot is already in cache', async () => {
      mockCache.get.mockResolvedValue('other-hold-id');

      await expect(service.createHold('u1', 'r1', start, end)).rejects.toMatchObject({
        response: { code: 'ALREADY_HELD' },
      });
    });

    it('throws ConflictException with ROOM_BOOKED when DB overlap found', async () => {
      mockCache.get.mockResolvedValue(null);
      mockQb.getOne.mockResolvedValue({ id: 'b1' });

      await expect(service.createHold('u1', 'r1', start, end)).rejects.toMatchObject({
        response: { code: 'ROOM_BOOKED' },
      });
    });

    it('throws ServiceUnavailableException when cache.set throws', async () => {
      mockCache.get.mockResolvedValue(null);
      mockQb.getOne.mockResolvedValue(null);
      mockCache.set.mockRejectedValue(new Error('Redis write error'));

      await expect(service.createHold('u1', 'r1', start, end)).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('returns holdId and expiresAt on success', async () => {
      mockCache.get.mockResolvedValue(null);
      mockQb.getOne.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(undefined);

      const result = await service.createHold('u1', 'r1', start, end);

      expect(typeof result.holdId).toBe('string');
      expect(result.holdId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
      expect(typeof result.expiresAt).toBe('string');
    });

    it('stores hold data and slot key in cache with TTL', async () => {
      mockCache.get.mockResolvedValue(null);
      mockQb.getOne.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(undefined);

      const result = await service.createHold('u1', 'r1', start, end);

      expect(mockCache.set).toHaveBeenCalledWith(
        `hold:${result.holdId}`,
        expect.objectContaining({ holdId: result.holdId, userId: 'u1', roomId: 'r1' }),
        300_000,
      );
      expect(mockCache.set).toHaveBeenCalledWith(expect.stringContaining('hold:slot:r1:'), result.holdId, 300_000);
    });
  });

  describe('getHold', () => {
    it('throws ServiceUnavailableException when cache throws', async () => {
      mockCache.get.mockRejectedValue(new Error('Redis down'));

      await expect(service.getHold('hold-1', 'u1')).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('throws GoneException when hold not found in cache', async () => {
      mockCache.get.mockResolvedValue(null);

      await expect(service.getHold('hold-1', 'u1')).rejects.toBeInstanceOf(GoneException);
    });

    it('throws ForbiddenException when hold belongs to a different user', async () => {
      mockCache.get.mockResolvedValue({ holdId: 'h1', userId: 'u2', roomId: 'r1', start: '', end: '', expiresAt: '' });

      await expect(service.getHold('h1', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns hold data when userId matches', async () => {
      const hold = { holdId: 'h1', userId: 'u1', roomId: 'r1', start: 'start', end: 'end', expiresAt: 'exp' };
      mockCache.get.mockResolvedValue(hold);

      const result = await service.getHold('h1', 'u1');

      expect(result.holdId).toBe('h1');
      expect(result.roomId).toBe('r1');
    });
  });

  describe('consumeHold', () => {
    it('deletes hold key and slot key from cache', async () => {
      mockCache.del.mockResolvedValue(undefined);

      await service.consumeHold('h1', 'r1', '2024-06-01T10:00:00Z', '2024-06-01T11:00:00Z');

      expect(mockCache.del).toHaveBeenCalledWith('hold:h1');
      expect(mockCache.del).toHaveBeenCalledWith('hold:slot:r1:2024-06-01T10:00:00Z:2024-06-01T11:00:00Z');
    });

    it('swallows Redis errors silently (non-fatal)', async () => {
      mockCache.del.mockRejectedValue(new Error('Redis unavailable'));

      await expect(service.consumeHold('h1', 'r1', '', '')).resolves.toBeUndefined();
    });
  });
});
