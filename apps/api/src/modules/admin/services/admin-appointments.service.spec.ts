import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { PrismaService } from '@prisma/prisma.service';
import { AppointmentStatus, AppointmentSlotStatus } from '@prisma/client';

import { AdminAppointmentsService } from './admin-appointments.service';

describe('AdminAppointmentsService', () => {
  let service: AdminAppointmentsService;

  const mockPrismaService = {
    appointment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    appointmentSlot: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    appointmentStatusHistory: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAppointmentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AdminAppointmentsService>(AdminAppointmentsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listAppointments', () => {
    it('should return paginated appointments', async () => {
      const mockAppointments = [
        {
          id: '1',
          userId: 'user1',
          serviceId: 'service1',
          slotId: 'slot1',
          queueTicketId: null,
          status: AppointmentStatus.SCHEDULED,
          scheduledAt: new Date('2030-01-01T09:00:00.000Z'),
          timezone: 'UTC',
          locale: 'en',
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          service: {
            id: 'service1',
            slug: 'test-service',
            durationMinutes: 60,
          },
          slot: {
            id: 'slot1',
            startAt: new Date('2030-01-01T09:00:00.000Z'),
            endAt: new Date('2030-01-01T10:00:00.000Z'),
            timezone: 'UTC',
            capacity: 1,
            status: AppointmentSlotStatus.AVAILABLE,
            bufferBeforeMinutes: 15,
            bufferAfterMinutes: 15,
          },
          queueTicket: null,
        },
      ];

      mockPrismaService.$transaction.mockResolvedValueOnce([mockAppointments, 1]);

      const result = await service.listAppointments({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 1,
      });
    });

    it('should filter by userId', async () => {
      mockPrismaService.$transaction.mockResolvedValueOnce([[], 0]);

      await service.listAppointments({ userId: 'user1', page: 1, limit: 10 });

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      mockPrismaService.$transaction.mockResolvedValueOnce([[], 0]);

      await service.listAppointments({
        status: AppointmentStatus.CANCELLED,
        page: 1,
        limit: 10,
      });

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('getAppointmentById', () => {
    it('should return appointment details', async () => {
      const mockAppointment = {
        id: '1',
        userId: 'user1',
        serviceId: 'service1',
        slotId: 'slot1',
        queueTicketId: null,
        status: AppointmentStatus.SCHEDULED,
        scheduledAt: new Date('2030-01-01T09:00:00.000Z'),
        timezone: 'UTC',
        locale: 'en',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        service: {
          id: 'service1',
          slug: 'test-service',
          durationMinutes: 60,
        },
        slot: {
          id: 'slot1',
          startAt: new Date('2030-01-01T09:00:00.000Z'),
          endAt: new Date('2030-01-01T10:00:00.000Z'),
          timezone: 'UTC',
          capacity: 1,
          status: AppointmentSlotStatus.AVAILABLE,
          bufferBeforeMinutes: 15,
          bufferAfterMinutes: 15,
        },
        queueTicket: null,
        user: {
          id: 'user1',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        },
      };

      mockPrismaService.appointment.findUnique.mockResolvedValueOnce(mockAppointment);

      const result = await service.getAppointmentById('1');

      expect(result.data.id).toBe('1');
      expect(mockPrismaService.appointment.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if appointment does not exist', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValueOnce(null);

      await expect(service.getAppointmentById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateAppointment', () => {
    it('should update appointment status', async () => {
      const mockAppointment = {
        id: '1',
        userId: 'user1',
        serviceId: 'service1',
        slotId: 'slot1',
        status: AppointmentStatus.SCHEDULED,
        scheduledAt: new Date(),
        timezone: 'UTC',
        locale: 'en',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        service: {
          id: 'service1',
          slug: 'test-service',
          durationMinutes: 60,
        },
        slot: {
          id: 'slot1',
          serviceId: 'service1',
        },
      };

      const updatedAppointment = {
        ...mockAppointment,
        status: AppointmentStatus.CONFIRMED,
      };

      mockPrismaService.$transaction.mockImplementationOnce(async (callback) => {
        mockPrismaService.appointment.findUnique.mockResolvedValueOnce(mockAppointment);
        mockPrismaService.appointment.update.mockResolvedValueOnce(updatedAppointment);
        return callback(mockPrismaService);
      });

      const mockFullAppointment = {
        ...updatedAppointment,
        service: {
          id: 'service1',
          slug: 'test-service',
          durationMinutes: 60,
        },
        slot: {
          id: 'slot1',
          startAt: new Date(),
          endAt: new Date(),
          timezone: 'UTC',
          capacity: 1,
          status: AppointmentSlotStatus.AVAILABLE,
          bufferBeforeMinutes: 15,
          bufferAfterMinutes: 15,
        },
        queueTicket: null,
        user: {
          id: 'user1',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        },
      };

      mockPrismaService.appointment.findUnique.mockResolvedValueOnce(mockFullAppointment);

      const result = await service.updateAppointment('1', {
        status: AppointmentStatus.CONFIRMED,
      });

      expect(result.data.status).toBe(AppointmentStatus.CONFIRMED);
    });

    it('should throw NotFoundException if appointment does not exist', async () => {
      mockPrismaService.$transaction.mockImplementationOnce(async (callback) => {
        mockPrismaService.appointment.findUnique.mockResolvedValueOnce(null);
        return callback(mockPrismaService);
      });

      await expect(
        service.updateAppointment('non-existent', { status: AppointmentStatus.CONFIRMED }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAppointment', () => {
    it('should delete an appointment', async () => {
      const mockAppointment = {
        id: '1',
        slotId: 'slot1',
      };

      mockPrismaService.$transaction.mockImplementationOnce(async (callback) => {
        mockPrismaService.appointment.findUnique.mockResolvedValueOnce(mockAppointment);
        mockPrismaService.appointment.delete.mockResolvedValueOnce(mockAppointment);
        return callback(mockPrismaService);
      });

      await service.deleteAppointment('1');

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if appointment does not exist', async () => {
      mockPrismaService.$transaction.mockImplementationOnce(async (callback) => {
        mockPrismaService.appointment.findUnique.mockResolvedValueOnce(null);
        return callback(mockPrismaService);
      });

      await expect(service.deleteAppointment('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
