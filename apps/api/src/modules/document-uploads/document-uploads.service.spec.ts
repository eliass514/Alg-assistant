import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentUploadStatus, Prisma } from '@prisma/client';

import { PrismaService } from '@prisma/prisma.service';

import { CreateDocumentUploadDto } from './dto/create-document-upload.dto';
import { DocumentUploadQueryDto } from './dto/document-upload-query.dto';
import { UpdateDocumentUploadDto } from './dto/update-document-upload.dto';
import { DocumentUploadsService } from './document-uploads.service';
import { FileStorageService } from '@modules/document-uploads/file-storage.service';
import { ValidationService } from './validation.service';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));

describe('DocumentUploadsService', () => {
  let service: DocumentUploadsService;
  let prisma: jest.Mocked<PrismaService>;
  let fileStorageService: jest.Mocked<FileStorageService>;
  let validationService: jest.Mocked<ValidationService>;

  const uploadId = 'upload-1';
  const userId = 'user-1';
  const fileBuffer = Buffer.from('test file');
  const mockUpload = {
    id: uploadId,
    userId,
    serviceId: 'service-1',
    appointmentId: null,
    templateId: null,
    templateVersionId: null,
    reviewedById: null,
    status: DocumentUploadStatus.PENDING,
    storagePath: 'pending/path',
    originalFilename: 'document.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024,
    checksum: null,
    submittedAt: new Date('2024-01-01'),
    reviewedAt: null,
    expiresAt: null,
    rejectionReason: null,
    metadata: {
      uploadedVia: 'user-api',
      uploadedAt: new Date('2024-01-01').toISOString(),
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const createUploadDto: CreateDocumentUploadDto = {
    userId,
    serviceId: 'service-1',
    appointmentId: undefined,
    templateId: undefined,
    templateVersionId: undefined,
    reviewedById: undefined,
    status: DocumentUploadStatus.PENDING,
    storagePath: 'storage/path',
    originalFilename: 'document.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024,
    checksum: undefined,
    submittedAt: undefined,
    reviewedAt: undefined,
    expiresAt: undefined,
    rejectionReason: undefined,
    metadata: undefined,
  };

  beforeEach(async () => {
    const prismaMock = {
      documentUpload: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      documentUploadStatusHistory: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => {
        if (typeof callback === 'function') {
          return callback(prismaMock);
        }
        return Promise.resolve(callback);
      }),
    } as unknown as jest.Mocked<PrismaService>;

    fileStorageService = {
      uploadFile: jest.fn(),
      getFileUrl: jest.fn(),
    } as unknown as jest.Mocked<FileStorageService>;

    validationService = {
      validateDocument: jest.fn(),
    } as unknown as jest.Mocked<ValidationService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentUploadsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: FileStorageService,
          useValue: fileStorageService,
        },
        {
          provide: ValidationService,
          useValue: validationService,
        },
      ],
    }).compile();

    service = module.get<DocumentUploadsService>(DocumentUploadsService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUploadForUser', () => {
    it('should throw when file buffer is missing', async () => {
      await expect(
        service.createUploadForUser(userId, {
          serviceId: 'service-1',
          file: undefined as unknown as Express.Multer.File,
        }),
      ).rejects.toThrow(new BadRequestException('Uploaded file is empty or missing.'));
    });

    it('should create upload and process file', async () => {
      const file = {
        originalname: 'document.pdf',
        mimetype: 'application/pdf',
        buffer: fileBuffer,
        size: fileBuffer.byteLength,
      } as Express.Multer.File;

      (prisma.documentUpload.create as jest.Mock).mockResolvedValue(mockUpload);
      (prisma.documentUpload.findUnique as jest.Mock).mockResolvedValue(mockUpload);
      (fileStorageService.uploadFile as jest.Mock).mockResolvedValue({
        fileId: 'file-1',
        url: 'https://storage/file-1',
      });
      (validationService.validateDocument as jest.Mock).mockResolvedValue({
        isValid: true,
        message: 'Valid document',
      });
      (prisma.documentUpload.update as jest.Mock).mockResolvedValue(mockUpload);

      const result = await service.createUploadForUser(userId, {
        serviceId: 'service-1',
        file,
        appointmentId: 'appointment-1',
        templateId: 'template-1',
        templateVersionId: 'version-1',
      });

      expect(result).toEqual(mockUpload);
      expect(prisma.documentUpload.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          serviceId: 'service-1',
          appointmentId: 'appointment-1',
          templateId: 'template-1',
          templateVersionId: 'version-1',
          status: DocumentUploadStatus.PENDING,
          storagePath: expect.stringMatching(/^pending\//),
          originalFilename: 'document.pdf',
          mimeType: 'application/pdf',
          fileSize: fileBuffer.byteLength,
        }),
      });
      expect(fileStorageService.uploadFile).toHaveBeenCalledWith(file.buffer, file.originalname);
      expect(validationService.validateDocument).toHaveBeenCalled();
      expect(prisma.documentUpload.update).toHaveBeenCalledTimes(3);
    });
  });

  describe('uploadDocumentFile', () => {
    it('should throw when upload does not exist', async () => {
      (prisma.documentUpload.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.uploadDocumentFile(uploadId, fileBuffer, 'test.pdf')).rejects.toThrow(
        new NotFoundException(`Document upload ${uploadId} not found`),
      );
    });

    it('should process upload file and update status', async () => {
      (prisma.documentUpload.findUnique as jest.Mock).mockResolvedValue(mockUpload);
      (fileStorageService.uploadFile as jest.Mock).mockResolvedValue({
        fileId: 'file-1',
        url: 'https://storage/file-1',
      });
      (validationService.validateDocument as jest.Mock).mockResolvedValue({
        isValid: true,
        message: 'Valid document',
      });

      await service.uploadDocumentFile(uploadId, fileBuffer, 'test.pdf');

      expect(prisma.documentUpload.update).toHaveBeenCalledTimes(3);
      expect(prisma.documentUploadStatusHistory.create).toHaveBeenCalledTimes(2);
      expect(fileStorageService.uploadFile).toHaveBeenCalledWith(fileBuffer, 'test.pdf');
      expect(validationService.validateDocument).toHaveBeenCalledWith(uploadId, {
        mimeType: mockUpload.mimeType,
        fileSize: fileBuffer.byteLength,
        originalFilename: mockUpload.originalFilename,
      });
    });

    it('should set upload status to rejected when validation fails', async () => {
      (prisma.documentUpload.findUnique as jest.Mock).mockResolvedValue(mockUpload);
      (fileStorageService.uploadFile as jest.Mock).mockResolvedValue({
        fileId: 'file-1',
        url: 'https://storage/file-1',
      });
      (validationService.validateDocument as jest.Mock).mockResolvedValue({
        isValid: false,
        message: 'Invalid document',
      });

      const result = await service.uploadDocumentFile(uploadId, fileBuffer, 'test.pdf');

      expect(result.status).toBe(DocumentUploadStatus.REJECTED);
      expect(prisma.documentUpload.update).toHaveBeenCalledTimes(3);
      expect(prisma.documentUploadStatusHistory.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('getDocumentFileUrl', () => {
    it('should return file url from storage service', async () => {
      fileStorageService.getFileUrl.mockResolvedValue('https://storage/file-1');

      const result = await service.getDocumentFileUrl('file-1');

      expect(result).toBe('https://storage/file-1');
      expect(fileStorageService.getFileUrl).toHaveBeenCalledWith('file-1');
    });
  });

  describe('findAll', () => {
    it('should return paginated uploads', async () => {
      const query: DocumentUploadQueryDto = { page: 1, limit: 10 };
      (prisma.$transaction as jest.Mock).mockResolvedValue([[mockUpload], 1]);

      const result = await service.findAll(query);

      expect(result).toEqual({
        data: [mockUpload],
        meta: { page: 1, limit: 10, total: 1 },
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should apply filters', async () => {
      const query: DocumentUploadQueryDto = {
        page: 2,
        limit: 5,
        search: 'doc',
        userId,
        serviceId: 'service-1',
        appointmentId: 'appointment-1',
        status: DocumentUploadStatus.PROCESSING,
      };

      (prisma.$transaction as jest.Mock).mockResolvedValue([[mockUpload], 1]);

      await service.findAll(query);

      const expectedWhere = {
        AND: [
          {
            OR: [
              { originalFilename: { contains: 'doc', mode: 'insensitive' } },
              { storagePath: { contains: 'doc', mode: 'insensitive' } },
            ],
          },
          { userId },
          { serviceId: 'service-1' },
          { appointmentId: 'appointment-1' },
          { status: DocumentUploadStatus.PROCESSING },
        ],
      };

      expect(prisma.documentUpload.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
          where: expectedWhere,
        }),
      );

      expect(prisma.documentUpload.count).toHaveBeenCalledWith({ where: expectedWhere });
    });
  });

  describe('listForUser', () => {
    it('should scope query to user', async () => {
      const query: DocumentUploadQueryDto = { page: 1, limit: 10 };

      jest
        .spyOn(service, 'findAll')
        .mockResolvedValueOnce({ data: [mockUpload], meta: { page: 1, limit: 10, total: 1 } });

      const result = await service.listForUser(userId, query);

      expect(result.meta.total).toBe(1);
      expect(service.findAll).toHaveBeenCalledWith({ ...query, userId });
    });
  });

  describe('findOne', () => {
    it('should return upload with relations', async () => {
      (prisma.documentUpload.findUnique as jest.Mock).mockResolvedValue(mockUpload);

      const result = await service.findOne(uploadId);

      expect(result).toEqual(mockUpload);
      expect(prisma.documentUpload.findUnique).toHaveBeenCalledWith({
        where: { id: uploadId },
        include: expect.objectContaining({ statusHistory: expect.any(Object) }),
      });
    });

    it('should throw NotFoundException when upload not found', async () => {
      (prisma.documentUpload.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(uploadId)).rejects.toThrow(
        new NotFoundException(`Document upload ${uploadId} not found`),
      );
    });
  });

  describe('findOneForUser', () => {
    it('should return upload scoped to user', async () => {
      (prisma.documentUpload.findFirst as jest.Mock).mockResolvedValue(mockUpload);

      const result = await service.findOneForUser(uploadId, userId);

      expect(result).toEqual(mockUpload);
      expect(prisma.documentUpload.findFirst).toHaveBeenCalledWith({
        where: { id: uploadId, userId },
        include: expect.objectContaining({ statusHistory: expect.any(Object) }),
      });
    });

    it('should throw NotFoundException when upload not found for user', async () => {
      (prisma.documentUpload.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOneForUser(uploadId, userId)).rejects.toThrow(
        new NotFoundException('Document upload upload-1 not found for user'),
      );
    });
  });

  describe('removeForUser', () => {
    it('should delete upload when exists for user', async () => {
      (prisma.documentUpload.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.removeForUser(uploadId, userId);

      expect(prisma.documentUpload.deleteMany).toHaveBeenCalledWith({
        where: { id: uploadId, userId },
      });
    });

    it('should throw NotFoundException when upload not found for user', async () => {
      (prisma.documentUpload.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      await expect(service.removeForUser(uploadId, userId)).rejects.toThrow(
        new NotFoundException('Document upload upload-1 not found for user'),
      );
    });
  });

  describe('create', () => {
    it('should create upload record', async () => {
      (prisma.documentUpload.create as jest.Mock).mockResolvedValue(mockUpload);

      const result = await service.create(createUploadDto);

      expect(result).toEqual(mockUpload);
      expect(prisma.documentUpload.create).toHaveBeenCalledWith({
        data: {
          userId: createUploadDto.userId,
          serviceId: createUploadDto.serviceId,
          appointmentId: createUploadDto.appointmentId,
          templateId: createUploadDto.templateId,
          templateVersionId: createUploadDto.templateVersionId,
          reviewedById: createUploadDto.reviewedById,
          status: createUploadDto.status,
          storagePath: createUploadDto.storagePath,
          originalFilename: createUploadDto.originalFilename,
          mimeType: createUploadDto.mimeType,
          fileSize: createUploadDto.fileSize,
          checksum: createUploadDto.checksum,
          submittedAt: undefined,
          reviewedAt: undefined,
          expiresAt: undefined,
          rejectionReason: createUploadDto.rejectionReason,
          metadata: undefined,
        },
      });
    });
  });

  describe('update', () => {
    it('should update upload record', async () => {
      const updateDto: UpdateDocumentUploadDto = {
        status: DocumentUploadStatus.PROCESSING,
        fileSize: 2048,
      };

      (prisma.documentUpload.update as jest.Mock).mockResolvedValue(mockUpload);

      const result = await service.update(uploadId, updateDto);

      expect(result).toEqual(mockUpload);
      expect(prisma.documentUpload.update).toHaveBeenCalledWith({
        where: { id: uploadId },
        data: expect.objectContaining({
          status: DocumentUploadStatus.PROCESSING,
          fileSize: 2048,
        }),
      });
    });

    it('should throw NotFoundException when upload not found', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });

      (prisma.documentUpload.update as jest.Mock).mockRejectedValue(error);

      await expect(service.update(uploadId, {})).rejects.toThrow(
        new NotFoundException(`Document upload ${uploadId} not found`),
      );
    });
  });

  describe('remove', () => {
    it('should delete upload record', async () => {
      (prisma.documentUpload.delete as jest.Mock).mockResolvedValue(mockUpload);

      await service.remove(uploadId);

      expect(prisma.documentUpload.delete).toHaveBeenCalledWith({ where: { id: uploadId } });
    });

    it('should throw NotFoundException when upload not found', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });

      (prisma.documentUpload.delete as jest.Mock).mockRejectedValue(error);

      await expect(service.remove(uploadId)).rejects.toThrow(
        new NotFoundException(`Document upload ${uploadId} not found`),
      );
    });
  });
});
