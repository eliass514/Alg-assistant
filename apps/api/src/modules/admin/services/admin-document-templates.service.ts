import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { DocumentTemplateVersionStatus } from '@prisma/client';

import { PrismaService } from '@prisma/prisma.service';
import { FileStorageService } from '@modules/document-uploads/file-storage.service';

import {
  AdminCreateDocumentTemplateDto,
  TemplateServiceAssignmentDto,
} from '../dto/admin-create-document-template.dto';
import { AdminUpdateDocumentTemplateDto } from '../dto/admin-update-document-template.dto';

@Injectable()
export class AdminDocumentTemplatesService {
  private readonly logger = new Logger(AdminDocumentTemplatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async listTemplates(params: {
    page?: number;
    limit?: number;
    search?: string;
    serviceId?: string;
    isActive?: boolean;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 25;
    const skip = (page - 1) * limit;
    const search = params.search?.trim();

    this.logger.verbose(
      `Admin listing document templates page=${page} limit=${limit}${search ? ` search=${search}` : ''}${params.serviceId ? ` serviceId=${params.serviceId}` : ''}${params.isActive !== undefined ? ` isActive=${params.isActive}` : ''}`,
    );

    const filters: Prisma.DocumentTemplateWhereInput[] = [];

    if (search) {
      filters.push({
        OR: [
          { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { slug: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { description: { contains: search, mode: Prisma.QueryMode.insensitive } },
        ],
      });
    }
    if (params.serviceId) {
      filters.push({
        services: {
          some: {
            serviceId: params.serviceId,
          },
        },
      });
    }
    if (params.isActive !== undefined) {
      filters.push({ isActive: params.isActive });
    }

    const where: Prisma.DocumentTemplateWhereInput = filters.length > 0 ? { AND: filters } : {};

    const [templates, total] = await this.prisma.$transaction([
      this.prisma.documentTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          services: {
            include: {
              service: {
                select: {
                  id: true,
                  slug: true,
                  translations: {
                    select: {
                      locale: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          versions: {
            select: {
              id: true,
              versionNumber: true,
              label: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { versionNumber: 'desc' },
            take: 5,
          },
        },
      }),
      this.prisma.documentTemplate.count({ where }),
    ]);

    return {
      data: templates,
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  async getTemplateById(id: string) {
    this.logger.verbose(`Admin retrieving document template ${id}`);

    const template = await this.prisma.documentTemplate.findUnique({
      where: { id },
      include: {
        services: {
          include: {
            service: {
              select: {
                id: true,
                slug: true,
                translations: {
                  select: {
                    locale: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        versions: {
          include: {
            validationRules: true,
          },
          orderBy: { versionNumber: 'desc' },
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Document template ${id} not found`);
    }

    return template;
  }

  async createTemplate(dto: AdminCreateDocumentTemplateDto) {
    this.logger.verbose(`Admin creating document template slug=${dto.slug}`);

    const template = await this.prisma.documentTemplate.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        description: dto.description,
        defaultLocale: dto.defaultLocale ?? 'en',
        isActive: dto.isActive ?? true,
        metadata: dto.metadata as Prisma.InputJsonValue,
        services: dto.services
          ? {
              create: dto.services.map((service) => this.mapServiceAssignment(service)),
            }
          : undefined,
      },
      include: {
        services: {
          include: {
            service: {
              select: {
                id: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    return template;
  }

  async updateTemplate(id: string, dto: AdminUpdateDocumentTemplateDto) {
    this.logger.verbose(`Admin updating document template ${id}`);

    const data: Prisma.DocumentTemplateUpdateInput = {
      slug: dto.slug,
      name: dto.name,
      description: dto.description,
      defaultLocale: dto.defaultLocale,
      isActive: dto.isActive,
      metadata: dto.metadata as Prisma.InputJsonValue,
    };

    if (dto.services) {
      data.services = {
        deleteMany: {},
        create: dto.services.map((service) => this.mapServiceAssignment(service)),
      };
    }

    try {
      const template = await this.prisma.documentTemplate.update({
        where: { id },
        data,
        include: {
          services: {
            include: {
              service: {
                select: {
                  id: true,
                  slug: true,
                },
              },
            },
          },
        },
      });

      return template;
    } catch (error) {
      if (this.isRecordNotFoundError(error)) {
        throw new NotFoundException(`Document template ${id} not found`);
      }

      throw error;
    }
  }

  async deleteTemplate(id: string) {
    this.logger.verbose(`Admin deleting document template ${id}`);

    try {
      await this.prisma.documentTemplate.delete({
        where: { id },
      });
    } catch (error) {
      if (this.isRecordNotFoundError(error)) {
        throw new NotFoundException(`Document template ${id} not found`);
      }

      throw error;
    }
  }

  async uploadTemplateFile(
    templateId: string,
    fileBuffer: Buffer,
    fileName: string,
    description: string,
    metadata?: Record<string, unknown>,
  ) {
    this.logger.verbose(`Admin uploading template file for template ${templateId}`);

    const template = await this.prisma.documentTemplate.findUnique({ where: { id: templateId } });

    if (!template) {
      throw new NotFoundException(`Document template ${templateId} not found`);
    }

    const { fileId, url } = await this.fileStorageService.uploadFile(fileBuffer, fileName);

    const versionMetadata: Record<string, unknown> = {
      fileId,
      fileName,
      fileSize: fileBuffer.byteLength,
      uploadedAt: new Date().toISOString(),
    };

    if (metadata && Object.keys(metadata).length > 0) {
      versionMetadata.customMetadata = metadata;
    }

    const version = await this.prisma.documentTemplateVersion.create({
      data: {
        templateId,
        versionNumber: await this.getNextVersionNumber(templateId),
        label: description,
        status: 'DRAFT' as DocumentTemplateVersionStatus,
        content: url,
        metadata: versionMetadata as Prisma.JsonValue,
      },
    });

    return {
      version,
      file: {
        fileId,
        url,
      },
    };
  }

  private async getNextVersionNumber(templateId: string): Promise<number> {
    const latest = await this.prisma.documentTemplateVersion.findFirst({
      where: { templateId },
      orderBy: { versionNumber: 'desc' },
    });

    return latest ? latest.versionNumber + 1 : 1;
  }

  private mapServiceAssignment(
    service: TemplateServiceAssignmentDto,
  ): Prisma.DocumentTemplateServiceCreateWithoutTemplateInput {
    return {
      serviceId: service.serviceId,
      isRequired: service.isRequired ?? false,
      autoApply: service.autoApply ?? false,
      validFrom: service.validFrom ? new Date(service.validFrom) : undefined,
      validTo: service.validTo ? new Date(service.validTo) : undefined,
    };
  }

  private isRecordNotFoundError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025';
  }
}
