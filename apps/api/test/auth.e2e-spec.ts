import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';

import { AppModule } from '@app/app.module';
import { AppConfig } from '@config/app.config';
import { ROLE } from '@common/constants/role.constants';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';
import { PrismaService } from '@prisma/prisma.service';

const API_PREFIX = '/api/v1';

describe('Authentication & RBAC (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCredentials: { email: string; password: string };

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
    adminCredentials = await seedBaseData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('registers a user with hashed password and issues tokens', async () => {
      const payload = {
        email: 'new.user@example.com',
        password: 'StrongPass123!',
        firstName: 'New',
        lastName: 'User',
        phoneNumber: '+15555555555',
      };

      const response = await request(app.getHttpServer())
        .post(`${API_PREFIX}/auth/register`)
        .send(payload)
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          tokenType: 'Bearer',
          expiresIn: expect.any(Number),
          user: expect.objectContaining({
            email: payload.email.toLowerCase(),
            role: ROLE.CLIENT,
            firstName: payload.firstName,
            phoneNumber: payload.phoneNumber,
          }),
        }),
      );

      const userRecord = await prisma.user.findUnique({
        where: { email: payload.email.toLowerCase() },
      });

      expect(userRecord).toBeDefined();
      expect(userRecord?.passwordHash).toBeDefined();
      expect(userRecord?.passwordHash).not.toEqual(payload.password);
      expect(userRecord?.phoneNumber).toEqual(payload.phoneNumber);

      const refreshTokens = await prisma.refreshToken.findMany({
        where: { userId: userRecord?.id },
      });

      expect(refreshTokens).toHaveLength(1);
      expect(refreshTokens[0].tokenHash).not.toEqual(response.body.refreshToken);
    });
  });

  describe('POST /auth/login', () => {
    it('authenticates an admin user and returns RBAC-enabled access', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post(`${API_PREFIX}/auth/login`)
        .send({
          email: adminCredentials.email,
          password: adminCredentials.password,
        })
        .expect(200);

      expect(loginResponse.body.accessToken).toBeDefined();

      await request(app.getHttpServer())
        .get(`${API_PREFIX}/users`)
        .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
        .expect(200);
    });
  });

  describe('RBAC protection', () => {
    it('prevents non-admin users from accessing admin routes', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post(`${API_PREFIX}/auth/register`)
        .send({
          email: 'client@example.com',
          password: 'ClientPass123!',
          firstName: 'Client',
          lastName: 'Example',
        })
        .expect(201);

      await request(app.getHttpServer())
        .get(`${API_PREFIX}/users`)
        .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
        .expect(403);
    });
  });

  describe('POST /auth/refresh', () => {
    it('rotates refresh tokens and issues a new access token', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post(`${API_PREFIX}/auth/login`)
        .send({
          email: adminCredentials.email,
          password: adminCredentials.password,
        })
        .expect(200);

      const refreshResponse = await request(app.getHttpServer())
        .post(`${API_PREFIX}/auth/refresh`)
        .send({ refreshToken: loginResponse.body.refreshToken })
        .expect(200);

      expect(refreshResponse.body.accessToken).toBeDefined();
      expect(refreshResponse.body.refreshToken).toBeDefined();
      expect(refreshResponse.body.refreshToken).not.toEqual(loginResponse.body.refreshToken);

      const activeTokens = await prisma.refreshToken.findMany({
        where: {
          user: {
            email: adminCredentials.email,
          },
          isRevoked: false,
        },
      });

      expect(activeTokens).toHaveLength(1);
    });
  });

  describe('PATCH /users/me', () => {
    it('updates profile details for the authenticated user', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post(`${API_PREFIX}/auth/register`)
        .send({
          email: 'profile@example.com',
          password: 'ProfilePass123!',
          firstName: 'Profile',
          lastName: 'User',
        })
        .expect(201);

      const updateResponse = await request(app.getHttpServer())
        .patch(`${API_PREFIX}/users/me`)
        .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
        .send({
          firstName: 'Updated',
          phoneNumber: '+48987654321',
        })
        .expect(200);

      expect(updateResponse.body.firstName).toEqual('Updated');
      expect(updateResponse.body.phoneNumber).toEqual('+48987654321');
    });
  });
});

const resetDatabase = async (prisma: PrismaService) => {
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
};

const seedBaseData = async (prisma: PrismaService) => {
  const permissionsData = [
    { key: 'manage_users', description: 'Create, update, and delete user accounts' },
    { key: 'view_users', description: 'View user directory and profiles' },
    { key: 'manage_appointments', description: 'Create and update appointment schedules' },
    { key: 'view_appointments', description: 'View appointment schedules and details' },
    { key: 'manage_documents', description: 'Create and update document templates and records' },
    { key: 'view_documents', description: 'View generated documents and templates' },
  ];

  const permissions = await Promise.all(
    permissionsData.map((permission) =>
      prisma.permission.create({
        data: permission,
      }),
    ),
  );

  const permissionsByKey = new Map(permissions.map((permission) => [permission.key, permission]));

  const connectPermissions = (keys: string[]) =>
    keys.map((key) => {
      const permission = permissionsByKey.get(key);
      if (!permission) {
        throw new Error(`Permission ${key} not found`);
      }

      return {
        permission: {
          connect: {
            id: permission.id,
          },
        },
      };
    });

  const adminRole = await prisma.role.create({
    data: {
      name: ROLE.ADMIN,
      description: 'System administrators with full access',
      rolePermissions: {
        create: permissions.map((permission) => ({
          permission: {
            connect: {
              id: permission.id,
            },
          },
        })),
      },
    },
  });

  await prisma.role.create({
    data: {
      name: ROLE.SPECIALIST,
      description: 'Subject matter experts delivering services',
      rolePermissions: {
        create: connectPermissions([
          'view_users',
          'view_appointments',
          'manage_documents',
          'view_documents',
        ]),
      },
    },
  });

  await prisma.role.create({
    data: {
      name: ROLE.CLIENT,
      description: 'End-users booking appointments and receiving documents',
      rolePermissions: {
        create: connectPermissions(['view_appointments', 'view_documents']),
      },
    },
  });

  const adminPassword = 'Admin123!';
  const adminEmail = 'amina.admin@example.com';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      firstName: 'Amina',
      lastName: 'Admin',
      phoneNumber: '+15550000001',
      locale: 'en',
      roleId: adminRole.id,
    },
  });

  return {
    email: adminEmail,
    password: adminPassword,
  };
};
