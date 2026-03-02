import { Controller, Get, Param, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RoomsService } from './rooms.service';
import { SearchRoomsDto } from './dto/search-rooms.dto';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  async list() {
    const rooms = await this.roomsService.listRooms();
    return rooms.map((r) => ({
      roomId: r.id,
      name: r.name,
      capacity: r.capacity,
      features: r.features,
    }));
  }

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get('search')
  async search(@Query() dto: SearchRoomsDto) {
    return this.roomsService.searchAvailable({
      start: new Date(dto.start),
      end: new Date(dto.end),
      capacity: dto.capacity,
      features: dto.features,
      page: dto.page,
      limit: dto.limit,
    });
  }

  // NestJS resolves static 'search' before param ':id' — no ordering concern
  @Get(':id')
  async getOne(@Param('id') id: string, @Query() q: { start?: string; end?: string }) {
    return this.roomsService.getRoom(id, {
      start: q.start ? new Date(q.start) : undefined,
      end: q.end ? new Date(q.end) : undefined,
    });
  }
}
