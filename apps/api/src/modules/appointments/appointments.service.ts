import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DateTime } from 'luxon';

import { ROLE } from '@common/constants/role.constants';
import { PaginationQueryDto } from '@acme/shared-dto';
import {
  AppointmentAvailabilityQueryDto,
  AppointmentAvailabilityResponseDto,
  AppointmentDetailResponseDto,
  AppointmentDetailsDto,
  AppointmentListResponseDto,
  AppointmentSlotAvailabilityDto,
  BookAppointmentDto,
  CancelAppointmentDto,
  CreateQueueTicketDto,
  QueueTicketDetailResponseDto,
  QueueTicketResponseDto,
  RescheduleAppointmentDto,
  UpdateQueueTicketStatusDto,
} from '@modules/appointments/dto';
import { AppointmentNotificationsService } from '@modules/appointments/appointment-notifications.service';
import { AuthenticatedUser } from '@modules/auth/interfaces/authenticated-user.interface';
import {
  AppointmentSlot,
  AppointmentSlotStatus,
  AppointmentStatus,
  AppointmentStatusEventType,
  Prisma,
  QueueTicket,
  QueueTicketStatus,
} from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';

const DEFAULT_AVAILABILITY_WINDOW_DAYS = 30;
const QUEUE_HOLD_MINUTES = 30;
const MAX_PAGE_SIZE = 100;

type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: {
    service: true;
    slot: true;
    queueTicket: true;
  };
}>;

type SlotWithRelations = Prisma.AppointmentSlotGetPayload<{
  include: {
    appointments: true;
    queueTickets: true;
  };
}>;

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: AppointmentNotificationsService,
  ) {}

  async list(query: PaginationQueryDto): Promise<AppointmentListResponseDto> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, MAX_PAGE_SIZE) : 25;
    const skip = (page - 1) * limit;

    this.logger.verbose(`Listing appointments page=${page} limit=${limit}`);

    const [appointments, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        skip,
        take: limit,
        orderBy: { scheduledAt: 'asc' },
        include: {
          service: true,
          slot: true,
          queueTicket: true,
        },
      }),
      this.prisma.appointment.count(),
    ]);

    return {
      data: appointments.map((appointment) => this.mapAppointment(appointment)),
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  async getById(id: string): Promise<AppointmentDetailResponseDto> {
    this.logger.verbose(`Retrieving appointment ${id}`);

    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        service: true,
        slot: true,
        queueTicket: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found.');
    }

    return {
      data: this.mapAppointment(appointment),
    };
  }

  async getAvailability(
    query: AppointmentAvailabilityQueryDto,
  ): Promise<AppointmentAvailabilityResponseDto> {
    const zone = query.timezone ?? 'UTC';
    const rangeStart = query.from ? this.parseDateTime(query.from, zone) : DateTime.utc();
    const rangeEnd = query.to
      ? this.parseDateTime(query.to, zone)
      : rangeStart.plus({ days: DEFAULT_AVAILABILITY_WINDOW_DAYS });

    if (rangeEnd <= rangeStart) {
      throw new BadRequestException('The end of the availability window must be after the start.');
    }

    const slots = await this.prisma.appointmentSlot.findMany({
      where: {
        serviceId: query.serviceId,
        startAt: { gte: rangeStart.toJSDate() },
        endAt: { lte: rangeEnd.toJSDate() },
        status: { not: AppointmentSlotStatus.CANCELLED },
      },
      orderBy: { startAt: 'asc' },
      include: {
        appointments: true,
        queueTickets: true,
      },
    });

    return {
      data: slots.map((slot) => this.mapSlotAvailability(slot)),
    };
  }

  async book(
    user: AuthenticatedUser,
    payload: BookAppointmentDto,
  ): Promise<AppointmentDetailResponseDto> {
    this.logger.verbose(`Booking appointment for user=${user.id} slot=${payload.slotId}`);

    const result = await this.prisma.$transaction(async (tx) => {
      const slot = await this.findSlotOrThrow(payload.slotId, tx);

      if (slot.serviceId !== payload.serviceId) {
        throw new BadRequestException(
          'The selected slot does not belong to the specified service.',
        );
      }

      this.ensureSlotBookable(slot);

      const existingCount = await tx.appointment.count({
        where: {
          slotId: slot.id,
          status: { not: AppointmentStatus.CANCELLED },
        },
      });

      if (existingCount >= slot.capacity) {
        throw new BadRequestException('The selected slot has reached its capacity.');
      }

      let queueTicket: QueueTicket | null = null;
      if (payload.queueTicketId) {
        queueTicket = await this.claimQueueTicket(tx, payload.queueTicketId, user, slot);
      }

      const appointment = await tx.appointment.create({
        data: {
          userId: user.id,
          serviceId: payload.serviceId,
          slotId: slot.id,
          queueTicketId: payload.queueTicketId ?? null,
          scheduledAt: slot.startAt,
          status: AppointmentStatus.SCHEDULED,
          notes: payload.notes ?? null,
          locale: payload.locale ?? user.locale ?? 'en',
          timezone: payload.timezone ?? slot.timezone ?? 'UTC',
        },
      });

      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: appointment.id,
          event: AppointmentStatusEventType.BOOKED,
          fromStatus: null,
          toStatus: AppointmentStatus.SCHEDULED,
          notes: payload.queueTicketId ? 'Booked from queue ticket' : (payload.notes ?? null),
        },
      });

      await this.updateSlotOccupancyStatus(tx, slot.id);

      return {
        appointment,
        slot,
        queueTicket,
      };
    });

    this.notifications.appointmentBooked({
      appointmentId: result.appointment.id,
      userId: result.appointment.userId,
      serviceId: result.appointment.serviceId,
      slotId: result.appointment.slotId,
      scheduledAt: result.appointment.scheduledAt,
    });

    if (result.queueTicket) {
      this.notifications.queueTicketUpdated({
        ticketId: result.queueTicket.id,
        userId: result.queueTicket.userId,
        serviceId: result.queueTicket.serviceId,
        status: QueueTicketStatus.COMPLETED,
      });
    }

    return this.getById(result.appointment.id);
  }

  async reschedule(
    appointmentId: string,
    user: AuthenticatedUser,
    payload: RescheduleAppointmentDto,
  ): Promise<AppointmentDetailResponseDto> {
    this.logger.verbose(`Rescheduling appointment ${appointmentId} to slot=${payload.slotId}`);

    const result = await this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          slot: true,
        },
      });

      if (!appointment) {
        throw new NotFoundException('Appointment not found.');
      }

      this.assertCanModifyAppointment(appointment, user);

      if (appointment.status === AppointmentStatus.CANCELLED) {
        throw new BadRequestException('Cancelled appointments cannot be rescheduled.');
      }

      const newSlot = await this.findSlotOrThrow(payload.slotId, tx);

      if (newSlot.serviceId !== appointment.serviceId) {
        throw new BadRequestException('The selected slot belongs to a different service.');
      }

      if (appointment.slotId === newSlot.id) {
        throw new BadRequestException(
          'The appointment is already scheduled in the specified slot.',
        );
      }

      this.ensureSlotBookable(newSlot);

      const occupiedCount = await tx.appointment.count({
        where: {
          id: { not: appointment.id },
          slotId: newSlot.id,
          status: { not: AppointmentStatus.CANCELLED },
        },
      });

      if (occupiedCount >= newSlot.capacity) {
        throw new BadRequestException('The selected slot has reached its capacity.');
      }

      const updated = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          slotId: newSlot.id,
          scheduledAt: newSlot.startAt,
          timezone: payload.timezone ?? newSlot.timezone ?? appointment.timezone,
          notes: payload.notes ?? appointment.notes,
        },
      });

      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: appointment.id,
          event: AppointmentStatusEventType.RESCHEDULED,
          fromStatus: appointment.status,
          toStatus: updated.status,
          notes: payload.notes ?? null,
        },
      });

      if (appointment.slotId) {
        await this.updateSlotOccupancyStatus(tx, appointment.slotId);
      }

      await this.updateSlotOccupancyStatus(tx, newSlot.id);

      return {
        appointment: updated,
        previousSlotId: appointment.slotId ?? null,
        newSlotId: newSlot.id,
      };
    });

    this.notifications.appointmentRescheduled({
      appointmentId: result.appointment.id,
      userId: result.appointment.userId,
      serviceId: result.appointment.serviceId,
      previousSlotId: result.previousSlotId,
      newSlotId: result.newSlotId,
      scheduledAt: result.appointment.scheduledAt,
    });

    if (result.previousSlotId) {
      await this.notifyNextTicketForService(result.appointment.serviceId);
    }

    return this.getById(result.appointment.id);
  }

  async cancel(
    appointmentId: string,
    user: AuthenticatedUser,
    payload: CancelAppointmentDto,
  ): Promise<AppointmentDetailResponseDto> {
    this.logger.verbose(`Cancelling appointment ${appointmentId}`);

    const result = await this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (!appointment) {
        throw new NotFoundException('Appointment not found.');
      }

      this.assertCanModifyAppointment(appointment, user);

      if (appointment.status === AppointmentStatus.CANCELLED) {
        throw new BadRequestException('The appointment has already been cancelled.');
      }

      const updated = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: AppointmentStatus.CANCELLED,
          notes: payload.reason ?? appointment.notes,
        },
      });

      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: appointment.id,
          event: AppointmentStatusEventType.CANCELLED,
          fromStatus: appointment.status,
          toStatus: AppointmentStatus.CANCELLED,
          notes: payload.reason ?? null,
        },
      });

      if (appointment.slotId) {
        await this.updateSlotOccupancyStatus(tx, appointment.slotId);
      }

      return {
        appointment: updated,
        slotId: appointment.slotId ?? null,
      };
    });

    this.notifications.appointmentCancelled({
      appointmentId: result.appointment.id,
      userId: result.appointment.userId,
      serviceId: result.appointment.serviceId,
      slotId: result.slotId,
      reason: payload.reason ?? null,
    });

    await this.notifyNextTicketForService(result.appointment.serviceId);

    return this.getById(result.appointment.id);
  }

  async createQueueTicket(
    user: AuthenticatedUser,
    payload: CreateQueueTicketDto,
  ): Promise<QueueTicketDetailResponseDto> {
    this.logger.verbose(`Creating queue ticket for user=${user.id} service=${payload.serviceId}`);

    const ticket = await this.prisma.$transaction(async (tx) => {
      const service = await tx.service.findUnique({ where: { id: payload.serviceId } });
      if (!service) {
        throw new NotFoundException('Service not found.');
      }

      let slot: AppointmentSlot | null = null;
      if (payload.slotId) {
        slot = await this.findSlotOrThrow(payload.slotId, tx);
        if (slot.serviceId !== payload.serviceId) {
          throw new BadRequestException(
            'The queue ticket slot does not belong to the specified service.',
          );
        }
        if (slot.status === AppointmentSlotStatus.CANCELLED) {
          throw new BadRequestException('The referenced slot is no longer available.');
        }
      }

      const waitingCount = await tx.queueTicket.count({
        where: {
          serviceId: payload.serviceId,
          status: QueueTicketStatus.WAITING,
        },
      });

      const desiredZone = payload.timezone ?? slot?.timezone ?? 'UTC';
      const desiredFrom = payload.desiredFrom
        ? this.parseDateTime(payload.desiredFrom, desiredZone).toJSDate()
        : null;
      const desiredTo = payload.desiredTo
        ? this.parseDateTime(payload.desiredTo, desiredZone).toJSDate()
        : null;

      if (desiredFrom && desiredTo && desiredTo <= desiredFrom) {
        throw new BadRequestException('The desired end time must be after the start time.');
      }

      const ticket = await tx.queueTicket.create({
        data: {
          userId: user.id,
          serviceId: payload.serviceId,
          slotId: payload.slotId ?? null,
          position: waitingCount + 1,
          status: QueueTicketStatus.WAITING,
          desiredFrom,
          desiredTo,
          timezone: desiredZone,
          notes: payload.notes ?? null,
        },
      });

      return ticket;
    });

    this.notifications.queueTicketCreated({
      ticketId: ticket.id,
      userId: ticket.userId,
      serviceId: ticket.serviceId,
      position: ticket.position,
    });

    return {
      data: this.mapQueueTicket(ticket)!,
    };
  }

  async updateQueueTicketStatus(
    ticketId: string,
    user: AuthenticatedUser,
    payload: UpdateQueueTicketStatusDto,
  ): Promise<QueueTicketDetailResponseDto> {
    this.logger.verbose(`Updating queue ticket ${ticketId} status=${payload.status}`);

    const ticket = await this.prisma.queueTicket.findUnique({ where: { id: ticketId } });

    if (!ticket) {
      throw new NotFoundException('Queue ticket not found.');
    }

    const isOwner = ticket.userId === user.id;
    const isPrivileged = user.role === ROLE.ADMIN || user.role === ROLE.SPECIALIST;

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenException('You do not have permission to update this queue ticket.');
    }

    if (!isPrivileged && payload.status !== QueueTicketStatus.CANCELLED) {
      throw new ForbiddenException(
        'Only administrators can modify the ticket beyond cancellation.',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.queueTicket.findUnique({ where: { id: ticketId } });
      if (!existing) {
        throw new NotFoundException('Queue ticket not found.');
      }

      const updateData: Prisma.QueueTicketUpdateInput = {
        status: payload.status,
        notes: payload.notes ?? existing.notes,
      };

      if (payload.status === QueueTicketStatus.NOTIFIED) {
        updateData.notifiedAt = new Date();
        updateData.expiresAt = DateTime.utc().plus({ minutes: QUEUE_HOLD_MINUTES }).toJSDate();
      } else {
        updateData.notifiedAt = null;
        updateData.expiresAt = null;
      }

      if (
        payload.status === QueueTicketStatus.WAITING &&
        existing.status !== QueueTicketStatus.WAITING
      ) {
        const waitingCount = await tx.queueTicket.count({
          where: {
            serviceId: existing.serviceId,
            status: QueueTicketStatus.WAITING,
            NOT: { id: existing.id },
          },
        });
        updateData.position = waitingCount + 1;
      }

      const updatedTicket = await tx.queueTicket.update({
        where: { id: ticketId },
        data: updateData,
      });

      if (
        existing.status === QueueTicketStatus.WAITING &&
        payload.status !== QueueTicketStatus.WAITING
      ) {
        await this.resequenceQueue(tx, existing.serviceId, ticketId);
      }

      return updatedTicket;
    });

    this.notifications.queueTicketUpdated({
      ticketId: updated.id,
      userId: updated.userId,
      serviceId: updated.serviceId,
      status: updated.status,
    });

    if (updated.status === QueueTicketStatus.CANCELLED) {
      await this.notifyNextTicketForService(updated.serviceId);
    }

    return {
      data: this.mapQueueTicket(updated)!,
    };
  }

  private mapAppointment(appointment: AppointmentWithRelations): AppointmentDetailsDto {
    return {
      id: appointment.id,
      userId: appointment.userId,
      serviceId: appointment.serviceId,
      slotId: appointment.slotId,
      queueTicketId: appointment.queueTicketId,
      status: appointment.status,
      scheduledAt: appointment.scheduledAt.toISOString(),
      timezone: appointment.timezone,
      locale: appointment.locale,
      notes: appointment.notes ?? null,
      createdAt: appointment.createdAt.toISOString(),
      updatedAt: appointment.updatedAt.toISOString(),
      service: {
        id: appointment.service.id,
        slug: appointment.service.slug,
        durationMinutes: appointment.service.durationMinutes,
      },
      slot: appointment.slot
        ? {
            id: appointment.slot.id,
            startAt: appointment.slot.startAt.toISOString(),
            endAt: appointment.slot.endAt.toISOString(),
            timezone: appointment.slot.timezone,
            capacity: appointment.slot.capacity,
            status: appointment.slot.status,
            bufferBeforeMinutes: appointment.slot.bufferBeforeMinutes,
            bufferAfterMinutes: appointment.slot.bufferAfterMinutes,
          }
        : null,
      queueTicket: this.mapQueueTicket(appointment.queueTicket),
    };
  }

  private mapQueueTicket(queueTicket: QueueTicket | null): QueueTicketResponseDto | null {
    if (!queueTicket) {
      return null;
    }

    return {
      id: queueTicket.id,
      serviceId: queueTicket.serviceId,
      slotId: queueTicket.slotId,
      status: queueTicket.status,
      position: queueTicket.position,
      desiredFrom: queueTicket.desiredFrom?.toISOString() ?? null,
      desiredTo: queueTicket.desiredTo?.toISOString() ?? null,
      timezone: queueTicket.timezone,
      notifiedAt: queueTicket.notifiedAt?.toISOString() ?? null,
      expiresAt: queueTicket.expiresAt?.toISOString() ?? null,
      notes: queueTicket.notes ?? null,
      createdAt: queueTicket.createdAt.toISOString(),
      updatedAt: queueTicket.updatedAt.toISOString(),
    };
  }

  private mapSlotAvailability(slot: SlotWithRelations): AppointmentSlotAvailabilityDto {
    const activeAppointments = slot.appointments.filter(
      (appointment) => appointment.status !== AppointmentStatus.CANCELLED,
    );
    const waitingTickets = slot.queueTickets.filter(
      (ticket) => ticket.status === QueueTicketStatus.WAITING,
    );
    const available = Math.max(slot.capacity - activeAppointments.length, 0);

    let status = slot.status;
    if (slot.status !== AppointmentSlotStatus.CANCELLED) {
      status = available > 0 ? AppointmentSlotStatus.AVAILABLE : AppointmentSlotStatus.FULL;
    }

    return {
      id: slot.id,
      serviceId: slot.serviceId,
      startAt: slot.startAt.toISOString(),
      endAt: slot.endAt.toISOString(),
      timezone: slot.timezone,
      capacity: slot.capacity,
      available,
      status,
      bufferBeforeMinutes: slot.bufferBeforeMinutes,
      bufferAfterMinutes: slot.bufferAfterMinutes,
      queueLength: waitingTickets.length,
      notes: slot.notes ?? null,
    };
  }

  private parseDateTime(value: string, timezone: string): DateTime {
    const dateTime = DateTime.fromISO(value, { zone: timezone });

    if (!dateTime.isValid) {
      throw new BadRequestException(`Invalid date-time value provided: ${value}`);
    }

    return dateTime.toUTC();
  }

  private ensureSlotBookable(slot: AppointmentSlot): void {
    if (slot.status === AppointmentSlotStatus.CANCELLED) {
      throw new BadRequestException('The selected slot is no longer available.');
    }

    const now = DateTime.utc();
    const slotStart = DateTime.fromJSDate(slot.startAt);
    const bookingCutoff = slotStart.minus({ minutes: slot.bufferBeforeMinutes });

    if (now > bookingCutoff) {
      throw new BadRequestException('The selected slot can no longer be booked.');
    }
  }

  private async findSlotOrThrow(
    slotId: string,
    tx: Prisma.TransactionClient,
  ): Promise<AppointmentSlot> {
    const slot = await tx.appointmentSlot.findUnique({ where: { id: slotId } });

    if (!slot) {
      throw new NotFoundException('Appointment slot not found.');
    }

    return slot;
  }

  private assertCanModifyAppointment(
    appointment: { userId: string },
    user: AuthenticatedUser,
  ): void {
    const isOwner = appointment.userId === user.id;
    const isPrivileged = user.role === ROLE.ADMIN || user.role === ROLE.SPECIALIST;

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenException('You do not have permission to modify this appointment.');
    }
  }

  private async updateSlotOccupancyStatus(
    tx: Prisma.TransactionClient,
    slotId: string,
  ): Promise<void> {
    const slot = await tx.appointmentSlot.findUnique({ where: { id: slotId } });

    if (!slot || slot.status === AppointmentSlotStatus.CANCELLED) {
      return;
    }

    const activeCount = await tx.appointment.count({
      where: {
        slotId,
        status: { not: AppointmentStatus.CANCELLED },
      },
    });

    const nextStatus =
      activeCount >= slot.capacity ? AppointmentSlotStatus.FULL : AppointmentSlotStatus.AVAILABLE;

    if (nextStatus !== slot.status) {
      await tx.appointmentSlot.update({
        where: { id: slotId },
        data: { status: nextStatus },
      });
    }
  }

  private async resequenceQueue(
    tx: Prisma.TransactionClient,
    serviceId: string,
    excludeTicketId?: string,
  ): Promise<void> {
    const waitingTickets = await tx.queueTicket.findMany({
      where: {
        serviceId,
        status: QueueTicketStatus.WAITING,
        ...(excludeTicketId ? { id: { not: excludeTicketId } } : {}),
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });

    await Promise.all(
      waitingTickets.map((ticket, index) => {
        const desiredPosition = index + 1;
        if (ticket.position === desiredPosition) {
          return Promise.resolve();
        }

        return tx.queueTicket.update({
          where: { id: ticket.id },
          data: { position: desiredPosition },
        });
      }),
    );
  }

  private async notifyNextTicketForService(serviceId: string): Promise<void> {
    const nextTicket = await this.prisma.queueTicket.findFirst({
      where: {
        serviceId,
        status: QueueTicketStatus.WAITING,
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });

    if (!nextTicket) {
      return;
    }

    const expiresAt = DateTime.utc().plus({ minutes: QUEUE_HOLD_MINUTES }).toJSDate();

    const updated = await this.prisma.queueTicket.update({
      where: { id: nextTicket.id },
      data: {
        status: QueueTicketStatus.NOTIFIED,
        notifiedAt: new Date(),
        expiresAt,
      },
    });

    this.notifications.queueTicketNotified({
      ticketId: updated.id,
      userId: updated.userId,
      serviceId: updated.serviceId,
      slotId: updated.slotId ?? null,
      expiresAt,
    });
  }

  private async claimQueueTicket(
    tx: Prisma.TransactionClient,
    queueTicketId: string,
    user: AuthenticatedUser,
    slot: AppointmentSlot,
  ): Promise<QueueTicket> {
    const queueTicket = await tx.queueTicket.findUnique({ where: { id: queueTicketId } });

    if (!queueTicket) {
      throw new NotFoundException('Queue ticket not found.');
    }

    const isOwner = queueTicket.userId === user.id;
    const isPrivileged = user.role === ROLE.ADMIN || user.role === ROLE.SPECIALIST;

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenException('You cannot claim this queue ticket.');
    }

    if (queueTicket.serviceId !== slot.serviceId) {
      throw new BadRequestException('Queue ticket does not match the targeted service.');
    }

    if (
      queueTicket.status !== QueueTicketStatus.WAITING &&
      queueTicket.status !== QueueTicketStatus.NOTIFIED
    ) {
      throw new BadRequestException('Queue ticket is no longer active.');
    }

    const updatedTicket = await tx.queueTicket.update({
      where: { id: queueTicketId },
      data: {
        status: QueueTicketStatus.COMPLETED,
        slotId: slot.id,
        notifiedAt: null,
        expiresAt: null,
      },
    });

    await this.resequenceQueue(tx, queueTicket.serviceId, queueTicketId);

    return updatedTicket;
  }
}
