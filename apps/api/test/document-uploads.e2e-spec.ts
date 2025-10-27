import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { DocumentUploadStatus } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '@app/app.module';
import { AppConfig } from '@config/app.config';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';
import { PrismaService } from '@prisma/prisma.service';
import { FileStorageService } from '@modules/document-uploads/file-storage.service';

import { resetDatabase, seedBaseData, SeedData } from './helpers/database';

const API_PREFIX = '/api/v1';

describe('Document Uploads (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let fileStorageService: FileStorageService;
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
    fileStorageService = app.get(FileStorageService);

    jest.spyOn(fileStorageService, 'uploadFile').mockResolvedValue({
      fileId: 'mocked-file-id',
      url: 'https://storage.example.com/mocked-file-id',
    });

    jest
      .spyOn(fileStorageService, 'getFileUrl')
      .mockResolvedValue('https://storage.example.com/mocked-file-id');
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await resetDatabase(prisma);
    seedData = await seedBaseData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /document-uploads/upload', () => {
    it('should allow authenticated client to upload a document', async () => {
      const [service] = seedData.services;
      const clientAccessToken = await registerClient('client@example.com', 'ClientPass123!');

      const response = await request(app.getHttpServer())
        .post(`${API_PREFIX}/document-uploads/upload`)
        .set('Authorization', `Bearer ${clientAccessToken}`)
        .field('serviceId', service.id)
        .attach('file', Buffer.from('test file content'), 'document.pdf')
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          serviceId: service.id,
          originalFilename: 'document.pdf',
          status: expect.any(String),
        }),
      );

      expect(fileStorageService.uploadFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        'document.pdf',
      );
    });

    it('should reject uploads without authentication', async () => {
      const [service] = seedData.services;

      await request(app.getHttpServer())
        .post(`${API_PREFIX}/document-uploads/upload`)
        .field('serviceId', service.id)
        .attach('file', Buffer.from('test file content'), 'document.pdf')
        .expect(401);
    });

    it('should reject uploads without file', async () => {
      const [service] = seedData.services;
      const clientAccessToken = await registerClient('client@example.com', 'ClientPass123!');

      await request(app.getHttpServer())
        .post(`${API_PREFIX}/document-uploads/upload`)
        .set('Authorization', `Bearer ${clientAccessToken}`)
        .field('serviceId', service.id)
        .expect(400);
    });

    it('should link upload to appointment when provided', async () => {
      const [service] = seedData.services;
      const clientAccessToken = await registerClient('client@example.com', 'ClientPass123!');
      const clientUser = await prisma.user.findUniqueOrThrow({
        where: { email: 'client@example.com' },
      });

      const appointment = await prisma.appointment.create({
        data: {
          userId: clientUser.id,
          serviceId: service.id,
          scheduledAt: new Date('2030-01-01T10:00:00Z'),
          status: 'SCHEDULED',
          timezone: 'UTC',
        },
      });

      const response = await request(app.getHttpServer())
        .post(`${API_PREFIX}/document-uploads/upload`)
        .set('Authorization', `Bearer ${clientAccessToken}`)
        .field('serviceId', service.id)
        .field('appointmentId', appointment.id)
        .attach('file', Buffer.from('test file content'), 'document.pdf')
        .expect(201);

      expect(response.body.appointmentId).toBe(appointment.id);
    });

    it('should link upload to template when provided', async () => {
      const [service] = seedData.services;
      const clientAccessToken = await registerClient('client@example.com', 'ClientPass123!');

      const template = await prisma.documentTemplate.create({
        data: {
          slug: 'visa-application',
          name: 'Visa Application',
          isActive: true,
        },
      });

      const response = await request(app.getHttpServer())
        .post(`${API_PREFIX}/document-uploads/upload`)
        .set('Authorization', `Bearer ${clientAccessToken}`)
        .field('serviceId', service.id)
        .field('templateId', template.id)
        .attach('file', Buffer.from('test file content'), 'document.pdf')
        .expect(201);

      expect(response.body.templateId).toBe(template.id);
    });
  });

  describe('GET /document-uploads', () => {
    it('should allow admins to see all uploads', async () => {
      const adminAccessToken = await login(seedData.admin.email, seedData.admin.password);

      const [service] = seedData.services;
      await registerClient('client1@example.com', 'ClientPass123!');
      const client1 = await prisma.user.findUniqueOrThrow({
        where: { email: 'client1@example.com' },
      });

      await prisma.documentUpload.createMany({
        data: [
          {
            userId: client1.id,
            serviceId: service.id,
            status: DocumentUploadStatus.PENDING,
            storagePath: 'path1',
            originalFilename: 'doc1.pdf',
            mimeType: 'application/pdf',
            fileSize: 1024,
          },
          {
            userId: client1.id,
            serviceId: service.id,
            status: DocumentUploadStatus.VALIDATED,
            storagePath: 'path2',
            originalFilename: 'doc2.pdf',
            mimeType: 'application/pdf',
            fileSize: 2048,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get(`${API_PREFIX}/document-uploads`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta).toEqual({
        page: 1,
        limit: 25,
        total: 2,
      });
    });

    it('should limit clients to their own uploads', async () => {
      const [service] = seedData.services;

      const client1AccessToken = await registerClient('client1@example.com', 'ClientPass123!');
      const client1 = await prisma.user.findUniqueOrThrow({
        where: { email: 'client1@example.com' },
      });

      await registerClient('client2@example.com', 'ClientPass123!');
      const client2 = await prisma.user.findUniqueOrThrow({
        where: { email: 'client2@example.com' },
      });

      await prisma.documentUpload.createMany({
        data: [
          {
            userId: client1.id,
            serviceId: service.id,
            status: DocumentUploadStatus.PENDING,
            storagePath: 'path1',
            originalFilename: 'client1-doc.pdf',
            mimeType: 'application/pdf',
            fileSize: 1024,
          },
          {
            userId: client2.id,
            serviceId: service.id,
            status: DocumentUploadStatus.PENDING,
            storagePath: 'path2',
            originalFilename: 'client2-doc.pdf',
            mimeType: 'application/pdf',
            fileSize: 2048,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get(`${API_PREFIX}/document-uploads`)
        .set('Authorization', `Bearer ${client1AccessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].originalFilename).toBe('client1-doc.pdf');
    });

    it('should support filtering by status', async () => {
      const [service] = seedData.services;
      const adminAccessToken = await login(seedData.admin.email, seedData.admin.password);
      const adminUser = await prisma.user.findUniqueOrThrow({
        where: { email: seedData.admin.email },
      });

      await prisma.documentUpload.createMany({
        data: [
          {
            userId: adminUser.id,
            serviceId: service.id,
            status: DocumentUploadStatus.PENDING,
            storagePath: 'path1',
            originalFilename: 'pending.pdf',
            mimeType: 'application/pdf',
            fileSize: 1024,
          },
          {
            userId: adminUser.id,
            serviceId: service.id,
            status: DocumentUploadStatus.VALIDATED,
            storagePath: 'path2',
            originalFilename: 'validated.pdf',
            mimeType: 'application/pdf',
            fileSize: 2048,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get(`${API_PREFIX}/document-uploads`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .query({ status: DocumentUploadStatus.VALIDATED })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe(DocumentUploadStatus.VALIDATED);
    });

    it('should support search by filename', async () => {
      const [service] = seedData.services;
      const adminAccessToken = await login(seedData.admin.email, seedData.admin.password);
      const adminUser = await prisma.user.findUniqueOrThrow({
        where: { email: seedData.admin.email },
      });

      await prisma.documentUpload.createMany({
        data: [
          {
            userId: adminUser.id,
            serviceId: service.id,
            status: DocumentUploadStatus.PENDING,
            storagePath: 'path1',
            originalFilename: 'visa-application.pdf',
            mimeType: 'application/pdf',
            fileSize: 1024,
          },
          {
            userId: adminUser.id,
            serviceId: service.id,
            status: DocumentUploadStatus.PENDING,
            storagePath: 'path2',
            originalFilename: 'passport-scan.pdf',
            mimeType: 'application/pdf',
            fileSize: 2048,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get(`${API_PREFIX}/document-uploads`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .query({ search: 'visa' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].originalFilename).toBe('visa-application.pdf');
    });
  });

  describe('GET /document-uploads/my-documents', () => {
    it('should return authenticated user documents', async () => {
      const [service] = seedData.services;
      const clientAccessToken = await registerClient('client@example.com', 'ClientPass123!');
      const client = await prisma.user.findUniqueOrThrow({
        where: { email: 'client@example.com' },
      });

      await prisma.documentUpload.create({
        data: {
          userId: client.id,
          serviceId: service.id,
          status: DocumentUploadStatus.PENDING,
          storagePath: 'path1',
          originalFilename: 'my-doc.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`${API_PREFIX}/document-uploads/my-documents`)
        .set('Authorization', `Bearer ${clientAccessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].originalFilename).toBe('my-doc.pdf');
    });
  });

  describe('GET /document-uploads/:id', () => {
    it('should allow admin to retrieve any upload', async () => {
      const [service] = seedData.services;
      const adminAccessToken = await login(seedData.admin.email, seedData.admin.password);
      await registerClient('client@example.com', 'ClientPass123!');
      const client = await prisma.user.findUniqueOrThrow({
        where: { email: 'client@example.com' },
      });

      const upload = await prisma.documentUpload.create({
        data: {
          userId: client.id,
          serviceId: service.id,
          status: DocumentUploadStatus.PENDING,
          storagePath: 'path1',
          originalFilename: 'doc.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`${API_PREFIX}/document-uploads/${upload.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.id).toBe(upload.id);
      expect(response.body.originalFilename).toBe('doc.pdf');
    });

    it('should allow client to retrieve their own upload', async () => {
      const [service] = seedData.services;
      const clientAccessToken = await registerClient('client@example.com', 'ClientPass123!');
      const client = await prisma.user.findUniqueOrThrow({
        where: { email: 'client@example.com' },
      });

      const upload = await prisma.documentUpload.create({
        data: {
          userId: client.id,
          serviceId: service.id,
          status: DocumentUploadStatus.PENDING,
          storagePath: 'path1',
          originalFilename: 'doc.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`${API_PREFIX}/document-uploads/${upload.id}`)
        .set('Authorization', `Bearer ${clientAccessToken}`)
        .expect(200);

      expect(response.body.id).toBe(upload.id);
    });

    it('should prevent client from retrieving another user upload', async () => {
      const [service] = seedData.services;
      const client1AccessToken = await registerClient('client1@example.com', 'ClientPass123!');
      const client2 = await (async () => {
        await registerClient('client2@example.com', 'ClientPass123!');
        return prisma.user.findUniqueOrThrow({ where: { email: 'client2@example.com' } });
      })();

      const upload = await prisma.documentUpload.create({
        data: {
          userId: client2.id,
          serviceId: service.id,
          status: DocumentUploadStatus.PENDING,
          storagePath: 'path1',
          originalFilename: 'doc.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
        },
      });

      await request(app.getHttpServer())
        .get(`${API_PREFIX}/document-uploads/${upload.id}`)
        .set('Authorization', `Bearer ${client1AccessToken}`)
        .expect(404);
    });
  });

  describe('POST /document-uploads (admin/specialist only)', () => {
    it('should allow admin to create upload record directly', async () => {
      const [service] = seedData.services;
      const adminAccessToken = await login(seedData.admin.email, seedData.admin.password);
      const adminUser = await prisma.user.findUniqueOrThrow({
        where: { email: seedData.admin.email },
      });

      const response = await request(app.getHttpServer())
        .post(`${API_PREFIX}/document-uploads`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          userId: adminUser.id,
          serviceId: service.id,
          status: DocumentUploadStatus.PENDING,
          storagePath: 'storage/path',
          originalFilename: 'document.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
        })
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          serviceId: service.id,
          originalFilename: 'document.pdf',
        }),
      );
    });

    it('should reject client requests', async () => {
      const [service] = seedData.services;
      const clientAccessToken = await registerClient('client@example.com', 'ClientPass123!');
      const client = await prisma.user.findUniqueOrThrow({
        where: { email: 'client@example.com' },
      });

      await request(app.getHttpServer())
        .post(`${API_PREFIX}/document-uploads`)
        .set('Authorization', `Bearer ${clientAccessToken}`)
        .send({
          userId: client.id,
          serviceId: service.id,
          status: DocumentUploadStatus.PENDING,
          storagePath: 'storage/path',
          originalFilename: 'document.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
        })
        .expect(403);
    });
  });

  describe('PATCH /document-uploads/:id (admin/specialist only)', () => {
    it('should allow admin to update upload', async () => {
      const [service] = seedData.services;
      const adminAccessToken = await login(seedData.admin.email, seedData.admin.password);
      const adminUser = await prisma.user.findUniqueOrThrow({
        where: { email: seedData.admin.email },
      });

      const upload = await prisma.documentUpload.create({
        data: {
          userId: adminUser.id,
          serviceId: service.id,
          status: DocumentUploadStatus.PENDING,
          storagePath: 'path1',
          originalFilename: 'doc.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
        },
      });

      const response = await request(app.getHttpServer())
        .patch(`${API_PREFIX}/document-uploads/${upload.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          status: DocumentUploadStatus.VALIDATED,
        })
        .expect(200);

      expect(response.body.status).toBe(DocumentUploadStatus.VALIDATED);
    });

    it('should reject client requests', async () => {
      const [service] = seedData.services;
      await registerClient('client@example.com', 'ClientPass123!');
      const client = await prisma.user.findUniqueOrThrow({
        where: { email: 'client@example.com' },
      });

      const upload = await prisma.documentUpload.create({
        data: {
          userId: client.id,
          serviceId: service.id,
          status: DocumentUploadStatus.PENDING,
          storagePath: 'path1',
          originalFilename: 'doc.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
        },
      });

      const clientAccessToken = await login('client@example.com', 'ClientPass123!');

      await request(app.getHttpServer())
        .patch(`${API_PREFIX}/document-uploads/${upload.id}`)
        .set('Authorization', `Bearer ${clientAccessToken}`)
        .send({
          status: DocumentUploadStatus.VALIDATED,
        })
        .expect(403);
    });
  });

  describe('DELETE /document-uploads/:id', () => {
    it('should allow client to delete their own upload', async () => {
      const [service] = seedData.services;
      const clientAccessToken = await registerClient('client@example.com', 'ClientPass123!');
      const client = await prisma.user.findUniqueOrThrow({
        where: { email: 'client@example.com' },
      });

      const upload = await prisma.documentUpload.create({
        data: {
          userId: client.id,
          serviceId: service.id,
          status: DocumentUploadStatus.PENDING,
          storagePath: 'path1',
          originalFilename: 'doc.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
        },
      });

      await request(app.getHttpServer())
        .delete(`${API_PREFIX}/document-uploads/${upload.id}`)
        .set('Authorization', `Bearer ${clientAccessToken}`)
        .expect(204);

      const deleted = await prisma.documentUpload.findUnique({
        where: { id: upload.id },
      });
      expect(deleted).toBeNull();
    });

    it('should prevent client from deleting another user upload', async () => {
      const [service] = seedData.services;
      const client1AccessToken = await registerClient('client1@example.com', 'ClientPass123!');
      const client2 = await (async () => {
        await registerClient('client2@example.com', 'ClientPass123!');
        return prisma.user.findUniqueOrThrow({ where: { email: 'client2@example.com' } });
      })();

      const upload = await prisma.documentUpload.create({
        data: {
          userId: client2.id,
          serviceId: service.id,
          status: DocumentUploadStatus.PENDING,
          storagePath: 'path1',
          originalFilename: 'doc.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
        },
      });

      await request(app.getHttpServer())
        .delete(`${API_PREFIX}/document-uploads/${upload.id}`)
        .set('Authorization', `Bearer ${client1AccessToken}`)
        .expect(404);
    });

    it('should allow admin to delete any upload', async () => {
      const [service] = seedData.services;
      const adminAccessToken = await login(seedData.admin.email, seedData.admin.password);
      const client = await (async () => {
        await registerClient('client@example.com', 'ClientPass123!');
        return prisma.user.findUniqueOrThrow({ where: { email: 'client@example.com' } });
      })();

      const upload = await prisma.documentUpload.create({
        data: {
          userId: client.id,
          serviceId: service.id,
          status: DocumentUploadStatus.PENDING,
          storagePath: 'path1',
          originalFilename: 'doc.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
        },
      });

      await request(app.getHttpServer())
        .delete(`${API_PREFIX}/document-uploads/${upload.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(204);

      const deleted = await prisma.documentUpload.findUnique({
        where: { id: upload.id },
      });
      expect(deleted).toBeNull();
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
