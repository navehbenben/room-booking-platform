import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingEntity } from './entities/booking.entity';
import { IdempotencyKeyEntity } from './entities/idempotency-key.entity';
import { RoomEntity } from '../rooms/entities/room.entity';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { HoldsModule } from '../holds/holds.module';

@Module({
  imports: [TypeOrmModule.forFeature([BookingEntity, IdempotencyKeyEntity, RoomEntity]), HoldsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
