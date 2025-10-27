import { Injectable, Logger } from '@nestjs/common';
import { DocumentValidationStatus, Prisma } from '@prisma/client';

import { PrismaService } from '@prisma/prisma.service';

export interface ValidationResult {
  isValid: boolean;
  status: DocumentValidationStatus;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface FileMetadata {
  mimeType: string;
  fileSize?: number;
  originalFilename: string;
}

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  private readonly allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'image/gif',
  ];

  private readonly maxFileSize = 10 * 1024 * 1024;

  constructor(private readonly prisma: PrismaService) {}

  async validateDocument(uploadId: string, fileMetadata: FileMetadata): Promise<ValidationResult> {
    this.logger.verbose(`Validating document upload ${uploadId}`);

    const validations: ValidationResult[] = [];

    validations.push(this.validateFileType(fileMetadata.mimeType));

    if (fileMetadata.fileSize !== undefined) {
      validations.push(this.validateFileSize(fileMetadata.fileSize));
    }

    const failedValidations = validations.filter(
      (v) => v.status === DocumentValidationStatus.FAILED,
    );

    const hasWarnings = validations.some((v) => v.status === DocumentValidationStatus.WARNING);

    let overallResult: ValidationResult;

    if (failedValidations.length > 0) {
      overallResult = {
        isValid: false,
        status: DocumentValidationStatus.FAILED,
        message: failedValidations.map((v) => v.message).join('; '),
        metadata: {
          failedValidations: failedValidations.length,
          totalValidations: validations.length,
        },
      };
    } else if (hasWarnings) {
      overallResult = {
        isValid: true,
        status: DocumentValidationStatus.WARNING,
        message: 'Document passed validation with warnings',
        metadata: {
          warnings: validations.filter((v) => v.status === DocumentValidationStatus.WARNING).length,
          totalValidations: validations.length,
        },
      };
    } else {
      overallResult = {
        isValid: true,
        status: DocumentValidationStatus.PASSED,
        message: 'All validations passed',
        metadata: {
          totalValidations: validations.length,
        },
      };
    }

    await this.recordValidationResults(uploadId, validations);

    return overallResult;
  }

  private validateFileType(mimeType: string): ValidationResult {
    const isAllowed = this.allowedMimeTypes.includes(mimeType);

    if (!isAllowed) {
      return {
        isValid: false,
        status: DocumentValidationStatus.FAILED,
        message: `File type '${mimeType}' is not allowed`,
        metadata: {
          mimeType,
          allowedTypes: this.allowedMimeTypes,
        },
      };
    }

    return {
      isValid: true,
      status: DocumentValidationStatus.PASSED,
      message: 'File type is valid',
      metadata: { mimeType },
    };
  }

  private validateFileSize(fileSize: number): ValidationResult {
    if (fileSize > this.maxFileSize) {
      return {
        isValid: false,
        status: DocumentValidationStatus.FAILED,
        message: `File size ${this.formatBytes(fileSize)} exceeds maximum allowed size of ${this.formatBytes(this.maxFileSize)}`,
        metadata: {
          fileSize,
          maxFileSize: this.maxFileSize,
          fileSizeFormatted: this.formatBytes(fileSize),
          maxFileSizeFormatted: this.formatBytes(this.maxFileSize),
        },
      };
    }

    return {
      isValid: true,
      status: DocumentValidationStatus.PASSED,
      message: 'File size is within allowed limits',
      metadata: {
        fileSize,
        fileSizeFormatted: this.formatBytes(fileSize),
      },
    };
  }

  private async recordValidationResults(
    uploadId: string,
    validations: ValidationResult[],
  ): Promise<void> {
    try {
      await this.prisma.documentUploadValidation.createMany({
        data: validations.map((validation) => ({
          uploadId,
          status: validation.status,
          message: validation.message,
          metadata: validation.metadata
            ? (validation.metadata as unknown as Prisma.JsonValue)
            : undefined,
        })),
      });

      this.logger.verbose(
        `Recorded ${validations.length} validation results for upload ${uploadId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to record validation results for upload ${uploadId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}
