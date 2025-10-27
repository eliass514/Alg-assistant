import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  S3ClientConfig,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

import { StorageConfig } from '@config/storage.config';

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly presignedUrlExpiration: number;

  constructor(private readonly configService: ConfigService) {
    const storageConfig = this.configService.get<StorageConfig>('storage', { infer: true });

    if (!storageConfig) {
      this.logger.warn('Storage configuration not found. S3 operations will fail.');
    }

    if (!storageConfig?.s3.bucketName) {
      this.logger.warn('AWS S3 bucket name not configured. S3 operations will fail.');
    }

    this.bucketName = storageConfig?.s3.bucketName ?? '';
    this.presignedUrlExpiration = storageConfig?.presignedUrlExpiration ?? 3600;

    const s3Config: S3ClientConfig = {
      region: storageConfig?.s3.region ?? 'us-east-1',
    };

    if (storageConfig?.s3.endpoint) {
      s3Config.endpoint = storageConfig.s3.endpoint;
    }

    if (storageConfig?.s3.forcePathStyle) {
      s3Config.forcePathStyle = true;
    }

    if (storageConfig?.s3.accessKeyId && storageConfig?.s3.secretAccessKey) {
      s3Config.credentials = {
        accessKeyId: storageConfig.s3.accessKeyId,
        secretAccessKey: storageConfig.s3.secretAccessKey,
      };
    } else {
      this.logger.warn(
        'AWS credentials not fully configured. Falling back to the default credential provider chain.',
      );
    }

    this.s3Client = new S3Client(s3Config);
  }

  async uploadFile(fileBuffer: Buffer, fileName: string): Promise<{ fileId: string; url: string }> {
    this.ensureBucketConfigured();

    const fileId = uuidv4();
    const timestamp = Date.now();
    const sanitizedFileName = this.sanitizeFileName(fileName);
    const s3Key = `uploads/${timestamp}-${fileId}/${sanitizedFileName}`;

    this.logger.verbose(`Uploading file to S3: ${s3Key} (${fileBuffer.byteLength} bytes)`);

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: this.getContentType(fileName),
        Metadata: {
          originalfilename: fileName,
          uploadedat: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);

      this.logger.log(`Successfully uploaded file to S3: ${s3Key}`);

      const url = await this.createPresignedUrl(s3Key);

      return {
        fileId: s3Key,
        url,
      };
    } catch (error) {
      const message = this.extractErrorMessage(error);
      this.logger.error(`Failed to upload file to S3: ${message}`, this.extractErrorStack(error));
      throw new InternalServerErrorException('Failed to upload file to S3.');
    }
  }

  async getFileUrl(fileId: string): Promise<string> {
    this.ensureBucketConfigured();

    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: fileId,
        }),
      );
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundException(`File ${fileId} not found in storage.`);
      }

      const message = this.extractErrorMessage(error);
      this.logger.error(`Failed to verify file in S3: ${message}`, this.extractErrorStack(error));
      throw new InternalServerErrorException('Failed to verify file in S3.');
    }

    try {
      const presignedUrl = await this.createPresignedUrl(fileId);
      this.logger.verbose(`Generated pre-signed URL for file: ${fileId}`);
      return presignedUrl;
    } catch (error) {
      const message = this.extractErrorMessage(error);
      this.logger.error(
        `Failed to generate pre-signed URL: ${message}`,
        this.extractErrorStack(error),
      );
      throw new InternalServerErrorException('Failed to generate file URL.');
    }
  }

  private async createPresignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: this.presignedUrlExpiration,
    });
  }

  private ensureBucketConfigured(): void {
    if (!this.bucketName) {
      throw new InternalServerErrorException('S3 bucket name is not configured.');
    }
  }

  private isNotFoundError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const maybeError = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    return maybeError?.$metadata?.httpStatusCode === 404 || maybeError?.name === 'NotFound';
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'Unknown error';
  }

  private extractErrorStack(error: unknown): string | undefined {
    if (error instanceof Error) {
      return error.stack;
    }

    return undefined;
  }

  private sanitizeFileName(fileName: string): string {
    const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return sanitized.length > 0 ? sanitized : 'file';
  }

  private getContentType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();

    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      txt: 'text/plain',
      csv: 'text/csv',
      zip: 'application/zip',
    };

    return mimeTypes[extension ?? ''] ?? 'application/octet-stream';
  }
}
