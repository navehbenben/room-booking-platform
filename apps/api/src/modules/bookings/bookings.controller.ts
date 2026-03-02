import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingsService } from './bookings.service';

/** Shape attached to req.user by JwtStrategy */
interface JwtUser {
  userId: string;
  email: string;
}

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  /**
   * POST /bookings
   *
   * Creates (or idempotently replays) a booking.
   *
   * Idempotency-Key: <UUID>   — optional but strongly recommended.
   *   • First call with a given key: creates the booking, stores the outcome.
   *   • Subsequent calls with the same key: return the stored outcome unchanged.
   *   • In-flight duplicate: returns 503 IDEMPOTENT_REQUEST_IN_PROGRESS.
   *
   * Rate-limited to 10 requests / minute / user.
   */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  async create(
    @Req() req: Request,
    @Body() dto: CreateBookingDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const user = req.user as JwtUser;
    return this.bookingsService.createBooking({
      userId: user.userId,
      holdId: dto.holdId,
      roomId: dto.roomId,
      start: dto.start ? new Date(dto.start) : undefined,
      end: dto.end ? new Date(dto.end) : undefined,
      notes: dto.notes,
      idempotencyKey,
    });
  }

  /** GET /bookings/me — returns the authenticated user's own bookings. */
  @Get('me')
  async getMyBookings(@Req() req: Request) {
    const user = req.user as JwtUser;
    return this.bookingsService.getMyBookings(user.userId);
  }

  /** GET /bookings/:id — returns a single booking; owner-only. */
  @Get(':id')
  async get(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as JwtUser;
    const b = await this.bookingsService.getBooking(id);
    if (b.userId !== user.userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Access denied' });
    }
    return {
      bookingId: b.id,
      roomId: b.roomId,
      userId: b.userId,
      start: b.startTime,
      end: b.endTime,
      status: b.status,
      notes: b.notes ?? undefined,
      createdAt: b.createdAt,
    };
  }

  /** DELETE /bookings/:id — soft-cancels a booking; owner-only. */
  @HttpCode(200)
  @Delete(':id')
  async cancel(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as JwtUser;
    return this.bookingsService.cancelBooking(id, user.userId);
  }
}
