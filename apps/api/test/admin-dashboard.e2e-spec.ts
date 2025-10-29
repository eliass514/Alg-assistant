import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@app/app.module';
import { AppConfig } from '@config/app.config';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';
import { PrismaService } from '@prisma/prisma.service';
import { resetDatabase, seedBaseData, SeedData } from './helpers/database';

const API_PREFIX = '/api/v1';

describe('Admin Dashboard (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let seedData: SeedData;
  let adminAccessToken: string;
  let clientAccessToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    const configService = app.get(ConfigService);
    const appConfig = configService.get<AppConfig>('app', { infer: true });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidUnknownValues: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new LoggingInterceptor());

    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    app.setGlobalPrefix(appConfig?.globalPrefix ?? 'api');

    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    seedData = await seedBaseData(prisma);

    const adminLoginResponse = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({
        email: seedData.admin.email,
        password: seedData.admin.password,
      })
      .expect(200);

    adminAccessToken = adminLoginResponse.body.accessToken;
    expect(adminAccessToken).toBeDefined();

    const clientRegisterResponse = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/register`)
      .send({
        email: 'client@example.com',
        password: 'ClientPass123!',
        firstName: 'Client',
        lastName: 'User',
      })
      .expect(201);

    clientAccessToken = clientRegisterResponse.body.accessToken;
    expect(clientAccessToken).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /admin/dashboard/metrics', () => {
    it('should return dashboard metrics for admin', async () => {
      const response = await request(app.getHttpServer())
        .get(`${API_PREFIX}/admin/dashboard/metrics`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalUsers');
      expect(response.body).toHaveProperty('pendingAppointments');
      expect(response.body).toHaveProperty('pendingDocuments');
      expect(response.body).toHaveProperty('activeServices');

      expect(typeof response.body.totalUsers).toBe('number');
      expect(typeof response.body.pendingAppointments).toBe('number');
      expect(typeof response.body.pendingDocuments).toBe('number');
      expect(typeof response.body.activeServices).toBe('number');

      expect(response.body.totalUsers).toBeGreaterThanOrEqual(0);
      expect(response.body.pendingAppointments).toBeGreaterThanOrEqual(0);
      expect(response.body.pendingDocuments).toBeGreaterThanOrEqual(0);
      expect(response.body.activeServices).toBeGreaterThanOrEqual(0);
    });

    it('should return correct count of total users', async () => {
      const totalUsers = await prisma.user.count();

      const response = await request(app.getHttpServer())
        .get(`${API_PREFIX}/admin/dashboard/metrics`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.totalUsers).toBe(totalUsers);
    });

    it('should return correct count of active services', async () => {
      const activeServices = await prisma.service.count({
        where: { isActive: true },
      });

      const response = await request(app.getHttpServer())
        .get(`${API_PREFIX}/admin/dashboard/metrics`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.activeServices).toBe(activeServices);
    });

    it('should deny access to non-admin users', async () => {
      await request(app.getHttpServer())
        .get(`${API_PREFIX}/admin/dashboard/metrics`)
        .set('Authorization', `Bearer ${clientAccessToken}`)
        .expect(403);
    });

    it('should deny access without authentication', async () => {
      await request(app.getHttpServer()).get(`${API_PREFIX}/admin/dashboard/metrics`).expect(401);
    });
  });
});
