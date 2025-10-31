import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';

import { PrismaService } from '@prisma/prisma.service';
import {
  AppointmentListResponseDto,
  AppointmentDetailResponseDto,
  AppointmentDetailsDto,
} from '@modules/appointments/dto';
import {
  AppointmentStatus,
  AppointmentStatusEventType,
  AppointmentSlotStatus,
  Prisma,
} from '@prisma/client';

import { AdminAppointmentsQueryDto } from '../dto/admin-appointments-query.dto';
import { AdminUpdateAppointmentDto } from '../dto/admin-update-appointment.dto';

const MAX_PAGE_SIZE = 100;

type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: {
    service: true;
    slot: true;
    queueTicket: true;
  };
}>;

@Injectable()
export class AdminAppointmentsService {
  private readonly logger = new Logger(AdminAppointmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listAppointments(query: AdminAppointmentsQueryDto): Promise<AppointmentListResponseDto> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, MAX_PAGE_SIZE) : 25;
    const skip = (page - 1) * limit;

    this.logger.verbose(
      `Admin listing appointments page=${page} limit=${limit} filters=${JSON.stringify(query)}`,
    );

    const where: Prisma.AppointmentWhereInput = {};

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.serviceId) {
      where.serviceId = query.serviceId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.scheduledFrom || query.scheduledTo) {
      const from = query.scheduledFrom ? new Date(query.scheduledFrom) : undefined;
      const to = query.scheduledTo ? new Date(query.scheduledTo) : undefined;

      if (from && to && from > to) {
        throw new BadRequestException('The start of the range must be before the end.');
      }

      where.scheduledAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }

    const [appointments, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'desc' },
        include: {
          service: true,
          slot: true,
          queueTicket: true,
        },
      }),
      this.prisma.appointment.count({ where }),
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

  async getAppointmentById(id: string): Promise<AppointmentDetailResponseDto> {
    this.logger.verbose(`Admin retrieving appointment ${id}`);

    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        service: true,
        slot: true,
        queueTicket: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found.');
    }

    return {
      data: this.mapAppointment(appointment),
    };
  }

  async updateAppointment(
    id: string,
    dto: AdminUpdateAppointmentDto,
  ): Promise<AppointmentDetailResponseDto> {
    this.logger.verbose(`Admin updating appointment ${id}`);

    const result = await this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id },
        include: { slot: true },
      });

      if (!appointment) {
        throw new NotFoundException('Appointment not found.');
      }

      const updateData: Prisma.AppointmentUpdateInput = {};
      const historyNotes: string[] = [];

      // Update status if provided
      if (dto.status && dto.status !== appointment.status) {
        updateData.status = dto.status;
        historyNotes.push(`Status changed from ${appointment.status} to ${dto.status}`);
      }

      // Update slot (reschedule) if provided
      if (dto.slotId && dto.slotId !== appointment.slotId) {
        const newSlot = await tx.appointmentSlot.findUnique({
          where: { id: dto.slotId },
        });

        if (!newSlot) {
          throw new NotFoundException('Appointment slot not found.');
        }

        if (newSlot.serviceId !== appointment.serviceId) {
          throw new BadRequestException('The selected slot belongs to a different service.');
        }

        if (newSlot.status === AppointmentSlotStatus.CANCELLED) {
          throw new BadRequestException('The selected slot is no longer available.');
        }

        // Check capacity
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

        updateData.slot = { connect: { id: newSlot.id } };
        updateData.scheduledAt = newSlot.startAt;
        updateData.timezone = newSlot.timezone;
        historyNotes.push(`Rescheduled to slot ${dto.slotId}`);
      }

      // Update notes if provided
      if (dto.notes !== undefined) {
        updateData.notes = dto.notes;
      }

      const updated = await tx.appointment.update({
        where: { id },
        data: updateData,
      });

      // Record status history
      if (dto.status || dto.slotId) {
        await tx.appointmentStatusHistory.create({
          data: {
            appointmentId: id,
            event: dto.slotId
              ? AppointmentStatusEventType.RESCHEDULED
              : dto.status === AppointmentStatus.CANCELLED
                ? AppointmentStatusEventType.CANCELLED
                : AppointmentStatusEventType.BOOKED,
            fromStatus: appointment.status,
            toStatus: updated.status,
            notes: historyNotes.join('; '),
          },
        });
      }

      // Update slot occupancy if slot changed
      if (dto.slotId && appointment.slotId) {
        await this.updateSlotOccupancyStatus(tx, appointment.slotId);
        await this.updateSlotOccupancyStatus(tx, dto.slotId);
      }

      return updated;
    });

    return this.getAppointmentById(result.id);
  }

  async deleteAppointment(id: string): Promise<void> {
    this.logger.verbose(`Admin deleting appointment ${id}`);

    await this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id },
      });

      if (!appointment) {
        throw new NotFoundException('Appointment not found.');
      }

      await tx.appointment.delete({
        where: { id },
      });

      // Update slot occupancy if slot exists
      if (appointment.slotId) {
        await this.updateSlotOccupancyStatus(tx, appointment.slotId);
      }
    });
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
      queueTicket: appointment.queueTicket
        ? {
            id: appointment.queueTicket.id,
            serviceId: appointment.queueTicket.serviceId,
            slotId: appointment.queueTicket.slotId,
            status: appointment.queueTicket.status,
            position: appointment.queueTicket.position,
            desiredFrom: appointment.queueTicket.desiredFrom?.toISOString() ?? null,
            desiredTo: appointment.queueTicket.desiredTo?.toISOString() ?? null,
            timezone: appointment.queueTicket.timezone,
            notifiedAt: appointment.queueTicket.notifiedAt?.toISOString() ?? null,
            expiresAt: appointment.queueTicket.expiresAt?.toISOString() ?? null,
            notes: appointment.queueTicket.notes ?? null,
            createdAt: appointment.queueTicket.createdAt.toISOString(),
            updatedAt: appointment.queueTicket.updatedAt.toISOString(),
          }
        : null,
    };
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
}
