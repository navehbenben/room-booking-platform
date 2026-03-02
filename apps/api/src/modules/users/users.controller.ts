import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users/me
   * Returns the authenticated user's profile.
   */
  @Get('me')
  async getProfile(@Request() req: any) {
    return this.usersService.getProfile(req.user.userId);
  }

  /**
   * PATCH /users/me
   * Updates the authenticated user's display name.
   */
  @Patch('me')
  async updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateName(req.user.userId, dto.name);
  }

  /**
   * POST /users/me/change-password
   * Changes the password for password-based accounts.
   */
  @Post('me/change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    await this.usersService.changePassword(req.user.userId, dto.currentPassword, dto.newPassword);
  }

  /**
   * GET /users/me/data
   * Right to Access + Data Portability — returns a JSON export of all personal data.
   */
  @Get('me/data')
  async exportMyData(@Request() req: any) {
    return this.usersService.exportMyData(req.user.userId);
  }

  /**
   * DELETE /users/me
   * Right to Erasure — permanently deletes the account and all associated data.
   * Clears the refresh-token cookie so the browser session ends immediately.
   */
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMyAccount(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    await this.usersService.deleteAccount(req.user.userId);
    // Must match the cookie name and attributes used in auth.controller.ts
    res.clearCookie('rb_refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
  }
}
