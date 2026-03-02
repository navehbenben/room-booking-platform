import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpErrorFilter } from '../src/common/filters/http-error.filter';

describe('Room Booking API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpErrorFilter());
    await app.init();
  }, 60_000); // allow 60s for DB init + room seeding

  afterAll(async () => {
    await app.close();
  });

  // ── Health ──────────────────────────────────────────────────────────────────
  describe('GET /health', () => {
    it('returns 200 with ok: true', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);
      expect(res.body.ok).toBe(true);
    });
  });

  // ── Rooms (public) ──────────────────────────────────────────────────────────
  describe('GET /rooms', () => {
    it('returns 200 with an array of rooms', async () => {
      const res = await request(app.getHttpServer()).get('/rooms').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /rooms/search', () => {
    it('returns 200 with paginated results for a valid time range', async () => {
      const start = new Date(Date.now() + 3_600_000).toISOString(); // 1 h from now
      const end = new Date(Date.now() + 7_200_000).toISOString(); // 2 h from now
      const res = await request(app.getHttpServer()).get(`/rooms/search?start=${start}&end=${end}`).expect(200);
      expect(Array.isArray(res.body.results)).toBe(true);
      expect(typeof res.body.total).toBe('number');
    });

    it('returns 400 when start/end params are missing', async () => {
      const res = await request(app.getHttpServer()).get('/rooms/search').expect(400);
      expect(res.body.error).toBeDefined();
    });
  });

  // ── Auth ─────────────────────────────────────────────────────────────────────
  describe('POST /auth/register', () => {
    it('returns 201 with userId and accessToken', async () => {
      const email = `e2e-register-${Date.now()}@test.com`;
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: 'testpassword123' })
        .expect(201);
      expect(res.body.userId).toBeDefined();
      expect(res.body.accessToken).toBeDefined();
    });

    it('returns 409 EMAIL_ALREADY_EXISTS when email is taken', async () => {
      const email = `e2e-dup-${Date.now()}@test.com`;
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: 'testpassword123' })
        .expect(201);
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: 'testpassword123' })
        .expect(409);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('returns 400 when required fields are missing', async () => {
      await request(app.getHttpServer()).post('/auth/register').send({}).expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('returns 401 INVALID_CREDENTIALS for unknown email', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@test.com', password: 'wrongpass' })
        .expect(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 201 with accessToken for valid credentials', async () => {
      const email = `e2e-login-${Date.now()}@test.com`;
      await request(app.getHttpServer()).post('/auth/register').send({ email, password: 'mypassword123' });
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'mypassword123' })
        .expect(201);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.userId).toBeDefined();
    });
  });

  describe('POST /auth/refresh', () => {
    it('returns 401 when no refresh cookie is present', async () => {
      const res = await request(app.getHttpServer()).post('/auth/refresh').expect(401);
      expect(res.body.error.code).toBe('MISSING_REFRESH_TOKEN');
    });
  });
});
