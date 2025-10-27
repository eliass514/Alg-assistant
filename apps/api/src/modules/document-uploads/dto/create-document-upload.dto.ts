import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { DocumentUploadStatus } from '@prisma/client';

export class CreateDocumentUploadDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  templateVersionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  reviewedById?: string;

  @ApiPropertyOptional({ enum: DocumentUploadStatus, default: DocumentUploadStatus.PENDING })
  @IsOptional()
  @IsEnum(DocumentUploadStatus)
  status?: DocumentUploadStatus;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  storagePath!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  originalFilename!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checksum?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  submittedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  reviewedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional({ type: 'object' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
