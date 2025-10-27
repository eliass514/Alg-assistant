import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, DocumentUploadStatus } from '@prisma/client';

import { PaginationQueryDto } from '@acme/shared-dto';
import { PrismaService } from '@prisma/prisma.service';

import { CreateDocumentUploadDto } from './dto/create-document-upload.dto';
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

  async findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    this.logger.verbose(
      `Listing document uploads page=${page} limit=${limit}${search ? ` search=${search}` : ''}`,
    );

    const where: Prisma.DocumentUploadWhereInput = search
      ? {
          OR: [
            { originalFilename: { contains: search, mode: 'insensitive' } },
            { storagePath: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [uploads, total] = await this.prisma.$transaction([
      this.prisma.documentUpload.findMany({
        where,
        skip,
        take: limit,
        orderBy: { submittedAt: 'desc' },
        include: {
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
        },
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

  async findOne(id: string) {
    this.logger.verbose(`Retrieving document upload ${id}`);

    const upload = await this.prisma.documentUpload.findUnique({
      where: { id },
      include: {
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
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        validations: {
          orderBy: { executedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!upload) {
      throw new NotFoundException(`Document upload ${id} not found`);
    }

    return upload;
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
        metadata: createDto.metadata ? (createDto.metadata as Prisma.JsonValue) : undefined,
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
          metadata: updateDto.metadata ? (updateDto.metadata as Prisma.JsonValue) : undefined,
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
}
