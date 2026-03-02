import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const REFRESH_COOKIE = 'rb_refresh_token';

// HttpOnly: inaccessible to JavaScript (XSS-safe).
// SameSite=Strict: only sent on same-site requests (CSRF-safe).
// Secure is enforced in production where TLS is terminated upstream.
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days — matches REFRESH_TTL_MS in auth.service
  path: '/',
};

@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTS);
    // refreshToken is not returned in the body — it lives only in the HttpOnly cookie
    return { userId: result.userId, accessToken: result.accessToken };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTS);
    // refreshToken is not returned in the body — it lives only in the HttpOnly cookie
    return { userId: result.userId, accessToken: result.accessToken };
  }

  // Reads the refresh token from the HttpOnly cookie — JS never has access to it
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken: string | undefined = req.cookies?.[REFRESH_COOKIE];
    if (!rawToken) {
      throw new UnauthorizedException({ code: 'MISSING_REFRESH_TOKEN', message: 'No refresh token' });
    }
    const result = await this.authService.refresh(rawToken);
    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTS);
    return { accessToken: result.accessToken };
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────
  // Initiates the redirect to Google's consent screen — no body/response here.
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() { /* guard handles the redirect */ }

  // Google redirects back here after consent.
  // The GoogleStrategy.validate() resolves to { userId, accessToken, refreshToken }.
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: Request & { user: { userId: string; accessToken: string; refreshToken: string } },
    @Res() res: Response,
  ) {
    const { refreshToken } = req.user;
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    res.redirect(frontendUrl);
  }

  @HttpCode(204)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken: string | undefined = req.cookies?.[REFRESH_COOKIE];
    if (rawToken) {
      await this.authService.logout(rawToken);
    }
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
  }
}
