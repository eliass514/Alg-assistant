import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@app/app.module';
import { AppConfig } from '@config/app.config';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';
import { PrismaService } from '@prisma/prisma.service';
import { ConversationParticipant, DocumentUploadStatus } from '@prisma/client';

import { resetDatabase, seedBaseData, SeedData } from './helpers/database';

const API_PREFIX = '/api/v1';

describe('Admin Logs (e2e)', () => {
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

  describe('Admin Conversation Logs', () => {
    describe('GET /admin/logs/conversations', () => {
      it('should require authentication', async () => {
        await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/logs/conversations`)
          .expect(401);
      });

      it('should require admin role', async () => {
        await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/logs/conversations`)
          .set('Authorization', `Bearer ${clientAccessToken}`)
          .expect(403);
      });

      it('should list conversation logs for admin', async () => {
        const client = await prisma.user.findUnique({
          where: { email: 'client@example.com' },
        });

        // Create conversation logs
        await prisma.conversationLog.createMany({
          data: [
            {
              userId: client!.id,
              participant: ConversationParticipant.CLIENT,
              locale: 'en',
              message: 'Hello, I need help',
              payload: { intent: 'greeting' },
            },
            {
              userId: client!.id,
              participant: ConversationParticipant.AI_ASSISTANT,
              locale: 'en',
              message: 'Hello! How can I help you today?',
              payload: { intent: 'greeting_response' },
            },
            {
              participant: ConversationParticipant.SYSTEM,
              locale: 'en',
              message: 'Session started',
              payload: { event: 'session_start' },
            },
          ],
        });

        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/logs/conversations`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(response.body.data.length).toBe(3);
        expect(response.body.meta).toEqual({
          page: 1,
          limit: 25,
          total: 3,
        });
      });

      it('should filter logs by userId', async () => {
        const client = await prisma.user.findUnique({
          where: { email: 'client@example.com' },
        });

        await prisma.conversationLog.createMany({
          data: [
            {
              userId: client!.id,
              participant: ConversationParticipant.CLIENT,
              locale: 'en',
              message: 'Client message',
            },
            {
              participant: ConversationParticipant.SYSTEM,
              locale: 'en',
              message: 'System message',
            },
          ],
        });

        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/logs/conversations`)
          .query({ userId: client!.id })
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(200);

        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].userId).toBe(client!.id);
      });

      it('should filter logs by participant', async () => {
        await prisma.conversationLog.createMany({
          data: [
            {
              participant: ConversationParticipant.CLIENT,
              locale: 'en',
              message: 'Client message',
            },
            {
              participant: ConversationParticipant.AI_ASSISTANT,
              locale: 'en',
              message: 'AI response',
            },
            {
              participant: ConversationParticipant.SYSTEM,
              locale: 'en',
              message: 'System message',
            },
          ],
        });

        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/logs/conversations`)
          .query({ participant: ConversationParticipant.AI_ASSISTANT })
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(200);

        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].participant).toBe(ConversationParticipant.AI_ASSISTANT);
      });

      it('should search logs by message content', async () => {
        await prisma.conversationLog.createMany({
          data: [
            {
              participant: ConversationParticipant.CLIENT,
              locale: 'en',
              message: 'I need help with immigration',
            },
            {
              participant: ConversationParticipant.AI_ASSISTANT,
              locale: 'en',
              message: 'I can help you with that',
            },
            {
              participant: ConversationParticipant.CLIENT,
              locale: 'en',
              message: 'What documents do I need?',
            },
          ],
        });

        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/logs/conversations`)
          .query({ search: 'immigration' })
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(200);

        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].message).toContain('immigration');
      });

      it('should support pagination', async () => {
        await prisma.conversationLog.createMany({
          data: Array.from({ length: 30 }, (_, i) => ({
            participant: ConversationParticipant.SYSTEM,
            locale: 'en',
            message: `Message ${i}`,
          })),
        });

        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/logs/conversations`)
          .query({ page: 2, limit: 10 })
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(200);

        expect(response.body.data.length).toBe(10);
        expect(response.body.meta.page).toBe(2);
        expect(response.body.meta.limit).toBe(10);
        expect(response.body.meta.total).toBe(30);
      });

      it('should filter by date range', async () => {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        await prisma.conversationLog.create({
          data: {
            participant: ConversationParticipant.SYSTEM,
            locale: 'en',
            message: 'Test message',
            createdAt: now,
          },
        });

        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/logs/conversations`)
          .query({
            createdFrom: yesterday.toISOString(),
            createdTo: tomorrow.toISOString(),
          })
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(200);

        expect(response.body.data.length).toBe(1);
      });

      it('should reject invalid date range', async () => {
        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/logs/conversations`)
          .query({
            createdFrom: '2024-12-31',
            createdTo: '2024-01-01',
          })
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(400);

        expect(response.body.message).toContain('start of the range must be before the end');
      });
    });
  });

  describe('Admin Document Verification Logs', () => {
    describe('GET /admin/logs/document-verifications', () => {
      it('should require authentication', async () => {
        await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/logs/document-verifications`)
          .expect(401);
      });

      it('should require admin role', async () => {
        await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/logs/document-verifications`)
          .set('Authorization', `Bearer ${clientAccessToken}`)
          .expect(403);
      });

      it('should list document verification status logs', async () => {
        const client = await prisma.user.findUnique({
          where: { email: 'client@example.com' },
        });

        const [service] = seedData.services;

        // Create a document upload
        const upload = await prisma.documentUpload.create({
          data: {
            userId: client!.id,
            serviceId: service.id,
            status: DocumentUploadStatus.VALIDATED,
            storagePath: 'uploads/test.pdf',
            originalFilename: 'test.pdf',
            mimeType: 'application/pdf',
          },
        });

        // Create status history
        await prisma.documentUploadStatusHistory.createMany({
          data: [
            {
              uploadId: upload.id,
              fromStatus: null,
              toStatus: DocumentUploadStatus.PENDING,
              reason: 'Upload initiated',
            },
            {
              uploadId: upload.id,
              fromStatus: DocumentUploadStatus.PENDING,
              toStatus: DocumentUploadStatus.PROCESSING,
              reason: 'Starting validation',
            },
            {
              uploadId: upload.id,
              fromStatus: DocumentUploadStatus.PROCESSING,
              toStatus: DocumentUploadStatus.VALIDATED,
              reason: 'All checks passed',
            },
          ],
        });

        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/logs/document-verifications`)
          .query({ logType: 'status' })
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(response.body.data.length).toBe(3);
        expect(response.body.data[0].type).toBe('status');
        expect(response.body.meta.total).toBe(3);
      });

      it('should list document validation logs', async () => {
        const client = await prisma.user.findUnique({
          where: { email: 'client@example.com' },
        });

        const [service] = seedData.services;

        const upload = await prisma.documentUpload.create({
          data: {
            userId: client!.id,
            serviceId: service.id,
            status: DocumentUploadStatus.VALIDATED,
            storagePath: 'uploads/test.pdf',
            originalFilename: 'test.pdf',
            mimeType: 'application/pdf',
          },
        });

        await prisma.documentUploadValidation.createMany({
          data: [
            {
              uploadId: upload.id,
              status: 'PASSED',
              message: 'File type validation passed',
            },
            {
              uploadId: upload.id,
              status: 'PASSED',
              message: 'File size validation passed',
            },
          ],
        });

        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/logs/document-verifications`)
          .query({ logType: 'validation' })
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(200);

        expect(response.body.data.length).toBe(2);
        expect(response.body.data[0].type).toBe('validation');
      });

      it('should merge both log types when no logType specified', async () => {
        const client = await prisma.user.findUnique({
          where: { email: 'client@example.com' },
        });

        const [service] = seedData.services;

        const upload = await prisma.documentUpload.create({
          data: {
            userId: client!.id,
            serviceId: service.id,
            status: DocumentUploadStatus.VALIDATED,
            storagePath: 'uploads/test.pdf',
            originalFilename: 'test.pdf',
            mimeType: 'application/pdf',
          },
        });

        await prisma.documentUploadStatusHistory.create({
          data: {
            uploadId: upload.id,
            fromStatus: null,
            toStatus: DocumentUploadStatus.PENDING,
          },
        });

        await prisma.documentUploadValidation.create({
          data: {
            uploadId: upload.id,
            status: 'PASSED',
            message: 'Validation passed',
          },
        });

        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/logs/document-verifications`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(200);

        expect(response.body.data.length).toBe(2);
        expect(response.body.meta.total).toBe(2);
      });

      it('should filter logs by uploadId', async () => {
        const client = await prisma.user.findUnique({
          where: { email: 'client@example.com' },
        });

        const [service] = seedData.services;

        const upload1 = await prisma.documentUpload.create({
          data: {
            userId: client!.id,
            serviceId: service.id,
            status: DocumentUploadStatus.PENDING,
            storagePath: 'uploads/test1.pdf',
            originalFilename: 'test1.pdf',
            mimeType: 'application/pdf',
          },
        });

        const upload2 = await prisma.documentUpload.create({
          data: {
            userId: client!.id,
            serviceId: service.id,
            status: DocumentUploadStatus.PENDING,
            storagePath: 'uploads/test2.pdf',
            originalFilename: 'test2.pdf',
            mimeType: 'application/pdf',
          },
        });

        await prisma.documentUploadStatusHistory.createMany({
          data: [
            {
              uploadId: upload1.id,
              toStatus: DocumentUploadStatus.PENDING,
            },
            {
              uploadId: upload2.id,
              toStatus: DocumentUploadStatus.PENDING,
            },
          ],
        });

        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/logs/document-verifications`)
          .query({ uploadId: upload1.id, logType: 'status' })
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(200);

        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].uploadId).toBe(upload1.id);
      });

      it('should filter logs by userId', async () => {
        const client = await prisma.user.findUnique({
          where: { email: 'client@example.com' },
        });

        const admin = await prisma.user.findUnique({
          where: { email: seedData.admin.email },
        });

        const [service] = seedData.services;

        const upload = await prisma.documentUpload.create({
          data: {
            userId: client!.id,
            serviceId: service.id,
            status: DocumentUploadStatus.VALIDATED,
            storagePath: 'uploads/test.pdf',
            originalFilename: 'test.pdf',
            mimeType: 'application/pdf',
          },
        });

        await prisma.documentUploadStatusHistory.createMany({
          data: [
            {
              uploadId: upload.id,
              changedById: admin!.id,
              toStatus: DocumentUploadStatus.VALIDATED,
            },
            {
              uploadId: upload.id,
              changedById: client!.id,
              toStatus: DocumentUploadStatus.PENDING,
            },
          ],
        });

        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/logs/document-verifications`)
          .query({ userId: admin!.id, logType: 'status' })
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(200);

        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].userId).toBe(admin!.id);
      });

      it('should support pagination', async () => {
        const client = await prisma.user.findUnique({
          where: { email: 'client@example.com' },
        });

        const [service] = seedData.services;

        const upload = await prisma.documentUpload.create({
          data: {
            userId: client!.id,
            serviceId: service.id,
            status: DocumentUploadStatus.PENDING,
            storagePath: 'uploads/test.pdf',
            originalFilename: 'test.pdf',
            mimeType: 'application/pdf',
          },
        });

        await prisma.documentUploadStatusHistory.createMany({
          data: Array.from({ length: 30 }, (_, i) => ({
            uploadId: upload.id,
            toStatus: DocumentUploadStatus.PENDING,
            reason: `Status change ${i}`,
          })),
        });

        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/logs/document-verifications`)
          .query({ page: 2, limit: 10, logType: 'status' })
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(200);

        expect(response.body.data.length).toBe(10);
        expect(response.body.meta.page).toBe(2);
        expect(response.body.meta.limit).toBe(10);
      });

      it('should filter by date range', async () => {
        const client = await prisma.user.findUnique({
          where: { email: 'client@example.com' },
        });

        const [service] = seedData.services;

        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const upload = await prisma.documentUpload.create({
          data: {
            userId: client!.id,
            serviceId: service.id,
            status: DocumentUploadStatus.PENDING,
            storagePath: 'uploads/test.pdf',
            originalFilename: 'test.pdf',
            mimeType: 'application/pdf',
          },
        });

        await prisma.documentUploadStatusHistory.create({
          data: {
            uploadId: upload.id,
            toStatus: DocumentUploadStatus.PENDING,
            createdAt: now,
          },
        });

        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/logs/document-verifications`)
          .query({
            createdFrom: yesterday.toISOString(),
            createdTo: tomorrow.toISOString(),
            logType: 'status',
          })
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(200);

        expect(response.body.data.length).toBe(1);
      });
    });
  });
});
