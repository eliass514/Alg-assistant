import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AppointmentStatus, DocumentUploadStatus } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { AdminDashboardService } from './admin-dashboard.service';

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        count: jest.fn(),
      },
      appointment: {
        count: jest.fn(),
      },
      documentUpload: {
        count: jest.fn(),
      },
      service: {
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDashboardService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AdminDashboardService>(AdminDashboardService);
    prismaService = module.get(PrismaService);

    jest.spyOn(Logger.prototype, 'verbose').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMetrics', () => {
    it('should return dashboard metrics with correct counts', async () => {
      const mockMetrics = {
        totalUsers: 1250,
        pendingAppointments: 38,
        pendingDocuments: 24,
        activeServices: 12,
      };

      prismaService.user.count.mockResolvedValue(mockMetrics.totalUsers);
      prismaService.appointment.count.mockResolvedValue(mockMetrics.pendingAppointments);
      prismaService.documentUpload.count.mockResolvedValue(mockMetrics.pendingDocuments);
      prismaService.service.count.mockResolvedValue(mockMetrics.activeServices);

      const result = await service.getMetrics();

      expect(result).toEqual(mockMetrics);
      expect(prismaService.user.count).toHaveBeenCalledWith();
      expect(prismaService.appointment.count).toHaveBeenCalledWith({
        where: {
          status: AppointmentStatus.SCHEDULED,
        },
      });
      expect(prismaService.documentUpload.count).toHaveBeenCalledWith({
        where: {
          status: DocumentUploadStatus.PENDING,
        },
      });
      expect(prismaService.service.count).toHaveBeenCalledWith({
        where: {
          isActive: true,
        },
      });
    });

    it('should return zero counts when no data exists', async () => {
      prismaService.user.count.mockResolvedValue(0);
      prismaService.appointment.count.mockResolvedValue(0);
      prismaService.documentUpload.count.mockResolvedValue(0);
      prismaService.service.count.mockResolvedValue(0);

      const result = await service.getMetrics();

      expect(result).toEqual({
        totalUsers: 0,
        pendingAppointments: 0,
        pendingDocuments: 0,
        activeServices: 0,
      });
    });

    it('should execute all count queries in parallel', async () => {
      prismaService.user.count.mockResolvedValue(100);
      prismaService.appointment.count.mockResolvedValue(10);
      prismaService.documentUpload.count.mockResolvedValue(5);
      prismaService.service.count.mockResolvedValue(20);

      await service.getMetrics();

      expect(prismaService.user.count).toHaveBeenCalled();
      expect(prismaService.appointment.count).toHaveBeenCalled();
      expect(prismaService.documentUpload.count).toHaveBeenCalled();
      expect(prismaService.service.count).toHaveBeenCalled();
    });

    it('should handle large numbers correctly', async () => {
      const mockMetrics = {
        totalUsers: 999999,
        pendingAppointments: 50000,
        pendingDocuments: 75000,
        activeServices: 500,
      };

      prismaService.user.count.mockResolvedValue(mockMetrics.totalUsers);
      prismaService.appointment.count.mockResolvedValue(mockMetrics.pendingAppointments);
      prismaService.documentUpload.count.mockResolvedValue(mockMetrics.pendingDocuments);
      prismaService.service.count.mockResolvedValue(mockMetrics.activeServices);

      const result = await service.getMetrics();

      expect(result).toEqual(mockMetrics);
    });

    it('should propagate errors from prisma', async () => {
      const error = new Error('Database connection error');
      prismaService.user.count.mockRejectedValue(error);

      await expect(service.getMetrics()).rejects.toThrow('Database connection error');
    });
  });
});
