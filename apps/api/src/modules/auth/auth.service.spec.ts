import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let mockUsersService: { findByEmail: jest.Mock; findById: jest.Mock; createUser: jest.Mock };
  let mockJwtService: { sign: jest.Mock };
  let mockRefreshTokenRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let mockMetrics: { recordAuth: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUsersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      createUser: jest.fn(),
    };
    mockJwtService = {
      sign: jest.fn().mockReturnValue('signed.jwt.token'),
    };
    mockRefreshTokenRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockReturnValue({}),
      save: jest.fn().mockResolvedValue({}),
    };
    mockMetrics = {
      recordAuth: jest.fn(),
    };

    service = new AuthService(
      mockUsersService as any,
      mockJwtService as any,
      mockRefreshTokenRepo as any,
      mockMetrics as any,
    );
  });

  describe('register', () => {
    it('throws ConflictException when email already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: 'u1', email: 'a@b.com' });

      await expect(service.register({ email: 'a@b.com', password: 'pass' })).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws ConflictException with EMAIL_ALREADY_EXISTS code', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: 'u1' });

      await expect(service.register({ email: 'a@b.com', password: 'pass' })).rejects.toMatchObject({
        response: { code: 'EMAIL_ALREADY_EXISTS' },
      });
    });

    it('hashes password with bcrypt when email is free', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      jest.mocked(bcrypt.hash).mockResolvedValue('hashed-pass' as never);
      mockUsersService.createUser.mockResolvedValue({ id: 'u1', email: 'a@b.com' });

      await service.register({ email: 'a@b.com', password: 'plain-pass' });

      expect(bcrypt.hash).toHaveBeenCalledWith('plain-pass', 10);
    });

    it('returns userId, accessToken and refreshToken on success', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      jest.mocked(bcrypt.hash).mockResolvedValue('hashed' as never);
      mockUsersService.createUser.mockResolvedValue({ id: 'u1', email: 'a@b.com' });

      const result = await service.register({ email: 'a@b.com', password: 'pass' });

      expect(result.userId).toBe('u1');
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(typeof result.refreshToken).toBe('string');
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException when user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.login({ email: 'x@y.com', password: 'p' })).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException on wrong password', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: 'u1', email: 'a@b.com', passwordHash: 'hash' });
      jest.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(service.login({ email: 'a@b.com', password: 'wrong' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('returns userId, accessToken and refreshToken on success', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: 'u1', email: 'a@b.com', passwordHash: 'hash' });
      jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await service.login({ email: 'a@b.com', password: 'correct' });

      expect(result.userId).toBe('u1');
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(typeof result.refreshToken).toBe('string');
    });
  });

  describe('refresh', () => {
    it('throws UnauthorizedException when token not found in DB', async () => {
      mockRefreshTokenRepo.findOne.mockResolvedValue(null);

      await expect(service.refresh('raw-token')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when token is revoked', async () => {
      mockRefreshTokenRepo.findOne.mockResolvedValue({
        revoked: true,
        expiresAt: new Date(Date.now() + 10_000),
        userId: 'u1',
      });

      await expect(service.refresh('raw-token')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when token is expired', async () => {
      mockRefreshTokenRepo.findOne.mockResolvedValue({
        revoked: false,
        expiresAt: new Date(Date.now() - 1_000),
        userId: 'u1',
      });

      await expect(service.refresh('raw-token')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when user no longer exists', async () => {
      mockRefreshTokenRepo.findOne.mockResolvedValue({
        revoked: false,
        expiresAt: new Date(Date.now() + 10_000),
        userId: 'u1',
      });
      mockUsersService.findById.mockResolvedValue(null);

      await expect(service.refresh('raw-token')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('marks old token as revoked and issues new pair on success', async () => {
      const entity = { revoked: false, expiresAt: new Date(Date.now() + 10_000), userId: 'u1' };
      mockRefreshTokenRepo.findOne.mockResolvedValue(entity);
      mockUsersService.findById.mockResolvedValue({ id: 'u1', email: 'a@b.com' });

      const result = await service.refresh('raw-token');

      expect(entity.revoked).toBe(true);
      expect(mockRefreshTokenRepo.save).toHaveBeenCalled();
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(typeof result.refreshToken).toBe('string');
    });
  });

  describe('logout', () => {
    it('revokes the token when found and not already revoked', async () => {
      const entity = { revoked: false, userId: 'u1' };
      mockRefreshTokenRepo.findOne.mockResolvedValue(entity);

      await service.logout('raw-token');

      expect(entity.revoked).toBe(true);
      expect(mockRefreshTokenRepo.save).toHaveBeenCalledWith(entity);
    });

    it('does nothing when token not found', async () => {
      mockRefreshTokenRepo.findOne.mockResolvedValue(null);

      await service.logout('raw-token');

      expect(mockRefreshTokenRepo.save).not.toHaveBeenCalled();
    });

    it('does nothing when token is already revoked', async () => {
      mockRefreshTokenRepo.findOne.mockResolvedValue({ revoked: true, userId: 'u1' });

      await service.logout('raw-token');

      expect(mockRefreshTokenRepo.save).not.toHaveBeenCalled();
    });
  });
});
