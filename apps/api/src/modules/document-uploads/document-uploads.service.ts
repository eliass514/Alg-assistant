import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, DocumentUploadStatus, DocumentUpload } from '@prisma/client';
import type { Express } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '@prisma/prisma.service';

import { CreateDocumentUploadDto } from './dto/create-document-upload.dto';
import { DocumentUploadQueryDto } from './dto/document-upload-query.dto';
import { UpdateDocumentUploadDto } from './dto/update-document-upload.dto';
import { FileStorageService } from './file-storage.service';
import { ValidationService } from './validation.service';

@Injectable()
export class DocumentUploadsService {
  private readonly logger = new Logger(DocumentUploadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileStorageService: FileStorageService,
    private readonly validationService: ValidationService,
  ) {}

  async createUploadForUser(
    userId: string,
    params: {
      serviceId: string;
      file: Express.Multer.File;
      appointmentId?: string;
      templateId?: string;
      templateVersionId?: string;
    },
  ): Promise<DocumentUpload> {
    const { serviceId, file, appointmentId, templateId, templateVersionId } = params;

    this.logger.verbose(
      `Creating document upload for user=${userId} service=${serviceId} filename=${file?.originalname}`,
    );

    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded file is empty or missing.');
    }

    const placeholderStoragePath = `pending/${uuidv4()}`;

    const upload = await this.prisma.documentUpload.create({
      data: {
        userId,
        serviceId,
        appointmentId,
        templateId,
        templateVersionId,
        status: DocumentUploadStatus.PENDING,
        storagePath: placeholderStoragePath,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size ?? file.buffer.byteLength,
        metadata: {
          uploadedVia: 'user-api',
          uploadedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });

    try {
      await this.uploadDocumentFile(upload.id, file.buffer, file.originalname);
    } catch (error) {
      this.logger.error(
        `Failed to process uploaded file for document upload ${upload.id}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }

    return this.findOne(upload.id);
  }

  async uploadDocumentFile(
    uploadId: string,
    fileBuffer: Buffer,
    fileName: string,
  ): Promise<{
    fileId: string;
    url: string;
    status: DocumentUploadStatus;
  }> {
    const upload = await this.prisma.documentUpload.findUnique({ where: { id: uploadId } });

    if (!upload) {
      throw new NotFoundException(`Document upload ${uploadId} not found`);
    }

    const { fileId, url } = await this.fileStorageService.uploadFile(fileBuffer, fileName);

    this.logger.verbose(`Uploaded file for document upload ${uploadId}. Updating record status.`);

    await this.updateUploadStatus(
      uploadId,
      upload.status,
      DocumentUploadStatus.PROCESSING,
      'File uploaded to storage, starting validation',
    );

    const fileSize = fileBuffer.byteLength;

    const metadata = this.extractMetadata(upload.metadata);
    metadata.fileUrl = url;

    await this.prisma.documentUpload.update({
      where: { id: uploadId },
      data: {
        storagePath: fileId,
        fileSize,
        metadata,
      },
    });

    const validationResult = await this.validationService.validateDocument(uploadId, {
      mimeType: upload.mimeType,
      fileSize,
      originalFilename: upload.originalFilename,
    });

    const newStatus = validationResult.isValid
      ? DocumentUploadStatus.VALIDATED
      : DocumentUploadStatus.REJECTED;

    await this.updateUploadStatus(
      uploadId,
      DocumentUploadStatus.PROCESSING,
      newStatus,
      validationResult.message,
    );

    return {
      fileId,
      url,
      status: newStatus,
    };
  }

  async getDocumentFileUrl(fileId: string): Promise<string> {
    return this.fileStorageService.getFileUrl(fileId);
  }

  async findAll(query: DocumentUploadQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    this.logger.verbose(
      `Listing document uploads page=${page} limit=${limit}${search ? ` search=${search}` : ''}${query.userId ? ` userId=${query.userId}` : ''}${query.serviceId ? ` serviceId=${query.serviceId}` : ''}${query.status ? ` status=${query.status}` : ''}`,
    );

    const filters: Prisma.DocumentUploadWhereInput[] = [];

    if (search) {
      filters.push({
        OR: [
          { originalFilename: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { storagePath: { contains: search, mode: Prisma.QueryMode.insensitive } },
        ],
      });
    }
    if (query.userId) {
      filters.push({ userId: query.userId });
    }
    if (query.serviceId) {
      filters.push({ serviceId: query.serviceId });
    }
    if (query.appointmentId) {
      filters.push({ appointmentId: query.appointmentId });
    }
    if (query.status) {
      filters.push({ status: query.status });
    }

    const where: Prisma.DocumentUploadWhereInput = filters.length > 0 ? { AND: filters } : {};

    const [uploads, total] = await this.prisma.$transaction([
      this.prisma.documentUpload.findMany({
        where,
        skip,
        take: limit,
        orderBy: { submittedAt: 'desc' },
        include: this.getDocumentUploadListInclude(),
      }),
      this.prisma.documentUpload.count({ where }),
    ]);

    return {
      data: uploads,
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  async listForUser(userId: string, query: DocumentUploadQueryDto) {
    const scopedQuery = { ...query, userId } as DocumentUploadQueryDto;
    return this.findAll(scopedQuery);
  }

  async findOne(id: string) {
    this.logger.verbose(`Retrieving document upload ${id}`);

    const upload = await this.prisma.documentUpload.findUnique({
      where: { id },
      include: this.getDocumentUploadDetailInclude(),
    });

    if (!upload) {
      throw new NotFoundException(`Document upload ${id} not found`);
    }

    return upload;
  }

  async findOneForUser(id: string, userId: string) {
    this.logger.verbose(`Retrieving document upload ${id} for user ${userId}`);

    const upload = await this.prisma.documentUpload.findFirst({
      where: { id, userId },
      include: this.getDocumentUploadDetailInclude(),
    });

    if (!upload) {
      throw new NotFoundException(`Document upload ${id} not found for user`);
    }

    return upload;
  }

  async removeForUser(id: string, userId: string): Promise<void> {
    this.logger.verbose(`Deleting document upload ${id} for user ${userId}`);

    const { count } = await this.prisma.documentUpload.deleteMany({
      where: { id, userId },
    });

    if (count === 0) {
      throw new NotFoundException(`Document upload ${id} not found for user`);
    }
  }

  async create(createDto: CreateDocumentUploadDto) {
    this.logger.verbose(`Creating document upload for user=${createDto.userId}`);

    const upload = await this.prisma.documentUpload.create({
      data: {
        userId: createDto.userId,
        serviceId: createDto.serviceId,
        appointmentId: createDto.appointmentId,
        templateId: createDto.templateId,
        templateVersionId: createDto.templateVersionId,
        reviewedById: createDto.reviewedById,
        status: createDto.status,
        storagePath: createDto.storagePath,
        originalFilename: createDto.originalFilename,
        mimeType: createDto.mimeType,
        fileSize: createDto.fileSize,
        checksum: createDto.checksum,
        submittedAt: createDto.submittedAt ? new Date(createDto.submittedAt) : undefined,
        reviewedAt: createDto.reviewedAt ? new Date(createDto.reviewedAt) : undefined,
        expiresAt: createDto.expiresAt ? new Date(createDto.expiresAt) : undefined,
        rejectionReason: createDto.rejectionReason,
        metadata: createDto.metadata as Prisma.InputJsonValue,
      },
    });

    return upload;
  }

  async update(id: string, updateDto: UpdateDocumentUploadDto) {
    this.logger.verbose(`Updating document upload ${id}`);

    try {
      const upload = await this.prisma.documentUpload.update({
        where: { id },
        data: {
          userId: updateDto.userId,
          serviceId: updateDto.serviceId,
          appointmentId: updateDto.appointmentId,
          templateId: updateDto.templateId,
          templateVersionId: updateDto.templateVersionId,
          reviewedById: updateDto.reviewedById,
          status: updateDto.status,
          storagePath: updateDto.storagePath,
          originalFilename: updateDto.originalFilename,
          mimeType: updateDto.mimeType,
          fileSize: updateDto.fileSize,
          checksum: updateDto.checksum,
          submittedAt: updateDto.submittedAt ? new Date(updateDto.submittedAt) : undefined,
          reviewedAt: updateDto.reviewedAt ? new Date(updateDto.reviewedAt) : undefined,
          expiresAt: updateDto.expiresAt ? new Date(updateDto.expiresAt) : undefined,
          rejectionReason: updateDto.rejectionReason,
          metadata: updateDto.metadata as Prisma.InputJsonValue,
        },
      });

      return upload;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Document upload ${id} not found`);
      }

      throw error;
    }
  }

  async remove(id: string) {
    this.logger.verbose(`Deleting document upload ${id}`);

    try {
      await this.prisma.documentUpload.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Document upload ${id} not found`);
      }

      throw error;
    }
  }

  private extractMetadata(metadata: Prisma.JsonValue | null): Prisma.JsonObject {
    if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
      return { ...(metadata as Prisma.JsonObject) };
    }

    return {} as Prisma.JsonObject;
  }

  private async updateUploadStatus(
    uploadId: string,
    fromStatus: DocumentUploadStatus,
    toStatus: DocumentUploadStatus,
    reason?: string,
  ): Promise<void> {
    if (fromStatus === toStatus) {
      return;
    }

    this.logger.verbose(`Updating upload ${uploadId} status from ${fromStatus} to ${toStatus}`);

    await this.prisma.$transaction([
      this.prisma.documentUpload.update({
        where: { id: uploadId },
        data: {
          status: toStatus,
          rejectionReason: toStatus === DocumentUploadStatus.REJECTED ? (reason ?? null) : null,
        },
      }),
      this.prisma.documentUploadStatusHistory.create({
        data: {
          uploadId,
          fromStatus,
          toStatus,
          reason,
        },
      }),
    ]);
  }

  private getDocumentUploadListInclude() {
    return {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      service: {
        select: {
          id: true,
          slug: true,
        },
      },
      template: {
        select: {
          id: true,
          name: true,
        },
      },
    };
  }

  private getDocumentUploadDetailInclude() {
    return {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      service: {
        select: {
          id: true,
          slug: true,
        },
      },
      template: {
        select: {
          id: true,
          name: true,
        },
      },
      templateVersion: true,
      reviewedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      statusHistory: {
        orderBy: { createdAt: 'desc' as const },
        take: 10,
      },
      validations: {
        orderBy: { executedAt: 'desc' as const },
        take: 10,
      },
    };
  }
}
