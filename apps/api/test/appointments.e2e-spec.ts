import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@app/app.module';
import { AppConfig } from '@config/app.config';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';
import { AppointmentNotificationsService } from '@modules/appointments/appointment-notifications.service';
import { PrismaService } from '@prisma/prisma.service';
import { AppointmentSlotStatus, AppointmentStatus, QueueTicketStatus } from '@prisma/client';

import { resetDatabase, seedBaseData, SeedData } from './helpers/database';

const API_PREFIX = '/api/v1';

describe('Appointments management (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let notifications: AppointmentNotificationsService;
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
    notifications = app.get(AppointmentNotificationsService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    seedData = await seedBaseData(prisma);
    notifications.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns slot availability with accurate occupancy metrics', async () => {
    const [service] = seedData.services;
    const clientAccess = await registerClient('availability-client@example.com', 'ClientPass123!');

    const slotA = await prisma.appointmentSlot.create({
      data: {
        serviceId: service.id,
        startAt: new Date('2030-01-01T09:00:00.000Z'),
        endAt: new Date('2030-01-01T10:00:00.000Z'),
        timezone: 'UTC',
        capacity: 2,
        bufferBeforeMinutes: 30,
        bufferAfterMinutes: 30,
      },
    });

    const slotB = await prisma.appointmentSlot.create({
      data: {
        serviceId: service.id,
        startAt: new Date('2030-01-02T09:00:00.000Z'),
        endAt: new Date('2030-01-02T10:00:00.000Z'),
        timezone: 'UTC',
        capacity: 1,
        bufferBeforeMinutes: 15,
        bufferAfterMinutes: 15,
      },
    });

    const clientUser = await prisma.user.findUniqueOrThrow({
      where: { email: clientAccess.email },
    });

    await prisma.appointment.create({
      data: {
        userId: clientUser.id,
        serviceId: service.id,
        slotId: slotA.id,
        scheduledAt: slotA.startAt,
        status: AppointmentStatus.SCHEDULED,
        timezone: 'UTC',
      },
    });

    await prisma.queueTicket.create({
      data: {
        userId: clientUser.id,
        serviceId: service.id,
        slotId: slotA.id,
        status: QueueTicketStatus.WAITING,
        position: 1,
        timezone: 'UTC',
      },
    });

    const response = await request(app.getHttpServer())
      .get(`${API_PREFIX}/appointments/availability`)
      .set('Authorization', `Bearer ${clientAccess.accessToken}`)
      .query({ serviceId: service.id })
      .expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data).toHaveLength(2);

    const [firstSlot, secondSlot] = response.body.data;
    expect(firstSlot).toEqual(
      expect.objectContaining({
        id: slotA.id,
        available: 1,
        capacity: 2,
        bufferBeforeMinutes: 30,
        bufferAfterMinutes: 30,
        queueLength: 1,
        status: AppointmentSlotStatus.AVAILABLE,
      }),
    );

    expect(secondSlot).toEqual(
      expect.objectContaining({
        id: slotB.id,
        available: 1,
        capacity: 1,
        queueLength: 0,
        status: AppointmentSlotStatus.AVAILABLE,
      }),
    );
  });

  it('books, reschedules, and cancels appointments while emitting notifications', async () => {
    const [service] = seedData.services;
    const client = await registerClient('booking-client@example.com', 'ClientPass123!');

    const originalSlot = await prisma.appointmentSlot.create({
      data: {
        serviceId: service.id,
        startAt: new Date('2030-02-01T09:00:00.000Z'),
        endAt: new Date('2030-02-01T10:00:00.000Z'),
        timezone: 'UTC',
        capacity: 1,
        bufferBeforeMinutes: 60,
        bufferAfterMinutes: 30,
      },
    });

    const rescheduleSlot = await prisma.appointmentSlot.create({
      data: {
        serviceId: service.id,
        startAt: new Date('2030-02-05T11:00:00.000Z'),
        endAt: new Date('2030-02-05T12:00:00.000Z'),
        timezone: 'UTC',
        capacity: 1,
        bufferBeforeMinutes: 30,
        bufferAfterMinutes: 30,
      },
    });

    const bookingResponse = await request(app.getHttpServer())
      .post(`${API_PREFIX}/appointments`)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({
        serviceId: service.id,
        slotId: originalSlot.id,
        notes: 'Morning session preferred',
        locale: 'en',
      })
      .expect(201);

    const appointmentId: string = bookingResponse.body.data.id;
    expect(bookingResponse.body.data.slot.id).toBe(originalSlot.id);
    expect(bookingResponse.body.data.status).toBe(AppointmentStatus.SCHEDULED);

    expect(notifications.getEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'appointment.booked', payload: expect.any(Object) }),
      ]),
    );

    const rescheduleResponse = await request(app.getHttpServer())
      .patch(`${API_PREFIX}/appointments/${appointmentId}/reschedule`)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({
        slotId: rescheduleSlot.id,
        notes: 'Need to shift due to travel',
      })
      .expect(200);

    expect(rescheduleResponse.body.data.slot.id).toBe(rescheduleSlot.id);
    expect(rescheduleResponse.body.data.scheduledAt).toBe(rescheduleSlot.startAt.toISOString());

    const cancelReason = 'Client unavailable';
    const cancelResponse = await request(app.getHttpServer())
      .patch(`${API_PREFIX}/appointments/${appointmentId}/cancel`)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ reason: cancelReason })
      .expect(200);

    expect(cancelResponse.body.data.status).toBe(AppointmentStatus.CANCELLED);

    const historyEntries = await prisma.appointmentStatusHistory.findMany({
      where: { appointmentId },
      orderBy: { createdAt: 'asc' },
    });
    expect(historyEntries).toHaveLength(3);
    expect(historyEntries.map((entry) => entry.event)).toEqual([
      'BOOKED',
      'RESCHEDULED',
      'CANCELLED',
    ]);

    const eventTypes = notifications.getEvents().map((event) => event.type);
    expect(eventTypes).toEqual(
      expect.arrayContaining([
        'appointment.booked',
        'appointment.rescheduled',
        'appointment.cancelled',
      ]),
    );
  });

  it('notifies queued clients when capacity frees up', async () => {
    const [service] = seedData.services;
    const bookingClient = await registerClient('queue-booker@example.com', 'ClientPass123!');
    const queuedClient = await registerClient('queue-waiter@example.com', 'ClientPass123!');

    const targetSlot = await prisma.appointmentSlot.create({
      data: {
        serviceId: service.id,
        startAt: new Date('2030-03-10T12:00:00.000Z'),
        endAt: new Date('2030-03-10T13:00:00.000Z'),
        timezone: 'UTC',
        capacity: 1,
        bufferBeforeMinutes: 45,
        bufferAfterMinutes: 30,
      },
    });

    const booking = await request(app.getHttpServer())
      .post(`${API_PREFIX}/appointments`)
      .set('Authorization', `Bearer ${bookingClient.accessToken}`)
      .send({ serviceId: service.id, slotId: targetSlot.id })
      .expect(201);

    const queuedUser = await prisma.user.findUniqueOrThrow({
      where: { email: queuedClient.email },
    });

    const queueResponse = await request(app.getHttpServer())
      .post(`${API_PREFIX}/appointments/queue`)
      .set('Authorization', `Bearer ${queuedClient.accessToken}`)
      .send({
        serviceId: service.id,
        slotId: targetSlot.id,
        timezone: 'UTC',
        notes: 'Please notify me if someone cancels.',
      })
      .expect(201);

    const queueTicketId: string = queueResponse.body.data.id;

    await request(app.getHttpServer())
      .patch(`${API_PREFIX}/appointments/${booking.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${bookingClient.accessToken}`)
      .send({ reason: 'Unable to make it' })
      .expect(200);

    const updatedTicket = await prisma.queueTicket.findUniqueOrThrow({
      where: { id: queueTicketId },
    });

    expect(updatedTicket.status).toBe(QueueTicketStatus.NOTIFIED);
    expect(updatedTicket.notifiedAt).not.toBeNull();
    expect(updatedTicket.expiresAt).not.toBeNull();

    const notificationTypes = notifications.getEvents().map((event) => event.type);
    expect(notificationTypes).toEqual(
      expect.arrayContaining(['appointment.cancelled', 'queue.ticket.notified']),
    );

    const queueEvents = notifications
      .getEvents()
      .filter((event) => event.type === 'queue.ticket.notified');
    expect(queueEvents[0].payload.ticketId).toBe(queueTicketId);
    expect(queueEvents[0].payload.userId).toBe(queuedUser.id);
  });

  it('enforces queue ticket status permissions and resequences waiting clients', async () => {
    const [service] = seedData.services;
    const clientOne = await registerClient('queue-owner@example.com', 'ClientPass123!');
    const clientTwo = await registerClient('queue-peer@example.com', 'ClientPass123!');

    const slot = await prisma.appointmentSlot.create({
      data: {
        serviceId: service.id,
        startAt: new Date('2030-04-01T09:00:00.000Z'),
        endAt: new Date('2030-04-01T09:45:00.000Z'),
        timezone: 'UTC',
        capacity: 2,
        bufferBeforeMinutes: 20,
        bufferAfterMinutes: 20,
      },
    });

    const queueTicketOne = await request(app.getHttpServer())
      .post(`${API_PREFIX}/appointments/queue`)
      .set('Authorization', `Bearer ${clientOne.accessToken}`)
      .send({
        serviceId: service.id,
        slotId: slot.id,
        notes: 'First in line',
      })
      .expect(201);

    const queueTicketTwo = await request(app.getHttpServer())
      .post(`${API_PREFIX}/appointments/queue`)
      .set('Authorization', `Bearer ${clientTwo.accessToken}`)
      .send({
        serviceId: service.id,
        slotId: slot.id,
        notes: 'Second in line',
      })
      .expect(201);

    const adminAccessToken = await login('amina.admin@example.com', 'Admin123!');

    await request(app.getHttpServer())
      .patch(`${API_PREFIX}/appointments/queue/${queueTicketOne.body.data.id}/status`)
      .set('Authorization', `Bearer ${clientOne.accessToken}`)
      .send({ status: QueueTicketStatus.NOTIFIED })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`${API_PREFIX}/appointments/queue/${queueTicketOne.body.data.id}/status`)
      .set('Authorization', `Bearer ${clientOne.accessToken}`)
      .send({ status: QueueTicketStatus.CANCELLED })
      .expect(200);

    const remainingTicket = await prisma.queueTicket.findUniqueOrThrow({
      where: { id: queueTicketTwo.body.data.id },
    });

    expect(remainingTicket.status).toBe(QueueTicketStatus.NOTIFIED);
    expect(remainingTicket.position).toBe(1);

    await request(app.getHttpServer())
      .patch(`${API_PREFIX}/appointments/queue/${remainingTicket.id}/status`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ status: QueueTicketStatus.COMPLETED, notes: 'Assigned by admin' })
      .expect(200);

    const finalTicketState = await prisma.queueTicket.findUniqueOrThrow({
      where: { id: remainingTicket.id },
    });
    expect(finalTicketState.status).toBe(QueueTicketStatus.COMPLETED);

    const queueUpdateEvents = notifications
      .getEvents()
      .filter((event) => event.type === 'queue.ticket.updated');
    expect(queueUpdateEvents.length).toBeGreaterThanOrEqual(2);
    expect(queueUpdateEvents.map((event) => event.payload.ticketId)).toContain(remainingTicket.id);
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

    return {
      email,
      password,
      accessToken: response.body.accessToken as string,
    };
  };

  const login = async (email: string, password: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ email, password })
      .expect(200);

    return response.body.accessToken as string;
  };
});
