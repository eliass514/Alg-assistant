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

describe('Services catalog (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let seedData: Awaited<ReturnType<typeof seedBaseData>>;

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

  describe('Public catalog access', () => {
    it('returns paginated services with localized content and cache metadata', async () => {
      const response = await request(app.getHttpServer())
        .get(`${API_PREFIX}/services`)
        .query({ locale: 'fr', limit: 10 })
        .expect(200);

      expect(response.body.data).toHaveLength(seedData.services.length);
      expect(response.body.meta).toEqual(
        expect.objectContaining({ page: 1, limit: 10, total: seedData.services.length }),
      );
      expect(response.body.cache).toEqual(
        expect.objectContaining({ key: expect.any(String), ttlSeconds: expect.any(Number) }),
      );

      const [firstService] = response.body.data;
      expect(firstService.translation.locale).toBe('fr');
      expect(firstService.category.translation.locale).toBe('fr');
    });

    it('filters services by category and search term', async () => {
      const category = seedData.categories[0];
      const matchingService = seedData.services.find(
        (service) => service.categoryId === category.id,
      );
      expect(matchingService).toBeDefined();

      const response = await request(app.getHttpServer())
        .get(`${API_PREFIX}/services`)
        .query({
          categoryId: category.id,
          search: 'Residency',
          locale: 'en',
        })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(matchingService?.id);
    });

    it('returns localized service detail with fallback', async () => {
      const targetService = seedData.services.find(
        (service) => service.slug === 'startup-roadmap-session',
      );
      expect(targetService).toBeDefined();

      const response = await request(app.getHttpServer())
        .get(`${API_PREFIX}/services/${targetService?.id}`)
        .query({ locale: 'ar' })
        .expect(200);

      expect(response.body.data.id).toBe(targetService?.id);
      expect(response.body.data.translation.locale).toBe('ar');
      expect(response.body.cache).toEqual(
        expect.objectContaining({ key: expect.any(String), ttlSeconds: expect.any(Number) }),
      );
    });

    it('lists service categories with localized data', async () => {
      const response = await request(app.getHttpServer())
        .get(`${API_PREFIX}/services/categories`)
        .query({ locale: 'en' })
        .expect(200);

      expect(response.body.data).toHaveLength(seedData.categories.length);
      expect(response.body.data[0].translation.locale).toBe('en');
    });
  });

  describe('Admin service management', () => {
    let adminAccessToken: string;

    beforeEach(async () => {
      const loginResponse = await request(app.getHttpServer())
        .post(`${API_PREFIX}/auth/login`)
        .send({
          email: seedData.admin.email,
          password: seedData.admin.password,
        })
        .expect(200);

      adminAccessToken = loginResponse.body.accessToken;
      expect(adminAccessToken).toBeDefined();
    });

    it('allows admins to create, update, and delete services', async () => {
      const category = seedData.categories[0];

      const createPayload = {
        slug: 'document-legalization',
        categoryId: category.id,
        durationMinutes: 45,
        price: '120.00',
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
            description: 'Assistance pour la légalisation auprès des ambassades.',
          },
        ],
      };

      const createResponse = await request(app.getHttpServer())
        .post(`${API_PREFIX}/services`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(createPayload)
        .expect(201);

      expect(createResponse.body.slug).toBe(createPayload.slug);
      expect(createResponse.body.translations).toHaveLength(2);

      const serviceId = createResponse.body.id;

      const updateResponse = await request(app.getHttpServer())
        .patch(`${API_PREFIX}/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          isActive: false,
          translations: [
            {
              locale: 'en',
              name: 'Document Legalization (Updated)',
              description: 'Updated description',
            },
          ],
        })
        .expect(200);

      expect(updateResponse.body.isActive).toBe(false);
      expect(updateResponse.body.translation.name).toContain('Updated');

      await request(app.getHttpServer())
        .delete(`${API_PREFIX}/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(204);

      await request(app.getHttpServer()).get(`${API_PREFIX}/services/${serviceId}`).expect(404);
    });

    it('prevents non-admin users from creating services', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post(`${API_PREFIX}/auth/register`)
        .send({
          email: 'client@example.com',
          password: 'ClientPass123!',
          firstName: 'Client',
          lastName: 'Example',
        })
        .expect(201);

      const category = seedData.categories[0];

      await request(app.getHttpServer())
        .post(`${API_PREFIX}/services`)
        .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
        .send({
          slug: 'unauthorized-service',
          categoryId: category.id,
          durationMinutes: 30,
          price: '50.00',
          translations: [
            {
              locale: 'en',
              name: 'Unauthorized Service',
            },
          ],
        })
        .expect(403);
    });

    it('allows admins to manage categories', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(`${API_PREFIX}/services/categories`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          slug: 'legal-advisory',
          translations: [
            {
              locale: 'en',
              name: 'Legal Advisory',
              description: 'Expert legal advisory services.',
            },
          ],
        })
        .expect(201);

      const categoryId = createResponse.body.id;
      expect(createResponse.body.slug).toBe('legal-advisory');

      const updateResponse = await request(app.getHttpServer())
        .patch(`${API_PREFIX}/services/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          translations: [
            {
              locale: 'en',
              name: 'Legal Advisory & Support',
            },
          ],
        })
        .expect(200);

      expect(updateResponse.body.translation.name).toContain('Support');

      await request(app.getHttpServer())
        .delete(`${API_PREFIX}/services/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(204);
    });
  });
});

const resetDatabase = async (prisma: PrismaService) => {
  await prisma.refreshToken.deleteMany();
  await prisma.conversationLog.deleteMany();
  await prisma.document.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.documentTemplate.deleteMany();
  await prisma.serviceTranslation.deleteMany();
  await prisma.serviceCategoryTranslation.deleteMany();
  await prisma.service.deleteMany();
  await prisma.serviceCategory.deleteMany();
  await prisma.user.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
};

const seedBaseData = async (prisma: PrismaService) => {
  const permissionsData = [
    { key: 'manage_users', description: 'Create, update, and delete user accounts' },
    { key: 'view_users', description: 'View user directory and profiles' },
    { key: 'manage_services', description: 'Create and update services catalog' },
    { key: 'view_services', description: 'View services catalog' },
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
        create: connectPermissions(['view_services']),
      },
    },
  });

  await prisma.role.create({
    data: {
      name: ROLE.CLIENT,
      description: 'End-users booking appointments and receiving documents',
      rolePermissions: {
        create: connectPermissions(['view_services']),
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
      locale: 'en',
      roleId: adminRole.id,
    },
  });

  const categories = await Promise.all([
    prisma.serviceCategory.create({
      data: {
        slug: 'immigration-support',
        translations: {
          create: [
            {
              locale: 'en',
              name: 'Immigration Support',
              description: 'Guidance for visa processing and residency applications.',
            },
            {
              locale: 'fr',
              name: "Assistance à l'immigration",
              description: 'Conseils pour le traitement des visas et les demandes de résidence.',
            },
            {
              locale: 'ar',
              name: 'دعم الهجرة',
              description: 'إرشادات لإجراءات التأشيرة وطلبات الإقامة.',
            },
          ],
        },
      },
    }),
    prisma.serviceCategory.create({
      data: {
        slug: 'business-consulting',
        translations: {
          create: [
            {
              locale: 'en',
              name: 'Business Consulting',
              description: 'Tailored advisory services for entrepreneurs and startups.',
            },
            {
              locale: 'fr',
              name: 'Conseil en affaires',
              description: 'Conseils personnalisés pour les entrepreneurs et les startups.',
            },
            {
              locale: 'ar',
              name: 'استشارات الأعمال',
              description: 'خدمات استشارية مخصصة لرواد الأعمال والشركات الناشئة.',
            },
          ],
        },
      },
    }),
  ]);

  const services = await Promise.all([
    prisma.service.create({
      data: {
        slug: 'residency-application-review',
        category: {
          connect: {
            id: categories[0].id,
          },
        },
        durationMinutes: 60,
        price: '150.00',
        translations: {
          create: [
            {
              locale: 'en',
              name: 'Residency Application Review',
              summary: 'Detailed checklist session',
              description: 'Detailed review of your residency application documents.',
            },
            {
              locale: 'fr',
              name: 'Révision de dossier de résidence',
              description: 'Révision détaillée des documents de votre demande de résidence.',
            },
            {
              locale: 'ar',
              name: 'مراجعة طلب الإقامة',
              description: 'مراجعة تفصيلية لمستندات طلب الإقامة الخاصة بك.',
            },
          ],
        },
      },
    }),
    prisma.service.create({
      data: {
        slug: 'startup-roadmap-session',
        category: {
          connect: {
            id: categories[1].id,
          },
        },
        durationMinutes: 45,
        price: '95.00',
        translations: {
          create: [
            {
              locale: 'en',
              name: 'Startup Roadmap Session',
              summary: 'Plan your first 90 days',
              description: 'Plan your first 90 days with an expert consultant.',
            },
            {
              locale: 'fr',
              name: 'Séance de feuille de route pour startup',
              description: 'Planifiez vos 90 premiers jours avec un consultant expert.',
            },
            {
              locale: 'ar',
              name: 'جلسة خارطة طريق للشركات الناشئة',
              description: 'خطط لأول 90 يومًا مع مستشار خبير.',
            },
          ],
        },
      },
    }),
  ]);

  return {
    admin: {
      email: adminEmail,
      password: adminPassword,
    },
    categories,
    services,
  } as const;
};
