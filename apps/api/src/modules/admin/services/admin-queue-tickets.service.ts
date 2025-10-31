import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';

import { PrismaService } from '@prisma/prisma.service';
import { QueueTicketDetailResponseDto, QueueTicketResponseDto } from '@modules/appointments/dto';
import { AdminQueueTicketsQueryDto } from '../dto/admin-queue-tickets-query.dto';
import { AdminUpdateQueueTicketDto } from '../dto/admin-update-queue-ticket.dto';
import { QueueTicketStatus, AppointmentSlotStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

const MAX_PAGE_SIZE = 100;

type QueueTicketWithRelations = Prisma.QueueTicketGetPayload<{
  include: {
    service: true;
    slot: true;
    user: {
      select: {
        id: true;
        email: true;
        firstName: true;
        lastName: true;
      };
    };
  };
}>;

@Injectable()
export class AdminQueueTicketsService {
  private readonly logger = new Logger(AdminQueueTicketsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listQueueTickets(query: AdminQueueTicketsQueryDto): Promise<{
    data: QueueTicketResponseDto[];
    meta: { page: number; limit: number; total: number };
  }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, MAX_PAGE_SIZE) : 25;
    const skip = (page - 1) * limit;

    this.logger.verbose(
      `Admin listing queue tickets page=${page} limit=${limit} filters=${JSON.stringify(query)}`,
    );

    const where: Prisma.QueueTicketWhereInput = {};

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.serviceId) {
      where.serviceId = query.serviceId;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [tickets, total] = await this.prisma.$transaction([
      this.prisma.queueTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          service: true,
          slot: true,
        },
      }),
      this.prisma.queueTicket.count({ where }),
    ]);

    return {
      data: tickets.map((ticket) => this.mapQueueTicket(ticket)),
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  async getQueueTicketById(id: string): Promise<QueueTicketDetailResponseDto> {
    this.logger.verbose(`Admin retrieving queue ticket ${id}`);

    const ticket = await this.prisma.queueTicket.findUnique({
      where: { id },
      include: {
        service: true,
        slot: true,
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

    if (!ticket) {
      throw new NotFoundException('Queue ticket not found.');
    }

    return {
      data: this.mapQueueTicket(ticket),
    };
  }

  async updateQueueTicket(
    id: string,
    dto: AdminUpdateQueueTicketDto,
  ): Promise<QueueTicketDetailResponseDto> {
    this.logger.verbose(`Admin updating queue ticket ${id}`);

    const result = await this.prisma.$transaction(async (tx) => {
      const ticket = await tx.queueTicket.findUnique({
        where: { id },
        include: { slot: true },
      });

      if (!ticket) {
        throw new NotFoundException('Queue ticket not found.');
      }

      const updateData: Prisma.QueueTicketUpdateInput = {};

      if (dto.status) {
        updateData.status = dto.status;

        if (dto.status === QueueTicketStatus.NOTIFIED) {
          updateData.notifiedAt = new Date();
        }

        if (dto.status === QueueTicketStatus.CANCELLED) {
          updateData.notifiedAt = null;
          updateData.expiresAt = null;
        }
      }

      if (dto.slotId && dto.slotId !== ticket.slotId) {
        const slot = await tx.appointmentSlot.findUnique({ where: { id: dto.slotId } });

        if (!slot) {
          throw new NotFoundException('Appointment slot not found.');
        }

        if (slot.serviceId !== ticket.serviceId) {
          throw new BadRequestException('The selected slot belongs to a different service.');
        }

        if (slot.status === AppointmentSlotStatus.CANCELLED) {
          throw new BadRequestException('The selected slot is no longer available.');
        }

        updateData.slot = { connect: { id: dto.slotId } };
      }

      if (dto.position) {
        if (dto.position < 1) {
          throw new BadRequestException('Position must be greater than 0.');
        }

        const waitingTickets = await tx.queueTicket.findMany({
          where: {
            serviceId: ticket.serviceId,
            status: QueueTicketStatus.WAITING,
            id: { not: ticket.id },
          },
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        });

        const adjustedPosition = Math.min(dto.position, waitingTickets.length + 1);
        for (let index = 0; index < waitingTickets.length; index++) {
          const otherTicket = waitingTickets[index];
          const newPosition = index >= adjustedPosition - 1 ? index + 2 : index + 1;
          if (otherTicket.position !== newPosition) {
            await tx.queueTicket.update({
              where: { id: otherTicket.id },
              data: { position: newPosition },
            });
          }
        }

        updateData.position = adjustedPosition;
      }

      if (dto.notes !== undefined) {
        updateData.notes = dto.notes;
      }

      const updated = await tx.queueTicket.update({
        where: { id },
        data: updateData,
      });

      return updated;
    });

    return this.getQueueTicketById(result.id);
  }

  async deleteQueueTicket(id: string): Promise<void> {
    this.logger.verbose(`Admin deleting queue ticket ${id}`);

    await this.prisma.queueTicket.delete({ where: { id } });
  }

  private mapQueueTicket(ticket: QueueTicketWithRelations): QueueTicketResponseDto {
    return {
      id: ticket.id,
      serviceId: ticket.serviceId,
      slotId: ticket.slotId,
      status: ticket.status,
      position: ticket.position,
      desiredFrom: ticket.desiredFrom?.toISOString() ?? null,
      desiredTo: ticket.desiredTo?.toISOString() ?? null,
      timezone: ticket.timezone,
      notifiedAt: ticket.notifiedAt?.toISOString() ?? null,
      expiresAt: ticket.expiresAt?.toISOString() ?? null,
      notes: ticket.notes ?? null,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    };
  }
}
