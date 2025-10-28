import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '@prisma/prisma.service';
import {
  ConversationLog,
  DocumentUploadStatus,
  DocumentUploadStatusHistory,
  Prisma,
} from '@prisma/client';

import {
  AdminConversationLogsQueryDto,
  AdminDocumentVerificationLogsQueryDto,
} from '../dto/admin-logs-query.dto';
import {
  AdminConversationLogsResponseDto,
  AdminConversationLogEntryDto,
  AdminDocumentVerificationLogsResponseDto,
  AdminDocumentVerificationLogEntryDto,
  AdminDocumentStatusLogEntryDto,
  AdminDocumentValidationLogEntryDto,
} from '../dto/admin-logs-response.dto';

const MAX_PAGE_SIZE = 100;

type DocumentUploadValidationWithUser = Prisma.DocumentUploadValidationGetPayload<{
  include: {
    upload: {
      select: {
        userId: true;
      };
    };
  };
}>;

@Injectable()
export class AdminLogsService {
  private readonly logger = new Logger(AdminLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listConversationLogs(
    query: AdminConversationLogsQueryDto,
  ): Promise<AdminConversationLogsResponseDto> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, MAX_PAGE_SIZE) : 25;
    const skip = (page - 1) * limit;

    this.logger.verbose(
      `Admin listing conversation logs page=${page} limit=${limit} filters=${JSON.stringify(query)}`,
    );

    const where: Prisma.ConversationLogWhereInput = {};

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.appointmentId) {
      where.appointmentId = query.appointmentId;
    }

    if (query.participant) {
      where.participant = query.participant;
    }

    if (query.locale) {
      where.locale = query.locale;
    }

    if (query.search) {
      where.message = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    if (query.createdFrom || query.createdTo) {
      const from = query.createdFrom ? new Date(query.createdFrom) : undefined;
      const to = query.createdTo ? new Date(query.createdTo) : undefined;

      if (from && to && from > to) {
        throw new BadRequestException('The start of the range must be before the end.');
      }

      where.createdAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.conversationLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.conversationLog.count({ where }),
    ]);

    return {
      data: logs.map((log) => this.mapConversationLog(log)),
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  async listDocumentVerificationLogs(
    query: AdminDocumentVerificationLogsQueryDto,
  ): Promise<AdminDocumentVerificationLogsResponseDto> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, MAX_PAGE_SIZE) : 25;
    const skip = (page - 1) * limit;

    this.logger.verbose(
      `Admin listing document verification logs page=${page} limit=${limit} filters=${JSON.stringify(query)}`,
    );

    // Determine which log types to fetch
    const fetchStatus = !query.logType || query.logType === 'status';
    const fetchValidation = !query.logType || query.logType === 'validation';

    if (fetchStatus && fetchValidation) {
      // Fetch both types and merge
      return this.fetchMergedLogs(query, page, limit, skip);
    } else if (fetchStatus) {
      return this.fetchStatusLogsOnly(query, page, limit, skip);
    } else {
      return this.fetchValidationLogsOnly(query, page, limit, skip);
    }
  }

  private async fetchStatusLogsOnly(
    query: AdminDocumentVerificationLogsQueryDto,
    page: number,
    limit: number,
    skip: number,
  ): Promise<AdminDocumentVerificationLogsResponseDto> {
    const where: Prisma.DocumentUploadStatusHistoryWhereInput = {};

    if (query.userId) {
      where.changedById = query.userId;
    }

    if (query.uploadId) {
      where.uploadId = query.uploadId;
    }

    if (query.createdFrom || query.createdTo) {
      const from = query.createdFrom ? new Date(query.createdFrom) : undefined;
      const to = query.createdTo ? new Date(query.createdTo) : undefined;

      if (from && to && from > to) {
        throw new BadRequestException('The start of the range must be before the end.');
      }

      where.createdAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.documentUploadStatusHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.documentUploadStatusHistory.count({ where }),
    ]);

    return {
      data: logs.map((log) => this.mapStatusLog(log)),
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  private async fetchValidationLogsOnly(
    query: AdminDocumentVerificationLogsQueryDto,
    page: number,
    limit: number,
    skip: number,
  ): Promise<AdminDocumentVerificationLogsResponseDto> {
    const where: Prisma.DocumentUploadValidationWhereInput = {};

    if (query.uploadId) {
      where.uploadId = query.uploadId;
    }

    // For validation logs, we need to join through upload to get userId
    if (query.userId) {
      where.upload = {
        userId: query.userId,
      };
    }

    if (query.createdFrom || query.createdTo) {
      const from = query.createdFrom ? new Date(query.createdFrom) : undefined;
      const to = query.createdTo ? new Date(query.createdTo) : undefined;

      if (from && to && from > to) {
        throw new BadRequestException('The start of the range must be before the end.');
      }

      where.executedAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.documentUploadValidation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { executedAt: 'desc' },
        include: {
          upload: {
            select: {
              userId: true,
            },
          },
        },
      }),
      this.prisma.documentUploadValidation.count({ where }),
    ]);

    return {
      data: logs.map((log) => this.mapValidationLog(log)),
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  private async fetchMergedLogs(
    query: AdminDocumentVerificationLogsQueryDto,
    page: number,
    limit: number,
    skip: number,
  ): Promise<AdminDocumentVerificationLogsResponseDto> {
    // Build where clauses for both types
    const statusWhere: Prisma.DocumentUploadStatusHistoryWhereInput = {};
    const validationWhere: Prisma.DocumentUploadValidationWhereInput = {};

    if (query.userId) {
      statusWhere.changedById = query.userId;
      validationWhere.upload = {
        userId: query.userId,
      };
    }

    if (query.uploadId) {
      statusWhere.uploadId = query.uploadId;
      validationWhere.uploadId = query.uploadId;
    }

    const dateFilter =
      query.createdFrom || query.createdTo
        ? this.buildDateFilter(query.createdFrom, query.createdTo)
        : undefined;

    if (dateFilter) {
      statusWhere.createdAt = dateFilter;
      validationWhere.executedAt = dateFilter;
    }

    // Fetch both types
    const [statusLogs, validationLogs, statusTotal, validationTotal] =
      await this.prisma.$transaction([
        this.prisma.documentUploadStatusHistory.findMany({
          where: statusWhere,
          orderBy: { createdAt: 'desc' },
          take: limit * 2, // Fetch more to ensure we have enough after merging
        }),
        this.prisma.documentUploadValidation.findMany({
          where: validationWhere,
          orderBy: { executedAt: 'desc' },
          include: {
            upload: {
              select: {
                userId: true,
              },
            },
          },
          take: limit * 2,
        }),
        this.prisma.documentUploadStatusHistory.count({ where: statusWhere }),
        this.prisma.documentUploadValidation.count({ where: validationWhere }),
      ]);

    // Merge and sort by timestamp
    const allLogs: AdminDocumentVerificationLogEntryDto[] = [
      ...statusLogs.map((log) => this.mapStatusLog(log)),
      ...validationLogs.map((log) => this.mapValidationLog(log)),
    ].sort((a, b) => {
      const dateA = 'createdAt' in a ? new Date(a.createdAt) : new Date(a.executedAt);
      const dateB = 'createdAt' in b ? new Date(b.createdAt) : new Date(b.executedAt);
      return dateB.getTime() - dateA.getTime();
    });

    // Apply pagination after merging
    const paginatedLogs = allLogs.slice(skip, skip + limit);

    return {
      data: paginatedLogs,
      meta: {
        page,
        limit,
        total: statusTotal + validationTotal,
      },
    };
  }

  private buildDateFilter(
    createdFrom?: string,
    createdTo?: string,
  ): { gte?: Date; lte?: Date } | undefined {
    const from = createdFrom ? new Date(createdFrom) : undefined;
    const to = createdTo ? new Date(createdTo) : undefined;

    if (from && to && from > to) {
      throw new BadRequestException('The start of the range must be before the end.');
    }

    if (!from && !to) {
      return undefined;
    }

    return {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  private mapConversationLog(
    log: Pick<
      ConversationLog,
      | 'id'
      | 'userId'
      | 'appointmentId'
      | 'participant'
      | 'locale'
      | 'message'
      | 'payload'
      | 'createdAt'
    >,
  ): AdminConversationLogEntryDto {
    return {
      id: log.id,
      userId: log.userId,
      appointmentId: log.appointmentId,
      participant: log.participant,
      locale: log.locale,
      message: log.message,
      payload: log.payload,
      createdAt: log.createdAt.toISOString(),
    };
  }

  private mapStatusLog(log: DocumentUploadStatusHistory): AdminDocumentStatusLogEntryDto {
    return {
      id: log.id,
      uploadId: log.uploadId,
      userId: log.changedById,
      fromStatus: log.fromStatus as DocumentUploadStatus | null,
      toStatus: log.toStatus as DocumentUploadStatus,
      reason: log.reason,
      metadata: log.metadata,
      createdAt: log.createdAt.toISOString(),
      type: 'status',
    };
  }

  private mapValidationLog(
    log: DocumentUploadValidationWithUser,
  ): AdminDocumentValidationLogEntryDto {
    return {
      id: log.id,
      uploadId: log.uploadId,
      userId: log.upload.userId,
      ruleId: log.ruleId,
      status: log.status,
      message: log.message,
      metadata: log.metadata,
      executedAt: log.executedAt.toISOString(),
      type: 'validation',
    };
  }
}
