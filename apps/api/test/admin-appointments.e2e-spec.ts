import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@app/app.module';
import { AppConfig } from '@config/app.config';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';
import { PrismaService } from '@prisma/prisma.service';
import { AppointmentStatus, QueueTicketStatus } from '@prisma/client';

import { resetDatabase, seedBaseData, SeedData } from './helpers/database';

const API_PREFIX = '/api/v1';

describe('Admin Appointments and Queue Tickets (e2e)', () => {
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

  describe('Admin Appointments Management', () => {
    describe('GET /admin/appointments', () => {
      it('should list all appointments for admin', async () => {
        const [service] = seedData.services;
        const client = await prisma.user.findUnique({
          where: { email: 'client@example.com' },
        });

        const slot = await prisma.appointmentSlot.create({
          data: {
            serviceId: service.id,
            startAt: new Date('2030-01-01T09:00:00.000Z'),
            endAt: new Date('2030-01-01T10:00:00.000Z'),
            timezone: 'UTC',
            capacity: 1,
          },
        });

        await prisma.appointment.create({
          data: {
            userId: client!.id,
            serviceId: service.id,
            slotId: slot.id,
            scheduledAt: slot.startAt,
            status: AppointmentStatus.SCHEDULED,
          },
        });

        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/appointments`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .query({ page: 1, limit: 10 })
          .expect(200);

        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0]).toMatchObject({
          userId: client!.id,
          serviceId: service.id,
          status: AppointmentStatus.SCHEDULED,
        });
        expect(response.body.meta).toEqual({
          page: 1,
          limit: 10,
          total: 1,
        });
      });

      it('should filter appointments by user ID', async () => {
        const [service] = seedData.services;
        const client = await prisma.user.findUnique({
          where: { email: 'client@example.com' },
        });

        const slot = await prisma.appointmentSlot.create({
          data: {
            serviceId: service.id,
            startAt: new Date('2030-01-01T09:00:00.000Z'),
            endAt: new Date('2030-01-01T10:00:00.000Z'),
            timezone: 'UTC',
            capacity: 1,
          },
        });

        await prisma.appointment.create({
          data: {
            userId: client!.id,
            serviceId: service.id,
            slotId: slot.id,
            scheduledAt: slot.startAt,
            status: AppointmentStatus.SCHEDULED,
          },
        });

        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/appointments`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .query({ userId: client!.id })
          .expect(200);

        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].userId).toBe(client!.id);
      });

      it('should filter appointments by status', async () => {
        const [service] = seedData.services;
        const client = await prisma.user.findUnique({
          where: { email: 'client@example.com' },
        });

        const slot = await prisma.appointmentSlot.create({
          data: {
            serviceId: service.id,
            startAt: new Date('2030-01-01T09:00:00.000Z'),
            endAt: new Date('2030-01-01T10:00:00.000Z'),
            timezone: 'UTC',
            capacity: 1,
          },
        });

        await prisma.appointment.create({
          data: {
            userId: client!.id,
            serviceId: service.id,
            slotId: slot.id,
            scheduledAt: slot.startAt,
            status: AppointmentStatus.CANCELLED,
          },
        });

        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/appointments`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .query({ status: AppointmentStatus.CANCELLED })
          .expect(200);

        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].status).toBe(AppointmentStatus.CANCELLED);
      });

      it('should forbid non-admin users', async () => {
        await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/appointments`)
          .set('Authorization', `Bearer ${clientAccessToken}`)
          .expect(403);
      });
    });

    describe('GET /admin/appointments/:id', () => {
      it('should get appointment details', async () => {
        const [service] = seedData.services;
        const client = await prisma.user.findUnique({
          where: { email: 'client@example.com' },
        });

        const slot = await prisma.appointmentSlot.create({
          data: {
            serviceId: service.id,
            startAt: new Date('2030-01-01T09:00:00.000Z'),
            endAt: new Date('2030-01-01T10:00:00.000Z'),
            timezone: 'UTC',
            capacity: 1,
          },
        });

        const appointment = await prisma.appointment.create({
          data: {
            userId: client!.id,
            serviceId: service.id,
            slotId: slot.id,
            scheduledAt: slot.startAt,
            status: AppointmentStatus.SCHEDULED,
          },
        });

        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/appointments/${appointment.id}`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(200);

        expect(response.body.data).toMatchObject({
          id: appointment.id,
          userId: client!.id,
          serviceId: service.id,
          status: AppointmentStatus.SCHEDULED,
        });
      });

      it('should return 404 for non-existent appointment', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';

        await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/appointments/${fakeId}`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(404);
      });
    });

    describe('PATCH /admin/appointments/:id', () => {
      it('should update appointment status', async () => {
        const [service] = seedData.services;
        const client = await prisma.user.findUnique({
          where: { email: 'client@example.com' },
        });

        const slot = await prisma.appointmentSlot.create({
          data: {
            serviceId: service.id,
            startAt: new Date('2030-01-01T09:00:00.000Z'),
            endAt: new Date('2030-01-01T10:00:00.000Z'),
            timezone: 'UTC',
            capacity: 1,
          },
        });

        const appointment = await prisma.appointment.create({
          data: {
            userId: client!.id,
            serviceId: service.id,
            slotId: slot.id,
            scheduledAt: slot.startAt,
            status: AppointmentStatus.SCHEDULED,
          },
        });

        const response = await request(app.getHttpServer())
          .patch(`${API_PREFIX}/admin/appointments/${appointment.id}`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({ status: AppointmentStatus.CONFIRMED })
          .expect(200);

        expect(response.body.data.status).toBe(AppointmentStatus.CONFIRMED);

        const updated = await prisma.appointment.findUnique({
          where: { id: appointment.id },
        });

        expect(updated!.status).toBe(AppointmentStatus.CONFIRMED);
      });

      it('should reschedule appointment to a different slot', async () => {
        const [service] = seedData.services;
        const client = await prisma.user.findUnique({
          where: { email: 'client@example.com' },
        });

        const slot1 = await prisma.appointmentSlot.create({
          data: {
            serviceId: service.id,
            startAt: new Date('2030-01-01T09:00:00.000Z'),
            endAt: new Date('2030-01-01T10:00:00.000Z'),
            timezone: 'UTC',
            capacity: 1,
          },
        });

        const slot2 = await prisma.appointmentSlot.create({
          data: {
            serviceId: service.id,
            startAt: new Date('2030-01-02T09:00:00.000Z'),
            endAt: new Date('2030-01-02T10:00:00.000Z'),
            timezone: 'UTC',
            capacity: 1,
          },
        });

        const appointment = await prisma.appointment.create({
          data: {
            userId: client!.id,
            serviceId: service.id,
            slotId: slot1.id,
            scheduledAt: slot1.startAt,
            status: AppointmentStatus.SCHEDULED,
          },
        });

        const response = await request(app.getHttpServer())
          .patch(`${API_PREFIX}/admin/appointments/${appointment.id}`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({ slotId: slot2.id })
          .expect(200);

        expect(response.body.data.slotId).toBe(slot2.id);

        const updated = await prisma.appointment.findUnique({
          where: { id: appointment.id },
        });

        expect(updated!.slotId).toBe(slot2.id);
        expect(updated!.scheduledAt).toEqual(slot2.startAt);
      });

      it('should update appointment notes', async () => {
        const [service] = seedData.services;
        const client = await prisma.user.findUnique({
          where: { email: 'client@example.com' },
        });

        const slot = await prisma.appointmentSlot.create({
          data: {
            serviceId: service.id,
            startAt: new Date('2030-01-01T09:00:00.000Z'),
            endAt: new Date('2030-01-01T10:00:00.000Z'),
            timezone: 'UTC',
            capacity: 1,
          },
        });

        const appointment = await prisma.appointment.create({
          data: {
            userId: client!.id,
            serviceId: service.id,
            slotId: slot.id,
            scheduledAt: slot.startAt,
            status: AppointmentStatus.SCHEDULED,
          },
        });

        const response = await request(app.getHttpServer())
          .patch(`${API_PREFIX}/admin/appointments/${appointment.id}`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({ notes: 'Admin updated notes' })
          .expect(200);

        expect(response.body.data.notes).toBe('Admin updated notes');
      });
    });

    describe('DELETE /admin/appointments/:id', () => {
      it('should delete an appointment', async () => {
        const [service] = seedData.services;
        const client = await prisma.user.findUnique({
          where: { email: 'client@example.com' },
        });

        const slot = await prisma.appointmentSlot.create({
          data: {
            serviceId: service.id,
            startAt: new Date('2030-01-01T09:00:00.000Z'),
            endAt: new Date('2030-01-01T10:00:00.000Z'),
            timezone: 'UTC',
            capacity: 1,
          },
        });

        const appointment = await prisma.appointment.create({
          data: {
            userId: client!.id,
            serviceId: service.id,
            slotId: slot.id,
            scheduledAt: slot.startAt,
            status: AppointmentStatus.SCHEDULED,
          },
        });

        await request(app.getHttpServer())
          .delete(`${API_PREFIX}/admin/appointments/${appointment.id}`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(204);

        const deleted = await prisma.appointment.findUnique({
          where: { id: appointment.id },
        });

        expect(deleted).toBeNull();
      });
    });
  });

  describe('Admin Queue Tickets Management', () => {
    describe('GET /admin/queue-tickets', () => {
      it('should list all queue tickets for admin', async () => {
        const [service] = seedData.services;
        const client = await prisma.user.findUnique({
          where: { email: 'client@example.com' },
        });

        await prisma.queueTicket.create({
          data: {
            userId: client!.id,
            serviceId: service.id,
            status: QueueTicketStatus.WAITING,
            position: 1,
          },
        });

        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/queue-tickets`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .query({ page: 1, limit: 10 })
          .expect(200);

        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0]).toMatchObject({
          userId: client!.id,
          serviceId: service.id,
          status: QueueTicketStatus.WAITING,
          position: 1,
        });
      });

      it('should filter queue tickets by status', async () => {
        const [service] = seedData.services;
        const client = await prisma.user.findUnique({
          where: { email: 'client@example.com' },
        });

        await prisma.queueTicket.create({
          data: {
            userId: client!.id,
            serviceId: service.id,
            status: QueueTicketStatus.COMPLETED,
            position: 1,
          },
        });

        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/queue-tickets`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .query({ status: QueueTicketStatus.COMPLETED })
          .expect(200);

        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].status).toBe(QueueTicketStatus.COMPLETED);
      });

      it('should forbid non-admin users', async () => {
        await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/queue-tickets`)
          .set('Authorization', `Bearer ${clientAccessToken}`)
          .expect(403);
      });
    });

    describe('GET /admin/queue-tickets/:id', () => {
      it('should get queue ticket details', async () => {
        const [service] = seedData.services;
        const client = await prisma.user.findUnique({
          where: { email: 'client@example.com' },
        });

        const ticket = await prisma.queueTicket.create({
          data: {
            userId: client!.id,
            serviceId: service.id,
            status: QueueTicketStatus.WAITING,
            position: 1,
          },
        });

        const response = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/queue-tickets/${ticket.id}`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(200);

        expect(response.body.data).toMatchObject({
          id: ticket.id,
          userId: client!.id,
          serviceId: service.id,
          status: QueueTicketStatus.WAITING,
          position: 1,
        });
      });
    });

    describe('PATCH /admin/queue-tickets/:id', () => {
      it('should update queue ticket status', async () => {
        const [service] = seedData.services;
        const client = await prisma.user.findUnique({
          where: { email: 'client@example.com' },
        });

        const ticket = await prisma.queueTicket.create({
          data: {
            userId: client!.id,
            serviceId: service.id,
            status: QueueTicketStatus.WAITING,
            position: 1,
          },
        });

        const response = await request(app.getHttpServer())
          .patch(`${API_PREFIX}/admin/queue-tickets/${ticket.id}`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({ status: QueueTicketStatus.NOTIFIED })
          .expect(200);

        expect(response.body.data.status).toBe(QueueTicketStatus.NOTIFIED);

        const updated = await prisma.queueTicket.findUnique({
          where: { id: ticket.id },
        });

        expect(updated!.status).toBe(QueueTicketStatus.NOTIFIED);
        expect(updated!.notifiedAt).toBeDefined();
      });

      it('should update queue ticket notes', async () => {
        const [service] = seedData.services;
        const client = await prisma.user.findUnique({
          where: { email: 'client@example.com' },
        });

        const ticket = await prisma.queueTicket.create({
          data: {
            userId: client!.id,
            serviceId: service.id,
            status: QueueTicketStatus.WAITING,
            position: 1,
          },
        });

        const response = await request(app.getHttpServer())
          .patch(`${API_PREFIX}/admin/queue-tickets/${ticket.id}`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({ notes: 'Priority ticket' })
          .expect(200);

        expect(response.body.data.notes).toBe('Priority ticket');
      });
    });

    describe('DELETE /admin/queue-tickets/:id', () => {
      it('should delete a queue ticket', async () => {
        const [service] = seedData.services;
        const client = await prisma.user.findUnique({
          where: { email: 'client@example.com' },
        });

        const ticket = await prisma.queueTicket.create({
          data: {
            userId: client!.id,
            serviceId: service.id,
            status: QueueTicketStatus.WAITING,
            position: 1,
          },
        });

        await request(app.getHttpServer())
          .delete(`${API_PREFIX}/admin/queue-tickets/${ticket.id}`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(204);

        const deleted = await prisma.queueTicket.findUnique({
          where: { id: ticket.id },
        });

        expect(deleted).toBeNull();
      });
    });
  });
});
