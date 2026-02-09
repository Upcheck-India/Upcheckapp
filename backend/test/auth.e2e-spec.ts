import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { OtpCode } from '../src/auth/otp-code.entity';
import { OtpRateLimitService } from '../src/auth/otp-rate-limit.service';
import { OtpCleanupService } from '../src/auth/otp-cleanup.service';
import { MailService } from '../src/auth/mail.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

// SQLite-compatible version of OtpCode entity for testing
@Entity('otp_codes')
class OtpCodeTest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  phone: string;

  @Column({ type: 'text' })
  code: string;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;

  @Column({ name: 'verified_at', type: 'datetime', nullable: true })
  verifiedAt: Date | null;

  @Column({ name: 'failed_attempts', type: 'int', default: 0 })
  failedAttempts: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}

describe('Auth Endpoints (e2e)', () => {
  let app: INestApplication<App>;
  let otpRepository: Repository<OtpCode>;
  let mockMailService: { sendOtpEmail: jest.Mock; verifyConnection: jest.Mock };

  beforeAll(async () => {
    mockMailService = {
      sendOtpEmail: jest.fn().mockResolvedValue(undefined),
      verifyConnection: jest.fn().mockResolvedValue(true),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({
            SUPABASE_URL: 'https://test.supabase.co',
            SUPABASE_ANON_KEY: 'test-anon-key',
          })],
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          dropSchema: true,
          entities: [OtpCodeTest],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([OtpCodeTest]),
        ScheduleModule.forRoot(),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        OtpRateLimitService,
        OtpCleanupService,
        { provide: MailService, useValue: mockMailService },
        { provide: getRepositoryToken(OtpCode), useExisting: getRepositoryToken(OtpCodeTest) },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const req = context.switchToHttp().getRequest();
          const auth = req.headers.authorization;
          if (!auth) return false;
          req.user = { id: 'test-user', email: 'test@example.com' };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    await app.init();

    otpRepository = moduleFixture.get<Repository<OtpCode>>(getRepositoryToken(OtpCode));
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await otpRepository.clear();
  });

  // =====================
  // POST /api/auth/login/otp  (Send OTP)
  // =====================

  describe('POST /api/auth/login/otp', () => {
    it('should return 400 when no email or phone provided', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login/otp')
        .send({})
        .expect(400);
    });

    it('should return 400 for invalid email format', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login/otp')
        .send({ email: 'not-an-email' })
        .expect(400);
    });

    it('should send OTP successfully for valid email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login/otp')
        .send({ email: 'user@example.com' })
        .expect(201);

      expect(res.body.message).toBe('OTP sent successfully.');
      expect(mockMailService.sendOtpEmail).toHaveBeenCalledTimes(1);
      expect(mockMailService.sendOtpEmail.mock.calls[0][0]).toBe('user@example.com');
    });

    it('should save OTP record in database', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login/otp')
        .send({ email: 'user@example.com' })
        .expect(201);

      const records = await otpRepository.find({ where: { email: 'user@example.com' } });
      expect(records.length).toBe(1);
      expect(records[0].code).toMatch(/^\d{6}$/);
      expect(records[0].expiresAt).toBeDefined();
      expect(records[0].verifiedAt).toBeNull();
    });

    it('should enforce resend cooldown (60s)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login/otp')
        .send({ email: 'user@example.com' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/api/auth/login/otp')
        .send({ email: 'user@example.com' })
        .expect(400);

      expect(res.body.message).toContain('Please wait');
    });

    it('should return 400 for phone OTP (not supported)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login/otp')
        .send({ phone: '+919876543210' })
        .expect(400);

      expect(res.body.message).toContain('SMS OTP is not yet supported');
    });
  });

  // =====================
  // POST /api/auth/verify-otp
  // =====================

  describe('POST /api/auth/verify-otp', () => {
    it('should return 400 when no email or phone provided', () => {
      return request(app.getHttpServer())
        .post('/api/auth/verify-otp')
        .send({ token: '123456' })
        .expect(400);
    });

    it('should return 401 when no OTP exists for email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/verify-otp')
        .send({ email: 'nobody@example.com', token: '123456' })
        .expect(401);
    });

    it('should return 401 for wrong OTP code', async () => {
      // Send OTP first
      await request(app.getHttpServer())
        .post('/api/auth/login/otp')
        .send({ email: 'user@example.com' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/api/auth/verify-otp')
        .send({ email: 'user@example.com', token: '000000' })
        .expect(401);

      expect(res.body.message).toBe('Invalid OTP');
    });

    it('should increment failedAttempts on wrong code', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login/otp')
        .send({ email: 'user@example.com' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/auth/verify-otp')
        .send({ email: 'user@example.com', token: '000000' })
        .expect(401);

      const record = await otpRepository.findOne({
        where: { email: 'user@example.com' },
        order: { createdAt: 'DESC' },
      });
      expect(record!.failedAttempts).toBe(1);
    });

    it('should verify successfully with correct OTP', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login/otp')
        .send({ email: 'user@example.com' })
        .expect(201);

      // Get the OTP from the database
      const record = await otpRepository.findOne({
        where: { email: 'user@example.com' },
        order: { createdAt: 'DESC' },
      });

      const res = await request(app.getHttpServer())
        .post('/api/auth/verify-otp')
        .send({ email: 'user@example.com', token: record!.code })
        .expect(201);

      expect(res.body.verified).toBe(true);
      expect(res.body.message).toBe('OTP verified successfully.');
    });

    it('should return 401 when OTP already used', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login/otp')
        .send({ email: 'user@example.com' })
        .expect(201);

      const record = await otpRepository.findOne({
        where: { email: 'user@example.com' },
        order: { createdAt: 'DESC' },
      });

      // Verify once
      await request(app.getHttpServer())
        .post('/api/auth/verify-otp')
        .send({ email: 'user@example.com', token: record!.code })
        .expect(201);

      // Try to verify again
      const res = await request(app.getHttpServer())
        .post('/api/auth/verify-otp')
        .send({ email: 'user@example.com', token: record!.code })
        .expect(401);

      expect(res.body.message).toBe('OTP already used');
    });

    it('should lock out after 5 failed attempts', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login/otp')
        .send({ email: 'brute@example.com' })
        .expect(201);

      // Make 5 wrong attempts
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/auth/verify-otp')
          .send({ email: 'brute@example.com', token: '000000' })
          .expect(401);
      }

      // 6th attempt should say "Too many failed attempts" even with correct code
      const record = await otpRepository.findOne({
        where: { email: 'brute@example.com' },
        order: { createdAt: 'DESC' },
      });

      const res = await request(app.getHttpServer())
        .post('/api/auth/verify-otp')
        .send({ email: 'brute@example.com', token: record!.code })
        .expect(401);

      expect(res.body.message).toContain('Too many failed attempts');
    });

    it('should return 401 for expired OTP', async () => {
      // Manually insert an expired OTP
      await otpRepository.save(otpRepository.create({
        email: 'expired@example.com',
        code: '123456',
        expiresAt: new Date(Date.now() - 60000), // expired 1 min ago
      }));

      const res = await request(app.getHttpServer())
        .post('/api/auth/verify-otp')
        .send({ email: 'expired@example.com', token: '123456' })
        .expect(401);

      expect(res.body.message).toBe('OTP expired');
    });
  });

  // =====================
  // POST /api/auth/register (validation tests)
  // =====================

  describe('POST /api/auth/register', () => {
    it('should return 400 for missing email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ password: 'password123' })
        .expect(400);
    });

    it('should return 400 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'bad-email', password: 'password123' })
        .expect(400);
    });

    it('should return 400 for short password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'user@example.com', password: '123' })
        .expect(400);
    });

    it('should reject unknown fields (forbidNonWhitelisted)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'user@example.com', password: 'password123', hack: true })
        .expect(400);
    });
  });

  // =====================
  // POST /api/auth/login (validation tests)
  // =====================

  describe('POST /api/auth/login', () => {
    it('should return 400 for missing email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ password: 'password123' })
        .expect(400);
    });

    it('should return 400 for missing password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'user@example.com' })
        .expect(400);
    });
  });

  // =====================
  // Protected endpoints (no auth)
  // =====================

  describe('Protected endpoints without auth', () => {
    it('GET /api/auth/health should return 403 without token', () => {
      return request(app.getHttpServer())
        .get('/api/auth/health')
        .expect(403);
    });

    it('GET /api/auth/me should return 403 without token', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(403);
    });

    it('POST /api/auth/logout should return 403 without token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/logout')
        .expect(403);
    });
  });
});
