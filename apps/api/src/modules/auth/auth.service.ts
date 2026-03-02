import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { MetricsService } from '../../common/metrics/metrics.service';

const REFRESH_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepo: Repository<RefreshTokenEntity>,
    private readonly metrics: MetricsService,
  ) {}

  async register(params: { email: string; password: string; name?: string }) {
    const existing = await this.usersService.findByEmail(params.email);
    if (existing) {
      this.metrics.recordAuth('register', 'failure');
      // No email in log — GDPR: email is PII
      this.logger.warn({ event: 'auth.register.duplicate', message: 'Registration attempt for existing email' });
      throw new ConflictException({ code: 'EMAIL_ALREADY_EXISTS', message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(params.password, 10);
    const user = await this.usersService.createUser({
      email: params.email,
      passwordHash,
      name: params.name,
    });

    this.metrics.recordAuth('register', 'success');
    this.logger.log({ event: 'auth.register.success', userId: user.id, message: 'User registered' });
    return {
      userId: user.id,
      accessToken: this.signAccessToken({ sub: user.id, email: user.email }),
      refreshToken: await this.createRefreshToken(user.id),
    };
  }

  async login(params: { email: string; password: string }) {
    const user = await this.usersService.findByEmail(params.email);
    if (!user) {
      this.metrics.recordAuth('login', 'failure');
      this.logger.warn({ event: 'auth.login.no_account', message: 'Login attempt for unknown email' });
      throw new UnauthorizedException({ code: 'EMAIL_NOT_FOUND', message: 'No account found with this email' });
    }

    // Google-only users have no password hash — guide them to the correct flow
    if (!user.passwordHash) {
      this.metrics.recordAuth('login', 'failure');
      this.logger.warn({
        event: 'auth.login.google_only',
        userId: user.id,
        message: 'Password login on Google-only account',
      });
      throw new UnauthorizedException({ code: 'GOOGLE_ACCOUNT_ONLY', message: 'This account uses Google Sign-In' });
    }

    const ok = await bcrypt.compare(params.password, user.passwordHash);
    if (!ok) {
      this.metrics.recordAuth('login', 'failure');
      this.logger.warn({
        event: 'auth.login.wrong_password',
        userId: user.id,
        message: 'Login attempt with wrong password',
      });
      throw new UnauthorizedException({ code: 'WRONG_PASSWORD', message: 'Incorrect password' });
    }

    this.metrics.recordAuth('login', 'success');
    this.logger.log({ event: 'auth.login.success', userId: user.id, message: 'User logged in' });
    return {
      userId: user.id,
      accessToken: this.signAccessToken({ sub: user.id, email: user.email }),
      refreshToken: await this.createRefreshToken(user.id),
    };
  }

  async refresh(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const entity = await this.refreshTokenRepo.findOne({ where: { tokenHash } });

    if (!entity || entity.revoked || entity.expiresAt < new Date()) {
      this.metrics.recordAuth('refresh', 'failure');
      this.logger.warn({ event: 'auth.refresh.failure', message: 'Invalid or expired refresh token' });
      throw new UnauthorizedException({ code: 'INVALID_REFRESH_TOKEN', message: 'Invalid or expired refresh token' });
    }

    // Rotate: revoke old, issue new pair
    entity.revoked = true;
    await this.refreshTokenRepo.save(entity);

    const user = await this.usersService.findById(entity.userId);
    if (!user) {
      this.metrics.recordAuth('refresh', 'failure');
      this.logger.warn({
        event: 'auth.refresh.user_not_found',
        userId: entity.userId,
        message: 'User not found during refresh',
      });
      throw new UnauthorizedException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    this.metrics.recordAuth('refresh', 'success');
    this.logger.log({ event: 'auth.refresh.success', userId: user.id, message: 'Token refreshed' });
    return {
      accessToken: this.signAccessToken({ sub: user.id, email: user.email }),
      refreshToken: await this.createRefreshToken(user.id),
    };
  }

  async logout(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const entity = await this.refreshTokenRepo.findOne({ where: { tokenHash } });
    if (entity && !entity.revoked) {
      entity.revoked = true;
      await this.refreshTokenRepo.save(entity);
      this.logger.log({ event: 'auth.logout', userId: entity.userId, message: 'User logged out' });
    }
    this.metrics.recordAuth('logout', 'success');
  }

  async googleLogin(params: { googleId: string; email: string; name?: string }) {
    const user = await this.usersService.findOrCreateGoogleUser(params);
    this.metrics.recordAuth('login', 'success');
    this.logger.log({ event: 'auth.google.success', userId: user.id, message: 'Google OAuth login' });
    return {
      userId: user.id,
      accessToken: this.signAccessToken({ sub: user.id, email: user.email }),
      refreshToken: await this.createRefreshToken(user.id),
    };
  }

  private signAccessToken(payload: { sub: string; email: string }): string {
    return this.jwtService.sign(payload, { expiresIn: '15m' });
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const raw = randomBytes(32).toString('hex');
    const tokenHash = hashToken(raw);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    const entity = this.refreshTokenRepo.create({ userId, tokenHash, expiresAt });
    await this.refreshTokenRepo.save(entity);
    return raw;
  }
}

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
