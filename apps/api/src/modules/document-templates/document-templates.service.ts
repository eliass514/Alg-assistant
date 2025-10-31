import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@prisma/prisma.service';

import { CreateDocumentTemplateDto } from './dto/create-document-template.dto';
import { DocumentTemplateQueryDto } from './dto/document-template-query.dto';
import { UpdateDocumentTemplateDto } from './dto/update-document-template.dto';

@Injectable()
export class DocumentTemplatesService {
  private readonly logger = new Logger(DocumentTemplatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: DocumentTemplateQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    this.logger.verbose(
      `Listing document templates page=${page} limit=${limit}${search ? ` search=${search}` : ''}${query.serviceId ? ` serviceId=${query.serviceId}` : ''}${query.isActive !== undefined ? ` isActive=${query.isActive}` : ''}`,
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
    if (query.serviceId) {
      filters.push({
        services: {
          some: {
            serviceId: query.serviceId,
          },
        },
      });
    }
    if (query.isActive !== undefined) {
      filters.push({ isActive: query.isActive });
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
                },
              },
            },
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

  async findOne(id: string) {
    this.logger.verbose(`Retrieving document template ${id}`);

    const template = await this.prisma.documentTemplate.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 5,
        },
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
      },
    });

    if (!template) {
      throw new NotFoundException(`Document template ${id} not found`);
    }

    return template;
  }

  async create(createDto: CreateDocumentTemplateDto) {
    this.logger.verbose(`Creating document template with slug: ${createDto.slug}`);

    const template = await this.prisma.documentTemplate.create({
      data: {
        slug: createDto.slug,
        name: createDto.name,
        description: createDto.description,
        defaultLocale: createDto.defaultLocale ?? 'en',
        isActive: createDto.isActive ?? true,
        metadata: createDto.metadata as Prisma.InputJsonValue,
      },
    });

    return template;
  }

  async update(id: string, updateDto: UpdateDocumentTemplateDto) {
    this.logger.verbose(`Updating document template ${id}`);

    try {
      const template = await this.prisma.documentTemplate.update({
        where: { id },
        data: {
          slug: updateDto.slug,
          name: updateDto.name,
          description: updateDto.description,
          defaultLocale: updateDto.defaultLocale,
          isActive: updateDto.isActive,
          metadata: updateDto.metadata as Prisma.InputJsonValue,
        },
      });

      return template;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Document template ${id} not found`);
      }

      throw error;
    }
  }

  async remove(id: string) {
    this.logger.verbose(`Deleting document template ${id}`);

    try {
      await this.prisma.documentTemplate.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Document template ${id} not found`);
      }

      throw error;
    }
  }
}
