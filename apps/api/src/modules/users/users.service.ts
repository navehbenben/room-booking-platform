import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { RefreshTokenEntity } from '../auth/entities/refresh-token.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { UserEntity } from './entities/user.entity';
import { UserProfileDto } from './dto/user-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokensRepo: Repository<RefreshTokenEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingsRepo: Repository<BookingEntity>,
  ) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async createUser(params: { email: string; passwordHash: string; name?: string }): Promise<UserEntity> {
    const user = this.usersRepo.create({
      email: params.email,
      passwordHash: params.passwordHash,
      name: params.name ?? null,
    });
    return this.usersRepo.save(user);
  }

  async findOrCreateGoogleUser(params: { googleId: string; email: string; name?: string }): Promise<UserEntity> {
    // 1. Look up by googleId first (returning user via Google)
    const byGoogle = await this.usersRepo.findOne({ where: { googleId: params.googleId } });
    if (byGoogle) return byGoogle;

    // 2. Email already registered with password — link the Google account
    const byEmail = await this.usersRepo.findOne({ where: { email: params.email } });
    if (byEmail) {
      byEmail.googleId = params.googleId;
      if (!byEmail.name && params.name) byEmail.name = params.name;
      return this.usersRepo.save(byEmail);
    }

    // 3. New user — create without password
    const user = this.usersRepo.create({
      email: params.email,
      passwordHash: null,
      googleId: params.googleId,
      name: params.name ?? null,
    });
    return this.usersRepo.save(user);
  }

  private toProfileDto(user: UserEntity): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      hasPassword: user.passwordHash !== null,
      hasGoogleAccount: user.googleId !== null,
    };
  }

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.toProfileDto(user);
  }

  async updateName(userId: string, name: string): Promise<UserProfileDto> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    user.name = name;
    await this.usersRepo.save(user);
    return this.toProfileDto(user);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.passwordHash) {
      throw new BadRequestException({ code: 'NO_PASSWORD', message: 'Account does not have a password' });
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new BadRequestException({ code: 'WRONG_PASSWORD_CHANGE', message: 'Current password is incorrect' });
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersRepo.save(user);
  }

  /**
   * Right to Access + Data Portability
   * Returns a structured export of all personal data for the user.
   */
  async exportMyData(userId: string): Promise<object> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const bookings = await this.bookingsRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return {
      exportedAt: new Date().toISOString(),
      profile: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      bookings: bookings.map((b) => ({
        bookingId: b.id,
        roomId: b.roomId,
        start: b.startTime,
        end: b.endTime,
        status: b.status,
        createdAt: b.createdAt,
      })),
    };
  }

  /**
   * Right to Erasure
   * Permanently deletes the user account, all refresh tokens, and all bookings.
   */
  async deleteAccount(userId: string): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Revoke all refresh tokens first to immediately invalidate all sessions
    await this.refreshTokensRepo.delete({ userId });
    // Remove all bookings for this user
    await this.bookingsRepo.delete({ userId });
    // Delete the user record
    await this.usersRepo.delete({ id: userId });
  }
}
