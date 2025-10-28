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

describe('Document Templates (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let seedData: SeedData;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /document-templates (public)', () => {
    it('should list all active document templates without authentication', async () => {
      const template = await prisma.documentTemplate.create({
        data: {
          slug: 'visa-application',
          name: 'Visa Application',
          description: 'Standard visa application template',
          defaultLocale: 'en',
          isActive: true,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`${API_PREFIX}/document-templates`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toEqual(
        expect.objectContaining({
          id: template.id,
          slug: 'visa-application',
          name: 'Visa Application',
          isActive: true,
        }),
      );
      expect(response.body.meta).toEqual({
        page: 1,
        limit: 25,
        total: 1,
      });
    });

    it('should filter by search term', async () => {
      await prisma.documentTemplate.createMany({
        data: [
          {
            slug: 'visa-application',
            name: 'Visa Application',
            description: 'Standard visa application template',
            isActive: true,
          },
          {
            slug: 'passport-renewal',
            name: 'Passport Renewal',
            description: 'Passport renewal form',
            isActive: true,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get(`${API_PREFIX}/document-templates`)
        .query({ search: 'visa' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].slug).toBe('visa-application');
    });

    it('should filter by serviceId', async () => {
      const [service] = seedData.services;
      const template = await prisma.documentTemplate.create({
        data: {
          slug: 'visa-application',
          name: 'Visa Application',
          description: 'Standard visa application template',
          isActive: true,
        },
      });

      await prisma.documentTemplateService.create({
        data: {
          templateId: template.id,
          serviceId: service.id,
          isRequired: true,
        },
      });

      await prisma.documentTemplate.create({
        data: {
          slug: 'other-template',
          name: 'Other Template',
          description: 'Not linked to service',
          isActive: true,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`${API_PREFIX}/document-templates`)
        .query({ serviceId: service.id })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(template.id);
    });

    it('should filter by isActive', async () => {
      await prisma.documentTemplate.createMany({
        data: [
          {
            slug: 'active-template',
            name: 'Active Template',
            isActive: true,
          },
          {
            slug: 'inactive-template',
            name: 'Inactive Template',
            isActive: false,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get(`${API_PREFIX}/document-templates`)
        .query({ isActive: false })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].slug).toBe('inactive-template');
    });

    it('should support pagination', async () => {
      await prisma.documentTemplate.createMany({
        data: Array.from({ length: 30 }, (_, i) => ({
          slug: `template-${i}`,
          name: `Template ${i}`,
          isActive: true,
        })),
      });

      const response = await request(app.getHttpServer())
        .get(`${API_PREFIX}/document-templates`)
        .query({ page: 2, limit: 10 })
        .expect(200);

      expect(response.body.data).toHaveLength(10);
      expect(response.body.meta).toEqual({
        page: 2,
        limit: 10,
        total: 30,
      });
    });
  });

  describe('GET /document-templates/:id (public)', () => {
    it('should retrieve a document template by id', async () => {
      const template = await prisma.documentTemplate.create({
        data: {
          slug: 'visa-application',
          name: 'Visa Application',
          description: 'Standard visa application template',
          isActive: true,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`${API_PREFIX}/document-templates/${template.id}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: template.id,
          slug: 'visa-application',
          name: 'Visa Application',
          isActive: true,
          versions: [],
          services: [],
        }),
      );
    });

    it('should include versions and services in detail view', async () => {
      const [service] = seedData.services;
      const template = await prisma.documentTemplate.create({
        data: {
          slug: 'visa-application',
          name: 'Visa Application',
          isActive: true,
        },
      });

      await prisma.documentTemplateVersion.create({
        data: {
          templateId: template.id,
          versionNumber: 1,
          label: 'Initial version',
          status: 'ACTIVE',
          content: 'Template content here',
        },
      });

      await prisma.documentTemplateService.create({
        data: {
          templateId: template.id,
          serviceId: service.id,
          isRequired: true,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`${API_PREFIX}/document-templates/${template.id}`)
        .expect(200);

      expect(response.body.versions).toHaveLength(1);
      expect(response.body.services).toHaveLength(1);
    });

    it('should return 404 when template does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`${API_PREFIX}/document-templates/${fakeId}`)
        .expect(404);
    });
  });

  describe('POST /document-templates (admin only)', () => {
    it('should create a document template with admin authentication', async () => {
      const adminAccessToken = await login(seedData.admin.email, seedData.admin.password);

      const response = await request(app.getHttpServer())
        .post(`${API_PREFIX}/document-templates`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          slug: 'visa-application',
          name: 'Visa Application',
          description: 'Standard visa application template',
          defaultLocale: 'en',
          isActive: true,
        })
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          slug: 'visa-application',
          name: 'Visa Application',
          description: 'Standard visa application template',
          defaultLocale: 'en',
          isActive: true,
        }),
      );

      const created = await prisma.documentTemplate.findUnique({
        where: { id: response.body.id },
      });
      expect(created).toBeTruthy();
    });

    it('should reject requests without authentication', async () => {
      await request(app.getHttpServer())
        .post(`${API_PREFIX}/document-templates`)
        .send({
          slug: 'visa-application',
          name: 'Visa Application',
        })
        .expect(401);
    });

    it('should reject requests from non-admin users', async () => {
      const clientAccessToken = await registerClient('client@example.com', 'ClientPass123!');

      await request(app.getHttpServer())
        .post(`${API_PREFIX}/document-templates`)
        .set('Authorization', `Bearer ${clientAccessToken}`)
        .send({
          slug: 'visa-application',
          name: 'Visa Application',
        })
        .expect(403);
    });

    it('should validate required fields', async () => {
      const adminAccessToken = await login(seedData.admin.email, seedData.admin.password);

      await request(app.getHttpServer())
        .post(`${API_PREFIX}/document-templates`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('PATCH /document-templates/:id (admin only)', () => {
    it('should update a document template with admin authentication', async () => {
      const adminAccessToken = await login(seedData.admin.email, seedData.admin.password);

      const template = await prisma.documentTemplate.create({
        data: {
          slug: 'visa-application',
          name: 'Visa Application',
          isActive: true,
        },
      });

      const response = await request(app.getHttpServer())
        .patch(`${API_PREFIX}/document-templates/${template.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Updated Visa Application',
          isActive: false,
        })
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: template.id,
          name: 'Updated Visa Application',
          isActive: false,
        }),
      );

      const updated = await prisma.documentTemplate.findUnique({
        where: { id: template.id },
      });
      expect(updated?.name).toBe('Updated Visa Application');
      expect(updated?.isActive).toBe(false);
    });

    it('should reject requests without authentication', async () => {
      const template = await prisma.documentTemplate.create({
        data: {
          slug: 'visa-application',
          name: 'Visa Application',
          isActive: true,
        },
      });

      await request(app.getHttpServer())
        .patch(`${API_PREFIX}/document-templates/${template.id}`)
        .send({ name: 'Updated Name' })
        .expect(401);
    });

    it('should reject requests from non-admin users', async () => {
      const clientAccessToken = await registerClient('client@example.com', 'ClientPass123!');

      const template = await prisma.documentTemplate.create({
        data: {
          slug: 'visa-application',
          name: 'Visa Application',
          isActive: true,
        },
      });

      await request(app.getHttpServer())
        .patch(`${API_PREFIX}/document-templates/${template.id}`)
        .set('Authorization', `Bearer ${clientAccessToken}`)
        .send({ name: 'Updated Name' })
        .expect(403);
    });

    it('should return 404 when template does not exist', async () => {
      const adminAccessToken = await login(seedData.admin.email, seedData.admin.password);
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .patch(`${API_PREFIX}/document-templates/${fakeId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);
    });
  });

  describe('DELETE /document-templates/:id (admin only)', () => {
    it('should delete a document template with admin authentication', async () => {
      const adminAccessToken = await login(seedData.admin.email, seedData.admin.password);

      const template = await prisma.documentTemplate.create({
        data: {
          slug: 'visa-application',
          name: 'Visa Application',
          isActive: true,
        },
      });

      await request(app.getHttpServer())
        .delete(`${API_PREFIX}/document-templates/${template.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(204);

      const deleted = await prisma.documentTemplate.findUnique({
        where: { id: template.id },
      });
      expect(deleted).toBeNull();
    });

    it('should reject requests without authentication', async () => {
      const template = await prisma.documentTemplate.create({
        data: {
          slug: 'visa-application',
          name: 'Visa Application',
          isActive: true,
        },
      });

      await request(app.getHttpServer())
        .delete(`${API_PREFIX}/document-templates/${template.id}`)
        .expect(401);
    });

    it('should reject requests from non-admin users', async () => {
      const clientAccessToken = await registerClient('client@example.com', 'ClientPass123!');

      const template = await prisma.documentTemplate.create({
        data: {
          slug: 'visa-application',
          name: 'Visa Application',
          isActive: true,
        },
      });

      await request(app.getHttpServer())
        .delete(`${API_PREFIX}/document-templates/${template.id}`)
        .set('Authorization', `Bearer ${clientAccessToken}`)
        .expect(403);
    });

    it('should return 404 when template does not exist', async () => {
      const adminAccessToken = await login(seedData.admin.email, seedData.admin.password);
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .delete(`${API_PREFIX}/document-templates/${fakeId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(404);
    });
  });

  const registerClient = async (email: string, password: string) => {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/register`)
      .send({
        email,
        password,
        firstName: 'Client',
        lastName: 'Example',
      })
      .expect(201);

    return response.body.accessToken as string;
  };

  const login = async (email: string, password: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ email, password })
      .expect(200);

    return response.body.accessToken as string;
  };
});
