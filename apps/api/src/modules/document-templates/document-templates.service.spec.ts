import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@prisma/prisma.service';

import { CreateDocumentTemplateDto } from './dto/create-document-template.dto';
import { DocumentTemplateQueryDto } from './dto/document-template-query.dto';
import { UpdateDocumentTemplateDto } from './dto/update-document-template.dto';
import { DocumentTemplatesService } from './document-templates.service';

describe('DocumentTemplatesService', () => {
  let service: DocumentTemplatesService;
  let prisma: jest.Mocked<PrismaService>;

  const mockDocumentTemplate = {
    id: 'template-1',
    slug: 'visa-application',
    name: 'Visa Application',
    description: 'Standard visa application template',
    defaultLocale: 'en',
    isActive: true,
    metadata: { category: 'immigration' },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockDocumentTemplateWithRelations = {
    ...mockDocumentTemplate,
    services: [
      {
        id: 'assignment-1',
        templateId: 'template-1',
        serviceId: 'service-1',
        isRequired: true,
        autoApply: false,
        validFrom: null,
        validTo: null,
        metadata: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        service: {
          id: 'service-1',
          slug: 'residency-review',
        },
      },
    ],
    versions: [
      {
        id: 'version-1',
        templateId: 'template-1',
        versionNumber: 1,
        label: 'Initial version',
        status: 'ACTIVE',
        content: 'Template content',
        changeLog: null,
        checksum: null,
        publishedAt: new Date('2024-01-01'),
        retiredAt: null,
        metadata: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ],
  };

  beforeEach(async () => {
    const prismaMock = {
      documentTemplate: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentTemplatesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<DocumentTemplatesService>(DocumentTemplatesService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated document templates', async () => {
      const query: DocumentTemplateQueryDto = { page: 1, limit: 25 };
      const mockTemplates = [mockDocumentTemplate];

      (prisma.$transaction as jest.Mock).mockResolvedValue([mockTemplates, 1]);

      const result = await service.findAll(query);

      expect(result).toEqual({
        data: mockTemplates,
        meta: {
          page: 1,
          limit: 25,
          total: 1,
        },
      });

      expect(prisma.documentTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          skip: 0,
          take: 25,
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(prisma.documentTemplate.count).toHaveBeenCalledWith({ where: {} });
    });

    it('should filter by search term', async () => {
      const query: DocumentTemplateQueryDto = { page: 1, limit: 10, search: 'visa' };

      (prisma.$transaction as jest.Mock).mockResolvedValue([[mockDocumentTemplate], 1]);

      await service.findAll(query);

      const [findManyArgs] = (prisma.documentTemplate.findMany as jest.Mock).mock.calls[0];
      expect(findManyArgs.where).toEqual({
        AND: [
          {
            OR: [
              { name: { contains: 'visa', mode: 'insensitive' } },
              { slug: { contains: 'visa', mode: 'insensitive' } },
              { description: { contains: 'visa', mode: 'insensitive' } },
            ],
          },
        ],
      });
    });

    it('should filter by serviceId', async () => {
      const query: DocumentTemplateQueryDto = { page: 1, limit: 10, serviceId: 'service-1' };

      (prisma.$transaction as jest.Mock).mockResolvedValue([[mockDocumentTemplate], 1]);

      await service.findAll(query);

      const [findManyArgs] = (prisma.documentTemplate.findMany as jest.Mock).mock.calls[0];
      expect(findManyArgs.where).toEqual({
        AND: [
          {
            services: {
              some: {
                serviceId: 'service-1',
              },
            },
          },
        ],
      });
    });

    it('should filter by isActive status', async () => {
      const query: DocumentTemplateQueryDto = { page: 1, limit: 10, isActive: true };

      (prisma.$transaction as jest.Mock).mockResolvedValue([[mockDocumentTemplate], 1]);

      await service.findAll(query);

      const [findManyArgs] = (prisma.documentTemplate.findMany as jest.Mock).mock.calls[0];
      expect(findManyArgs.where).toEqual({
        AND: [{ isActive: true }],
      });
    });

    it('should apply multiple filters', async () => {
      const query: DocumentTemplateQueryDto = {
        page: 2,
        limit: 10,
        search: 'visa',
        serviceId: 'service-1',
        isActive: true,
      };

      (prisma.$transaction as jest.Mock).mockResolvedValue([[mockDocumentTemplate], 1]);

      await service.findAll(query);

      const [findManyArgs] = (prisma.documentTemplate.findMany as jest.Mock).mock.calls[0];
      expect(findManyArgs.where.AND).toHaveLength(3);
      expect(findManyArgs.skip).toBe(10);
      expect(findManyArgs.take).toBe(10);
    });

    it('should handle empty results', async () => {
      const query: DocumentTemplateQueryDto = { page: 1, limit: 25 };

      (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);

      const result = await service.findAll(query);

      expect(result).toEqual({
        data: [],
        meta: {
          page: 1,
          limit: 25,
          total: 0,
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return a document template with relations', async () => {
      const templateId = 'template-1';

      (prisma.documentTemplate.findUnique as jest.Mock).mockResolvedValue(
        mockDocumentTemplateWithRelations,
      );

      const result = await service.findOne(templateId);

      expect(result).toEqual(mockDocumentTemplateWithRelations);
      expect(prisma.documentTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: templateId },
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
    });

    it('should throw NotFoundException when template not found', async () => {
      const templateId = 'non-existent';

      (prisma.documentTemplate.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(templateId)).rejects.toThrow(
        new NotFoundException(`Document template ${templateId} not found`),
      );
    });
  });

  describe('create', () => {
    it('should create a document template with defaults', async () => {
      const createDto: CreateDocumentTemplateDto = {
        slug: 'visa-application',
        name: 'Visa Application',
        description: 'Standard visa application template',
      };

      (prisma.documentTemplate.create as jest.Mock).mockResolvedValue(mockDocumentTemplate);

      const result = await service.create(createDto);

      expect(result).toEqual(mockDocumentTemplate);
      expect(prisma.documentTemplate.create).toHaveBeenCalledWith({
        data: {
          slug: createDto.slug,
          name: createDto.name,
          description: createDto.description,
          defaultLocale: 'en',
          isActive: true,
          metadata: undefined,
        },
      });
    });

    it('should create a document template with custom values', async () => {
      const createDto: CreateDocumentTemplateDto = {
        slug: 'visa-application',
        name: 'Visa Application',
        description: 'Standard visa application template',
        defaultLocale: 'fr',
        isActive: false,
        metadata: { category: 'immigration' },
      };

      const customTemplate = { ...mockDocumentTemplate, defaultLocale: 'fr', isActive: false };
      (prisma.documentTemplate.create as jest.Mock).mockResolvedValue(customTemplate);

      const result = await service.create(createDto);

      expect(result).toEqual(customTemplate);
      expect(prisma.documentTemplate.create).toHaveBeenCalledWith({
        data: {
          slug: createDto.slug,
          name: createDto.name,
          description: createDto.description,
          defaultLocale: 'fr',
          isActive: false,
          metadata: { category: 'immigration' },
        },
      });
    });
  });

  describe('update', () => {
    it('should update a document template', async () => {
      const templateId = 'template-1';
      const updateDto: UpdateDocumentTemplateDto = {
        name: 'Updated Visa Application',
        description: 'Updated description',
        isActive: false,
      };

      const updatedTemplate = { ...mockDocumentTemplate, ...updateDto };
      (prisma.documentTemplate.update as jest.Mock).mockResolvedValue(updatedTemplate);

      const result = await service.update(templateId, updateDto);

      expect(result).toEqual(updatedTemplate);
      expect(prisma.documentTemplate.update).toHaveBeenCalledWith({
        where: { id: templateId },
        data: {
          slug: undefined,
          name: updateDto.name,
          description: updateDto.description,
          defaultLocale: undefined,
          isActive: false,
          metadata: undefined,
        },
      });
    });

    it('should throw NotFoundException when template not found', async () => {
      const templateId = 'non-existent';
      const updateDto: UpdateDocumentTemplateDto = { name: 'Updated Name' };

      const error = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });

      (prisma.documentTemplate.update as jest.Mock).mockRejectedValue(error);

      await expect(service.update(templateId, updateDto)).rejects.toThrow(
        new NotFoundException(`Document template ${templateId} not found`),
      );
    });

    it('should propagate other errors', async () => {
      const templateId = 'template-1';
      const updateDto: UpdateDocumentTemplateDto = { name: 'Updated Name' };
      const error = new Error('Database error');

      (prisma.documentTemplate.update as jest.Mock).mockRejectedValue(error);

      await expect(service.update(templateId, updateDto)).rejects.toThrow(error);
    });
  });

  describe('remove', () => {
    it('should delete a document template', async () => {
      const templateId = 'template-1';

      (prisma.documentTemplate.delete as jest.Mock).mockResolvedValue(mockDocumentTemplate);

      await service.remove(templateId);

      expect(prisma.documentTemplate.delete).toHaveBeenCalledWith({
        where: { id: templateId },
      });
    });

    it('should throw NotFoundException when template not found', async () => {
      const templateId = 'non-existent';

      const error = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });

      (prisma.documentTemplate.delete as jest.Mock).mockRejectedValue(error);

      await expect(service.remove(templateId)).rejects.toThrow(
        new NotFoundException(`Document template ${templateId} not found`),
      );
    });

    it('should propagate other errors', async () => {
      const templateId = 'template-1';
      const error = new Error('Database error');

      (prisma.documentTemplate.delete as jest.Mock).mockRejectedValue(error);

      await expect(service.remove(templateId)).rejects.toThrow(error);
    });
  });
});
