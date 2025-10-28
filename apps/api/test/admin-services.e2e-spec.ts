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

describe('Admin Services and Categories (e2e)', () => {
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

  describe('Admin Services Management', () => {
    describe('GET /admin/services', () => {
      it('should list all services for admin with pagination', async () => {
        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/services`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .query({ page: 1, limit: 10 })
          .expect(200);

        expect(response.body.data).toHaveLength(seedData.services.length);
        expect(response.body.meta).toEqual(
          expect.objectContaining({
            page: 1,
            limit: 10,
            total: seedData.services.length,
          }),
        );
      });

      it('should filter services by category', async () => {
        const category = seedData.categories[0];
        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/services`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .query({ categoryId: category.id })
          .expect(200);

        expect(response.body.data.length).toBeGreaterThan(0);
        response.body.data.forEach((service: { category: { id: string } }) => {
          expect(service.category.id).toBe(category.id);
        });
      });

      it('should filter services by search term', async () => {
        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/services`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .query({ search: 'Residency' })
          .expect(200);

        expect(response.body.data.length).toBeGreaterThan(0);
      });

      it('should filter services by isActive status', async () => {
        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/services`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .query({ isActive: true })
          .expect(200);

        response.body.data.forEach((service: { isActive: boolean }) => {
          expect(service.isActive).toBe(true);
        });
      });

      it('should deny access to non-admin users', async () => {
        await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/services`)
          .set('Authorization', `Bearer ${clientAccessToken}`)
          .expect(403);
      });

      it('should deny access to unauthenticated users', async () => {
        await request(app.getHttpServer()).get(`${API_PREFIX}/admin/services`).expect(401);
      });
    });

    describe('GET /admin/services/:id', () => {
      it('should get a service by id', async () => {
        const service = seedData.services[0];
        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/services/${service.id}`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(200);

        expect(response.body.id).toBe(service.id);
        expect(response.body.slug).toBe(service.slug);
      });

      it('should return 404 for non-existent service', async () => {
        await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/services/00000000-0000-0000-0000-000000000000`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(404);
      });

      it('should deny access to non-admin users', async () => {
        const service = seedData.services[0];
        await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/services/${service.id}`)
          .set('Authorization', `Bearer ${clientAccessToken}`)
          .expect(403);
      });
    });

    describe('POST /admin/services', () => {
      it('should create a new service', async () => {
        const category = seedData.categories[0];
        const payload = {
          slug: 'document-legalization',
          categoryId: category.id,
          durationMinutes: 45,
          price: '120.00',
          isActive: true,
          translations: [
            {
              locale: 'en',
              name: 'Document Legalization',
              summary: 'Support for embassy legalization',
              description: 'Assistance preparing documents for embassy legalization.',
            },
            {
              locale: 'fr',
              name: 'Légalisation de documents',
              summary: 'Soutien pour la légalisation',
              description: 'Assistance pour la légalisation auprès des ambassades.',
            },
          ],
        };

        const response = await request(app.getHttpServer())
          .post(`${API_PREFIX}/admin/services`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send(payload)
          .expect(201);

        expect(response.body.slug).toBe(payload.slug);
        expect(response.body.durationMinutes).toBe(payload.durationMinutes);
        expect(response.body.price).toBe(payload.price);
        expect(response.body.translations).toHaveLength(2);
      });

      it('should reject invalid service data', async () => {
        const payload = {
          slug: '',
          categoryId: 'invalid-uuid',
          durationMinutes: -10,
          price: 'invalid',
          translations: [],
        };

        await request(app.getHttpServer())
          .post(`${API_PREFIX}/admin/services`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send(payload)
          .expect(400);
      });

      it('should deny access to non-admin users', async () => {
        const category = seedData.categories[0];
        const payload = {
          slug: 'unauthorized-service',
          categoryId: category.id,
          durationMinutes: 30,
          price: '50.00',
          translations: [{ locale: 'en', name: 'Unauthorized Service' }],
        };

        await request(app.getHttpServer())
          .post(`${API_PREFIX}/admin/services`)
          .set('Authorization', `Bearer ${clientAccessToken}`)
          .send(payload)
          .expect(403);
      });
    });

    describe('PATCH /admin/services/:id', () => {
      it('should update a service', async () => {
        const service = seedData.services[0];
        const payload = {
          isActive: false,
          price: '175.00',
          translations: [
            {
              locale: 'en',
              name: 'Updated Service Name',
              description: 'Updated description',
            },
          ],
        };

        const response = await request(app.getHttpServer())
          .patch(`${API_PREFIX}/admin/services/${service.id}`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send(payload)
          .expect(200);

        expect(response.body.isActive).toBe(false);
        expect(response.body.price).toBe('175.00');
      });

      it('should return 404 when updating non-existent service', async () => {
        await request(app.getHttpServer())
          .patch(`${API_PREFIX}/admin/services/00000000-0000-0000-0000-000000000000`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({ isActive: false })
          .expect(404);
      });

      it('should deny access to non-admin users', async () => {
        const service = seedData.services[0];
        await request(app.getHttpServer())
          .patch(`${API_PREFIX}/admin/services/${service.id}`)
          .set('Authorization', `Bearer ${clientAccessToken}`)
          .send({ isActive: false })
          .expect(403);
      });
    });

    describe('DELETE /admin/services/:id', () => {
      it('should delete a service', async () => {
        const service = seedData.services[0];

        await request(app.getHttpServer())
          .delete(`${API_PREFIX}/admin/services/${service.id}`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(204);

        await request(app.getHttpServer()).get(`${API_PREFIX}/services/${service.id}`).expect(404);
      });

      it('should return 404 when deleting non-existent service', async () => {
        await request(app.getHttpServer())
          .delete(`${API_PREFIX}/admin/services/00000000-0000-0000-0000-000000000000`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(404);
      });

      it('should deny access to non-admin users', async () => {
        const service = seedData.services[0];
        await request(app.getHttpServer())
          .delete(`${API_PREFIX}/admin/services/${service.id}`)
          .set('Authorization', `Bearer ${clientAccessToken}`)
          .expect(403);
      });
    });
  });

  describe('Admin Categories Management', () => {
    describe('GET /admin/categories', () => {
      it('should list all categories for admin with pagination', async () => {
        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/categories`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .query({ page: 1, limit: 10 })
          .expect(200);

        expect(response.body.data).toHaveLength(seedData.categories.length);
        expect(response.body.meta).toEqual(
          expect.objectContaining({
            page: 1,
            limit: 10,
            total: seedData.categories.length,
          }),
        );
      });

      it('should filter categories by search term', async () => {
        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/categories`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .query({ search: 'Immigration' })
          .expect(200);

        expect(response.body.data.length).toBeGreaterThan(0);
      });

      it('should filter categories by isActive status', async () => {
        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/categories`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .query({ isActive: true })
          .expect(200);

        response.body.data.forEach((category: { isActive: boolean }) => {
          expect(category.isActive).toBe(true);
        });
      });

      it('should deny access to non-admin users', async () => {
        await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/categories`)
          .set('Authorization', `Bearer ${clientAccessToken}`)
          .expect(403);
      });
    });

    describe('GET /admin/categories/:id', () => {
      it('should get a category by id', async () => {
        const category = seedData.categories[0];
        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/categories/${category.id}`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(200);

        expect(response.body.id).toBe(category.id);
        expect(response.body.slug).toBe(category.slug);
      });

      it('should return 404 for non-existent category', async () => {
        await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/categories/00000000-0000-0000-0000-000000000000`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(404);
      });

      it('should deny access to non-admin users', async () => {
        const category = seedData.categories[0];
        await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/categories/${category.id}`)
          .set('Authorization', `Bearer ${clientAccessToken}`)
          .expect(403);
      });
    });

    describe('POST /admin/categories', () => {
      it('should create a new category', async () => {
        const payload = {
          slug: 'legal-advisory',
          isActive: true,
          translations: [
            {
              locale: 'en',
              name: 'Legal Advisory',
              description: 'Expert legal advisory services.',
            },
            {
              locale: 'fr',
              name: 'Conseil juridique',
              description: 'Services de conseil juridique expert.',
            },
          ],
        };

        const response = await request(app.getHttpServer())
          .post(`${API_PREFIX}/admin/categories`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send(payload)
          .expect(201);

        expect(response.body.slug).toBe(payload.slug);
        expect(response.body.isActive).toBe(true);
        expect(response.body.translations).toHaveLength(2);
      });

      it('should reject invalid category data', async () => {
        const payload = {
          slug: '',
          translations: [],
        };

        await request(app.getHttpServer())
          .post(`${API_PREFIX}/admin/categories`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send(payload)
          .expect(400);
      });

      it('should deny access to non-admin users', async () => {
        const payload = {
          slug: 'unauthorized-category',
          translations: [{ locale: 'en', name: 'Unauthorized Category' }],
        };

        await request(app.getHttpServer())
          .post(`${API_PREFIX}/admin/categories`)
          .set('Authorization', `Bearer ${clientAccessToken}`)
          .send(payload)
          .expect(403);
      });
    });

    describe('PATCH /admin/categories/:id', () => {
      it('should update a category', async () => {
        const category = seedData.categories[0];
        const payload = {
          isActive: false,
          translations: [
            {
              locale: 'en',
              name: 'Updated Category Name',
              description: 'Updated description',
            },
          ],
        };

        const response = await request(app.getHttpServer())
          .patch(`${API_PREFIX}/admin/categories/${category.id}`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send(payload)
          .expect(200);

        expect(response.body.isActive).toBe(false);
      });

      it('should return 404 when updating non-existent category', async () => {
        await request(app.getHttpServer())
          .patch(`${API_PREFIX}/admin/categories/00000000-0000-0000-0000-000000000000`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({ isActive: false })
          .expect(404);
      });

      it('should deny access to non-admin users', async () => {
        const category = seedData.categories[0];
        await request(app.getHttpServer())
          .patch(`${API_PREFIX}/admin/categories/${category.id}`)
          .set('Authorization', `Bearer ${clientAccessToken}`)
          .send({ isActive: false })
          .expect(403);
      });
    });

    describe('DELETE /admin/categories/:id', () => {
      it('should delete a category without services', async () => {
        const category = await prisma.serviceCategory.create({
          data: {
            slug: 'empty-category',
            translations: {
              create: [{ locale: 'en', name: 'Empty Category' }],
            },
          },
        });

        await request(app.getHttpServer())
          .delete(`${API_PREFIX}/admin/categories/${category.id}`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(204);

        await request(app.getHttpServer())
          .get(`${API_PREFIX}/services/categories/${category.id}`)
          .expect(404);
      });

      it('should return 404 when deleting non-existent category', async () => {
        await request(app.getHttpServer())
          .delete(`${API_PREFIX}/admin/categories/00000000-0000-0000-0000-000000000000`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(404);
      });

      it('should deny access to non-admin users', async () => {
        const category = seedData.categories[0];
        await request(app.getHttpServer())
          .delete(`${API_PREFIX}/admin/categories/${category.id}`)
          .set('Authorization', `Bearer ${clientAccessToken}`)
          .expect(403);
      });
    });
  });

  describe('Full CRUD Workflow', () => {
    it('should complete a full category and service lifecycle', async () => {
      const categoryPayload = {
        slug: 'workflow-category',
        translations: [{ locale: 'en', name: 'Workflow Category' }],
      };

      const categoryResponse = await request(app.getHttpServer())
        .post(`${API_PREFIX}/admin/categories`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(categoryPayload)
        .expect(201);

      const categoryId = categoryResponse.body.id;

      const servicePayload = {
        slug: 'workflow-service',
        categoryId,
        durationMinutes: 30,
        price: '100.00',
        translations: [{ locale: 'en', name: 'Workflow Service' }],
      };

      const serviceResponse = await request(app.getHttpServer())
        .post(`${API_PREFIX}/admin/services`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(servicePayload)
        .expect(201);

      const serviceId = serviceResponse.body.id;

      await request(app.getHttpServer())
        .patch(`${API_PREFIX}/admin/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ isActive: false })
        .expect(200);

      await request(app.getHttpServer())
        .delete(`${API_PREFIX}/admin/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .delete(`${API_PREFIX}/admin/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(204);
    });
  });
});
