import { Test, TestingModule } from '@nestjs/testing';
import { Logger, BadRequestException } from '@nestjs/common';

import { PrismaService } from '@prisma/prisma.service';

import { AdminLogsService } from './admin-logs.service';
import {
  AdminConversationLogsQueryDto,
  AdminDocumentVerificationLogsQueryDto,
} from '../dto/admin-logs-query.dto';

describe('AdminLogsService', () => {
  let service: AdminLogsService;
  let prisma: jest.Mocked<PrismaService>;

  const mockConversationLog = {
    id: 'log-1',
    userId: 'user-1',
    appointmentId: 'appt-1',
    participant: 'AI_ASSISTANT',
    locale: 'en',
    message: 'Hello, how can I help you?',
    payload: { intent: 'greeting' },
    createdAt: new Date('2024-01-01T10:00:00Z'),
  };

  const mockStatusLog = {
    id: 'status-1',
    uploadId: 'upload-1',
    changedById: 'user-1',
    fromStatus: 'PENDING',
    toStatus: 'VALIDATED',
    reason: 'Approved by admin',
    metadata: { notes: 'All checks passed' },
    createdAt: new Date('2024-01-01T10:00:00Z'),
  };

  const mockValidationLog = {
    id: 'validation-1',
    uploadId: 'upload-1',
    ruleId: 'rule-1',
    status: 'PASSED',
    message: 'File type validation passed',
    metadata: { fileType: 'application/pdf' },
    executedAt: new Date('2024-01-01T10:00:00Z'),
    upload: {
      userId: 'user-1',
    },
  };

  beforeEach(async () => {
    const mockPrismaService = {
      $transaction: jest.fn(),
      conversationLog: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      documentUploadStatusHistory: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      documentUploadValidation: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminLogsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AdminLogsService>(AdminLogsService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;

    jest.spyOn(Logger.prototype, 'verbose').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listConversationLogs', () => {
    it('should return paginated conversation logs', async () => {
      const query: AdminConversationLogsQueryDto = { page: 1, limit: 25 };

      prisma.$transaction.mockResolvedValue([[mockConversationLog], 1]);

      const result = await service.listConversationLogs(query);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('log-1');
      expect(result.data[0].message).toBe('Hello, how can I help you?');
      expect(result.meta).toEqual({
        page: 1,
        limit: 25,
        total: 1,
      });
    });

    it('should filter by userId', async () => {
      const query: AdminConversationLogsQueryDto = { userId: 'user-1', page: 1, limit: 25 };

      prisma.$transaction.mockResolvedValue([[mockConversationLog], 1]);

      await service.listConversationLogs(query);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should filter by appointmentId', async () => {
      const query: AdminConversationLogsQueryDto = { appointmentId: 'appt-1', page: 1, limit: 25 };

      prisma.$transaction.mockResolvedValue([[mockConversationLog], 1]);

      await service.listConversationLogs(query);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should filter by participant', async () => {
      const query: AdminConversationLogsQueryDto = {
        participant: 'AI_ASSISTANT',
        page: 1,
        limit: 25,
      };

      prisma.$transaction.mockResolvedValue([[mockConversationLog], 1]);

      await service.listConversationLogs(query);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should filter by date range', async () => {
      const query: AdminConversationLogsQueryDto = {
        createdFrom: '2024-01-01T00:00:00Z',
        createdTo: '2024-01-31T23:59:59Z',
        page: 1,
        limit: 25,
      };

      prisma.$transaction.mockResolvedValue([[mockConversationLog], 1]);

      await service.listConversationLogs(query);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw error if date range is invalid', async () => {
      const query: AdminConversationLogsQueryDto = {
        createdFrom: '2024-01-31T23:59:59Z',
        createdTo: '2024-01-01T00:00:00Z',
        page: 1,
        limit: 25,
      };

      await expect(service.listConversationLogs(query)).rejects.toThrow(BadRequestException);
    });

    it('should search by message content', async () => {
      const query: AdminConversationLogsQueryDto = { search: 'help', page: 1, limit: 25 };

      prisma.$transaction.mockResolvedValue([[mockConversationLog], 1]);

      await service.listConversationLogs(query);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should enforce maximum page size', async () => {
      const query: AdminConversationLogsQueryDto = { page: 1, limit: 200 };

      prisma.$transaction.mockResolvedValue([[mockConversationLog], 1]);

      const result = await service.listConversationLogs(query);

      expect(result.meta.limit).toBe(100);
    });
  });

  describe('listDocumentVerificationLogs', () => {
    it('should return status logs only when logType is status', async () => {
      const query: AdminDocumentVerificationLogsQueryDto = {
        logType: 'status',
        page: 1,
        limit: 25,
      };

      prisma.$transaction.mockResolvedValue([[mockStatusLog], 1]);

      const result = await service.listDocumentVerificationLogs(query);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe('status');
      if (result.data[0].type === 'status') {
        expect(result.data[0].uploadId).toBe('upload-1');
      }
    });

    it('should return validation logs only when logType is validation', async () => {
      const query: AdminDocumentVerificationLogsQueryDto = {
        logType: 'validation',
        page: 1,
        limit: 25,
      };

      prisma.$transaction.mockResolvedValue([[mockValidationLog], 1]);

      const result = await service.listDocumentVerificationLogs(query);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe('validation');
    });

    it('should return merged logs when no logType specified', async () => {
      const query: AdminDocumentVerificationLogsQueryDto = {
        page: 1,
        limit: 25,
      };

      prisma.$transaction.mockResolvedValue([[mockStatusLog], [mockValidationLog], 1, 1]);

      const result = await service.listDocumentVerificationLogs(query);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.meta.total).toBe(2);
    });

    it('should filter by userId', async () => {
      const query: AdminDocumentVerificationLogsQueryDto = {
        userId: 'user-1',
        logType: 'status',
        page: 1,
        limit: 25,
      };

      prisma.$transaction.mockResolvedValue([[mockStatusLog], 1]);

      await service.listDocumentVerificationLogs(query);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should filter by uploadId', async () => {
      const query: AdminDocumentVerificationLogsQueryDto = {
        uploadId: 'upload-1',
        logType: 'status',
        page: 1,
        limit: 25,
      };

      prisma.$transaction.mockResolvedValue([[mockStatusLog], 1]);

      await service.listDocumentVerificationLogs(query);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should filter by date range', async () => {
      const query: AdminDocumentVerificationLogsQueryDto = {
        createdFrom: '2024-01-01T00:00:00Z',
        createdTo: '2024-01-31T23:59:59Z',
        logType: 'status',
        page: 1,
        limit: 25,
      };

      prisma.$transaction.mockResolvedValue([[mockStatusLog], 1]);

      await service.listDocumentVerificationLogs(query);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw error if date range is invalid', async () => {
      const query: AdminDocumentVerificationLogsQueryDto = {
        createdFrom: '2024-01-31T23:59:59Z',
        createdTo: '2024-01-01T00:00:00Z',
        logType: 'status',
        page: 1,
        limit: 25,
      };

      await expect(service.listDocumentVerificationLogs(query)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
