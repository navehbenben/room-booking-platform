import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let mockRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let mockRefreshTokensRepo: { delete: jest.Mock };
  let mockBookingsRepo: { find: jest.Mock; delete: jest.Mock };

  beforeEach(() => {
    mockRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    mockRefreshTokensRepo = { delete: jest.fn().mockResolvedValue(undefined) };
    mockBookingsRepo = {
      find: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    service = new UsersService(mockRepo as any, mockRefreshTokensRepo as any, mockBookingsRepo as any);
  });

  describe('findByEmail', () => {
    it('delegates to repo.findOne with email filter', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
      const result = await service.findByEmail('a@b.com');
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { email: 'a@b.com' } });
      expect(result?.id).toBe('u1');
    });

    it('returns null when user not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      expect(await service.findByEmail('x@y.com')).toBeNull();
    });
  });

  describe('findById', () => {
    it('delegates to repo.findOne with id filter', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'u1' });
      const result = await service.findById('u1');
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'u1' } });
      expect(result?.id).toBe('u1');
    });

    it('returns null when user not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      expect(await service.findById('unknown')).toBeNull();
    });
  });

  describe('createUser', () => {
    it('calls repo.create then repo.save and returns the saved user', async () => {
      const user = { id: 'u1', email: 'a@b.com', passwordHash: 'hash', name: 'Alice' };
      mockRepo.create.mockReturnValue(user);
      mockRepo.save.mockResolvedValue(user);

      const result = await service.createUser({ email: 'a@b.com', passwordHash: 'hash', name: 'Alice' });

      expect(mockRepo.create).toHaveBeenCalledWith({ email: 'a@b.com', passwordHash: 'hash', name: 'Alice' });
      expect(mockRepo.save).toHaveBeenCalledWith(user);
      expect(result.id).toBe('u1');
    });

    it('defaults name to null when not provided', async () => {
      const user = { id: 'u1', email: 'a@b.com', passwordHash: 'hash', name: null };
      mockRepo.create.mockReturnValue(user);
      mockRepo.save.mockResolvedValue(user);

      await service.createUser({ email: 'a@b.com', passwordHash: 'hash' });

      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ name: null }));
    });
  });

  describe('exportMyData', () => {
    it('throws NotFoundException when user not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.exportMyData('u1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns structured export with profile and bookings', async () => {
      const user = { id: 'u1', email: 'a@b.com', name: 'Alice', createdAt: new Date() };
      const booking = {
        id: 'b1',
        roomId: 'r1',
        startTime: new Date(),
        endTime: new Date(),
        status: 'CONFIRMED',
        createdAt: new Date(),
      };
      mockRepo.findOne.mockResolvedValue(user);
      mockBookingsRepo.find.mockResolvedValue([booking]);

      const result = (await service.exportMyData('u1')) as any;

      expect(result.profile.id).toBe('u1');
      expect(result.profile.email).toBe('a@b.com');
      expect(result.bookings).toHaveLength(1);
      expect(result.bookings[0].bookingId).toBe('b1');
      expect(result.exportedAt).toBeDefined();
    });
  });

  describe('deleteAccount', () => {
    it('throws NotFoundException when user not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.deleteAccount('u1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deletes refresh tokens, bookings, and user in order', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'u1' });
      mockRepo.delete.mockResolvedValue(undefined);

      await service.deleteAccount('u1');

      expect(mockRefreshTokensRepo.delete).toHaveBeenCalledWith({ userId: 'u1' });
      expect(mockBookingsRepo.delete).toHaveBeenCalledWith({ userId: 'u1' });
      expect(mockRepo.delete).toHaveBeenCalledWith({ id: 'u1' });
    });
  });
});
