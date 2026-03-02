import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HoldsService } from './holds.service';
import { CreateHoldDto } from './dto/create-hold.dto';

@Controller('holds')
@UseGuards(JwtAuthGuard)
export class HoldsController {
  constructor(private readonly holdsService: HoldsService) {}

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post()
  async create(@Req() req: Request, @Body() dto: CreateHoldDto) {
    const user = req.user as any;
    return this.holdsService.createHold(user.userId, dto.roomId, new Date(dto.start), new Date(dto.end));
  }

  @Get(':holdId')
  async get(@Req() req: Request, @Param('holdId') holdId: string) {
    const user = req.user as any;
    return this.holdsService.getHold(holdId, user.userId);
  }
}
