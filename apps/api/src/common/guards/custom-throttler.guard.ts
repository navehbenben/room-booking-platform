import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Custom throttler that keys authenticated requests by userId (per-user rate limiting)
 * and unauthenticated requests by IP (e.g., auth endpoints before login).
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const user = req.user as { userId?: string } | undefined;
    if (user?.userId) {
      return `user:${user.userId}`;
    }
    return `ip:${req.ip ?? req.socket?.remoteAddress ?? 'unknown'}`;
  }
}
