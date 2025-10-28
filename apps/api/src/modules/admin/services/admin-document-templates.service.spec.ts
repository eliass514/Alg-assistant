import { Logger, NotFoundException } from '@nestjs/common';

jest.mock('uuid', () => ({
  v4: () => 'mocked-uuid',
}));

import type { PrismaService } from '@prisma/prisma.service';
import type { FileStorageService } from '@modules/document-uploads/file-storage.service';

import { AdminDocumentTemplatesService } from './admin-document-templates.service';
import { AdminCreateDocumentTemplateDto } from '../dto/admin-create-document-template.dto';
import { AdminUpdateDocumentTemplateDto } from '../dto/admin-update-document-template.dto';

type MockedPrisma = {
  documentTemplate: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  documentTemplateVersion: {
    findFirst: jest.Mock;
    create: jest.Mock;
  };
  $transaction: jest.Mock;
};

describe('AdminDocumentTemplatesService', () => {
  let service: AdminDocumentTemplatesService;
  let prisma: MockedPrisma;
  let fileStorageService: { uploadFile: jest.Mock };

  const mockTemplate = {
    id: 'template-1',
    slug: 'visa-application',
    name: 'Visa Application',
    description: 'Template for visa applications',
    defaultLocale: 'en',
    isActive: true,
    metadata: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockTemplateWithServices = {
    ...mockTemplate,
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
          slug: 'visa-service',
        },
      },
    ],
  };

  const mockTemplateWithVersions = {
    ...mockTemplate,
    services: [],
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
        validationRules: [],
      },
    ],
  };

  beforeEach(() => {
    prisma = {
      documentTemplate: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      documentTemplateVersion: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    fileStorageService = {
      uploadFile: jest.fn(),
    };

    service = new AdminDocumentTemplatesService(
      prisma as unknown as PrismaService,
      fileStorageService as unknown as FileStorageService,
    );

    jest.spyOn(Logger.prototype, 'verbose').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listTemplates', () => {
    it('should return paginated templates', async () => {
      const mockTemplates = [mockTemplateWithServices];
      (prisma.$transaction as jest.Mock).mockResolvedValue([mockTemplates, 1]);

      const result = await service.listTemplates({ page: 1, limit: 25 });

      expect(result).toEqual({
        data: mockTemplates,
        meta: {
          page: 1,
          limit: 25,
          total: 1,
        },
      });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should filter by search term', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([[mockTemplate], 1]);

      await service.listTemplates({ page: 1, limit: 10, search: 'visa' });

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
      (prisma.$transaction as jest.Mock).mockResolvedValue([[mockTemplate], 1]);

      await service.listTemplates({ page: 1, limit: 10, serviceId: 'service-1' });

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
      (prisma.$transaction as jest.Mock).mockResolvedValue([[mockTemplate], 1]);

      await service.listTemplates({ page: 1, limit: 10, isActive: true });

      const [findManyArgs] = (prisma.documentTemplate.findMany as jest.Mock).mock.calls[0];
      expect(findManyArgs.where).toEqual({
        AND: [{ isActive: true }],
      });
    });
  });

  describe('getTemplateById', () => {
    it('should return a template with relations', async () => {
      (prisma.documentTemplate.findUnique as jest.Mock).mockResolvedValue(mockTemplateWithVersions);

      const result = await service.getTemplateById('template-1');

      expect(result).toEqual(mockTemplateWithVersions);
      expect(prisma.documentTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: 'template-1' },
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
    });

    it('should throw NotFoundException when template not found', async () => {
      (prisma.documentTemplate.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getTemplateById('non-existent')).rejects.toThrow(
        new NotFoundException('Document template non-existent not found'),
      );
    });
  });

  describe('createTemplate', () => {
    it('should create a template without services', async () => {
      const dto: AdminCreateDocumentTemplateDto = {
        slug: 'new-template',
        name: 'New Template',
        description: 'A new template',
      };

      (prisma.documentTemplate.create as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await service.createTemplate(dto);

      expect(result).toEqual(mockTemplate);
      expect(prisma.documentTemplate.create).toHaveBeenCalledWith({
        data: {
          slug: dto.slug,
          name: dto.name,
          description: dto.description,
          defaultLocale: 'en',
          isActive: true,
          metadata: undefined,
          services: undefined,
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
    });

    it('should create a template with services', async () => {
      const dto: AdminCreateDocumentTemplateDto = {
        slug: 'new-template',
        name: 'New Template',
        description: 'A new template',
        services: [
          {
            serviceId: 'service-1',
            isRequired: true,
            autoApply: false,
          },
        ],
      };

      (prisma.documentTemplate.create as jest.Mock).mockResolvedValue(mockTemplateWithServices);

      const result = await service.createTemplate(dto);

      expect(result).toEqual(mockTemplateWithServices);
      expect(prisma.documentTemplate.create).toHaveBeenCalledWith({
        data: {
          slug: dto.slug,
          name: dto.name,
          description: dto.description,
          defaultLocale: 'en',
          isActive: true,
          metadata: undefined,
          services: {
            create: [
              {
                serviceId: 'service-1',
                isRequired: true,
                autoApply: false,
                validFrom: undefined,
                validTo: undefined,
              },
            ],
          },
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
    });
  });

  describe('updateTemplate', () => {
    it('should update a template', async () => {
      const dto: AdminUpdateDocumentTemplateDto = {
        name: 'Updated Template',
        isActive: false,
      };

      const updated = { ...mockTemplate, ...dto };
      (prisma.documentTemplate.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.updateTemplate('template-1', dto);

      expect(result).toEqual(updated);
      expect(prisma.documentTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        data: {
          slug: undefined,
          name: 'Updated Template',
          description: undefined,
          defaultLocale: undefined,
          isActive: false,
          metadata: undefined,
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
    });

    it('should update template services', async () => {
      const dto: AdminUpdateDocumentTemplateDto = {
        services: [
          {
            serviceId: 'service-2',
            isRequired: false,
          },
        ],
      };

      (prisma.documentTemplate.update as jest.Mock).mockResolvedValue(mockTemplateWithServices);

      await service.updateTemplate('template-1', dto);

      const updateCall = (prisma.documentTemplate.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.services).toEqual({
        deleteMany: {},
        create: [
          {
            serviceId: 'service-2',
            isRequired: false,
            autoApply: false,
            validFrom: undefined,
            validTo: undefined,
          },
        ],
      });
    });

    it('should throw NotFoundException when template not found', async () => {
      const dto: AdminUpdateDocumentTemplateDto = { name: 'Updated' };

      const error = { code: 'P2025', message: 'Record not found' };

      (prisma.documentTemplate.update as jest.Mock).mockRejectedValue(error);

      await expect(service.updateTemplate('non-existent', dto)).rejects.toThrow(
        new NotFoundException('Document template non-existent not found'),
      );
    });
  });

  describe('deleteTemplate', () => {
    it('should delete a template', async () => {
      (prisma.documentTemplate.delete as jest.Mock).mockResolvedValue(mockTemplate);

      await service.deleteTemplate('template-1');

      expect(prisma.documentTemplate.delete).toHaveBeenCalledWith({
        where: { id: 'template-1' },
      });
    });

    it('should throw NotFoundException when template not found', async () => {
      const error = { code: 'P2025', message: 'Record not found' };

      (prisma.documentTemplate.delete as jest.Mock).mockRejectedValue(error);

      await expect(service.deleteTemplate('non-existent')).rejects.toThrow(
        new NotFoundException('Document template non-existent not found'),
      );
    });
  });

  describe('uploadTemplateFile', () => {
    it('should upload a file and create a new version', async () => {
      const fileBuffer = Buffer.from('test file content');
      const fileName = 'template.pdf';
      const description = 'Template file v1';
      const metadata = { fileType: 'pdf' };

      (prisma.documentTemplate.findUnique as jest.Mock).mockResolvedValue(mockTemplate);
      (prisma.documentTemplateVersion.findFirst as jest.Mock).mockResolvedValue(null);

      const mockFileResult = {
        fileId: 'file-id-123',
        url: 'https://example.com/file-id-123',
      };
      (fileStorageService.uploadFile as jest.Mock).mockResolvedValue(mockFileResult);

      const mockVersion = {
        id: 'version-1',
        templateId: 'template-1',
        versionNumber: 1,
        label: description,
        status: 'DRAFT',
        content: mockFileResult.url,
        metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.documentTemplateVersion.create as jest.Mock).mockResolvedValue(mockVersion);

      const result = await service.uploadTemplateFile(
        'template-1',
        fileBuffer,
        fileName,
        description,
        metadata,
      );

      expect(result).toEqual({
        version: mockVersion,
        file: mockFileResult,
      });

      expect(prisma.documentTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: 'template-1' },
      });

      expect(fileStorageService.uploadFile).toHaveBeenCalledWith(fileBuffer, fileName);

      expect(prisma.documentTemplateVersion.create).toHaveBeenCalledWith({
        data: {
          templateId: 'template-1',
          versionNumber: 1,
          label: description,
          status: 'DRAFT',
          content: mockFileResult.url,
          metadata: expect.objectContaining({
            fileId: mockFileResult.fileId,
            fileName,
            fileSize: fileBuffer.byteLength,
            customMetadata: metadata,
          }),
        },
      });
    });

    it('should increment version number for existing versions', async () => {
      const fileBuffer = Buffer.from('test file content');
      const fileName = 'template-v2.pdf';
      const description = 'Template file v2';

      (prisma.documentTemplate.findUnique as jest.Mock).mockResolvedValue(mockTemplate);
      (prisma.documentTemplateVersion.findFirst as jest.Mock).mockResolvedValue({
        versionNumber: 3,
      });

      const mockFileResult = {
        fileId: 'file-id-456',
        url: 'https://example.com/file-id-456',
      };
      (fileStorageService.uploadFile as jest.Mock).mockResolvedValue(mockFileResult);

      const mockVersion = {
        id: 'version-4',
        templateId: 'template-1',
        versionNumber: 4,
        label: description,
        status: 'DRAFT',
        content: mockFileResult.url,
        metadata: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.documentTemplateVersion.create as jest.Mock).mockResolvedValue(mockVersion);

      await service.uploadTemplateFile('template-1', fileBuffer, fileName, description);

      expect(prisma.documentTemplateVersion.findFirst).toHaveBeenCalledWith({
        where: { templateId: 'template-1' },
        orderBy: { versionNumber: 'desc' },
      });

      expect(prisma.documentTemplateVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          versionNumber: 4,
        }),
      });
    });

    it('should throw NotFoundException when template does not exist', async () => {
      (prisma.documentTemplate.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.uploadTemplateFile('non-existent', Buffer.from('test'), 'file.pdf', 'description'),
      ).rejects.toThrow(new NotFoundException('Document template non-existent not found'));
    });
  });
});
