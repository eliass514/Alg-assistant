import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { PrismaService } from '@prisma/prisma.service';
import { QueueTicketStatus } from '@prisma/client';

import { AdminQueueTicketsService } from './admin-queue-tickets.service';

describe('AdminQueueTicketsService', () => {
  let service: AdminQueueTicketsService;

  const mockPrismaService = {
    queueTicket: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    appointmentSlot: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminQueueTicketsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AdminQueueTicketsService>(AdminQueueTicketsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listQueueTickets', () => {
    it('should return paginated queue tickets', async () => {
      const mockTickets = [
        {
          id: '1',
          userId: 'user1',
          serviceId: 'service1',
          slotId: null,
          status: QueueTicketStatus.WAITING,
          position: 1,
          desiredFrom: null,
          desiredTo: null,
          timezone: 'UTC',
          notifiedAt: null,
          expiresAt: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          service: {
            id: 'service1',
            slug: 'test-service',
            durationMinutes: 60,
          },
          slot: null,
        },
      ];

      mockPrismaService.$transaction.mockResolvedValueOnce([mockTickets, 1]);

      const result = await service.listQueueTickets({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, limit: 10, total: 1 });
    });

    it('should filter by status', async () => {
      mockPrismaService.$transaction.mockResolvedValueOnce([[], 0]);

      await service.listQueueTickets({ status: QueueTicketStatus.WAITING, page: 1, limit: 10 });

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('getQueueTicketById', () => {
    it('should return queue ticket details', async () => {
      const mockTicket = {
        id: '1',
        userId: 'user1',
        serviceId: 'service1',
        slotId: null,
        status: QueueTicketStatus.WAITING,
        position: 1,
        desiredFrom: null,
        desiredTo: null,
        timezone: 'UTC',
        notifiedAt: null,
        expiresAt: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        service: {
          id: 'service1',
          slug: 'test-service',
          durationMinutes: 60,
        },
        slot: null,
        user: {
          id: 'user1',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        },
      };

      mockPrismaService.queueTicket.findUnique.mockResolvedValueOnce(mockTicket);

      const result = await service.getQueueTicketById('1');

      expect(result.data.id).toBe('1');
      expect(mockPrismaService.queueTicket.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if ticket does not exist', async () => {
      mockPrismaService.queueTicket.findUnique.mockResolvedValueOnce(null);

      await expect(service.getQueueTicketById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateQueueTicket', () => {
    it('should update queue ticket status', async () => {
      const mockTicket = {
        id: '1',
        userId: 'user1',
        serviceId: 'service1',
        slotId: null,
        status: QueueTicketStatus.WAITING,
        position: 1,
        desiredFrom: null,
        desiredTo: null,
        timezone: 'UTC',
        notifiedAt: null,
        expiresAt: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        slot: null,
      };

      const updatedTicket = {
        ...mockTicket,
        status: QueueTicketStatus.NOTIFIED,
      };

      mockPrismaService.$transaction.mockImplementationOnce(async (callback) => {
        mockPrismaService.queueTicket.findUnique.mockResolvedValueOnce(mockTicket);
        mockPrismaService.queueTicket.update.mockResolvedValueOnce(updatedTicket);
        return callback(mockPrismaService);
      });

      const mockFullTicket = {
        ...updatedTicket,
        service: {
          id: 'service1',
          slug: 'test-service',
          durationMinutes: 60,
        },
        slot: null,
        user: {
          id: 'user1',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        },
      };

      mockPrismaService.queueTicket.findUnique.mockResolvedValueOnce(mockFullTicket);

      const result = await service.updateQueueTicket('1', {
        status: QueueTicketStatus.NOTIFIED,
      });

      expect(result.data.status).toBe(QueueTicketStatus.WAITING);
    });

    it('should throw NotFoundException if ticket does not exist', async () => {
      mockPrismaService.$transaction.mockImplementationOnce(async (callback) => {
        mockPrismaService.queueTicket.findUnique.mockResolvedValueOnce(null);
        return callback(mockPrismaService);
      });

      await expect(
        service.updateQueueTicket('non-existent', { status: QueueTicketStatus.NOTIFIED }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteQueueTicket', () => {
    it('should delete a queue ticket', async () => {
      mockPrismaService.queueTicket.delete.mockResolvedValueOnce({});

      await service.deleteQueueTicket('1');

      expect(mockPrismaService.queueTicket.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });
  });
});
