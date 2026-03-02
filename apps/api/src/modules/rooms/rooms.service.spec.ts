import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RoomsService } from './rooms.service';

describe('RoomsService', () => {
  let service: RoomsService;
  let mockRoomsRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    count: jest.Mock;
    query: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let mockCache: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let mockMetrics: { recordCacheOp: jest.Mock };
  let mockQb: {
    where: jest.Mock;
    andWhere: jest.Mock;
    leftJoin: jest.Mock;
    innerJoin: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getOne: jest.Mock;
    getManyAndCount: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getManyAndCount: jest.fn(),
    };
    mockRoomsRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      query: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    };
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    mockMetrics = {
      recordCacheOp: jest.fn(),
    };

    service = new RoomsService(mockRoomsRepo as any, mockCache as any, mockMetrics as any);
  });

  describe('listRooms', () => {
    it('returns cached value on cache hit and records hit metric', async () => {
      const rooms = [{ id: 'r1', name: 'Room A' }];
      mockCache.get.mockResolvedValue(rooms);

      const result = await service.listRooms();

      expect(result).toBe(rooms);
      expect(mockRoomsRepo.find).not.toHaveBeenCalled();
      expect(mockMetrics.recordCacheOp).toHaveBeenCalledWith('list', 'hit');
    });

    it('fetches from DB, caches with 5min TTL, and records miss metric on cache miss', async () => {
      const rooms = [{ id: 'r1', name: 'Room A' }];
      mockCache.get.mockResolvedValue(null);
      mockRoomsRepo.find.mockResolvedValue(rooms);

      const result = await service.listRooms();

      expect(result).toBe(rooms);
      expect(mockRoomsRepo.find).toHaveBeenCalledWith({ order: { capacity: 'ASC' } });
      expect(mockCache.set).toHaveBeenCalledWith('rooms:list', rooms, 300_000);
      expect(mockMetrics.recordCacheOp).toHaveBeenCalledWith('list', 'miss');
    });
  });

  describe('getRoom', () => {
    it('returns cached detail on cache hit', async () => {
      const cached = { roomId: 'r1', availabilityStatus: 'AVAILABLE' };
      mockCache.get.mockResolvedValue(cached);

      const result = await service.getRoom('r1');

      expect(result).toBe(cached);
      expect(mockRoomsRepo.findOne).not.toHaveBeenCalled();
      expect(mockMetrics.recordCacheOp).toHaveBeenCalledWith('detail', 'hit');
    });

    it('throws NotFoundException when room does not exist in DB', async () => {
      mockCache.get.mockResolvedValue(null);
      mockRoomsRepo.findOne.mockResolvedValue(null);

      await expect(service.getRoom('unknown')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns AVAILABLE status when no time opts provided', async () => {
      const room = { id: 'r1', name: 'Room A', capacity: 4, features: [], images: [], description: 'desc' };
      mockCache.get.mockResolvedValue(null);
      mockRoomsRepo.findOne.mockResolvedValue(room);

      const result = await service.getRoom('r1');

      expect(result.availabilityStatus).toBe('AVAILABLE');
    });

    it('returns HELD status when slot is present in Redis', async () => {
      const room = { id: 'r1', name: 'Room A', capacity: 4, features: [], images: [], description: 'desc' };
      mockCache.get
        .mockResolvedValueOnce(null) // detail cache miss
        .mockResolvedValueOnce('hold-xyz'); // slot key hit

      mockRoomsRepo.findOne.mockResolvedValue(room);

      const start = new Date('2024-06-01T10:00:00Z');
      const end = new Date('2024-06-01T11:00:00Z');
      const result = await service.getRoom('r1', { start, end });

      expect(result.availabilityStatus).toBe('HELD');
    });

    it('returns BOOKED status when DB shows a confirmed booking overlap', async () => {
      const room = { id: 'r1', name: 'Room A', capacity: 4, features: [], images: [], description: 'desc' };
      mockCache.get
        .mockResolvedValueOnce(null) // detail cache miss
        .mockResolvedValueOnce(null); // slot key miss (not held)

      mockRoomsRepo.findOne.mockResolvedValue(room);
      mockQb.getOne.mockResolvedValue({ id: 'b1' }); // overlap booking exists

      const start = new Date('2024-06-01T10:00:00Z');
      const end = new Date('2024-06-01T11:00:00Z');
      const result = await service.getRoom('r1', { start, end });

      expect(result.availabilityStatus).toBe('BOOKED');
    });

    it('caches result with 60s TTL on DB hit', async () => {
      const room = { id: 'r1', name: 'Room A', capacity: 4, features: [], images: [], description: '' };
      mockCache.get.mockResolvedValue(null);
      mockRoomsRepo.findOne.mockResolvedValue(room);

      await service.getRoom('r1');

      expect(mockCache.set).toHaveBeenCalledWith('rooms:detail:r1', expect.anything(), 60_000);
    });
  });

  describe('searchAvailable', () => {
    const start = new Date('2024-06-01T10:00:00Z');
    const end = new Date('2024-06-01T11:00:00Z');

    it('throws BadRequestException when end <= start', async () => {
      await expect(service.searchAvailable({ start: end, end: start })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException with INVALID_TIME_RANGE code', async () => {
      await expect(service.searchAvailable({ start: end, end: start })).rejects.toMatchObject({
        response: { code: 'INVALID_TIME_RANGE' },
      });
    });

    it('returns cached results on cache hit', async () => {
      const cached = { results: [{ roomId: 'r1' }], total: 1 };
      mockCache.get.mockResolvedValue(cached);

      const result = await service.searchAvailable({ start, end });

      expect(result).toBe(cached);
      expect(mockMetrics.recordCacheOp).toHaveBeenCalledWith('search', 'hit');
    });

    it('queries DB and maps results on cache miss', async () => {
      mockCache.get.mockResolvedValue(null);
      const rooms = [{ id: 'r1', name: 'Room A', capacity: 4, features: ['projector'] }];
      mockQb.getManyAndCount.mockResolvedValue([rooms, 1]);

      const result = await service.searchAvailable({ start, end });

      expect(result.total).toBe(1);
      expect(result.results[0].roomId).toBe('r1');
      expect(mockMetrics.recordCacheOp).toHaveBeenCalledWith('search', 'miss');
    });

    it('applies pagination correctly (page 2, limit 10)', async () => {
      mockCache.get.mockResolvedValue(null);
      mockQb.getManyAndCount.mockResolvedValue([[], 100]);

      await service.searchAvailable({ start, end, page: 2, limit: 10 });

      expect(mockQb.skip).toHaveBeenCalledWith(10); // (2-1)*10
      expect(mockQb.take).toHaveBeenCalledWith(10);
    });

    it('caches search results with 30s TTL', async () => {
      mockCache.get.mockResolvedValue(null);
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.searchAvailable({ start, end });

      expect(mockCache.set).toHaveBeenCalledWith(expect.stringContaining('rooms:search:'), expect.anything(), 30_000);
    });
  });
});
