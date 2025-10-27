import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { DocumentUploadStatus } from '@prisma/client';

import { PaginationQueryDto } from '@acme/shared-dto';

export class DocumentUploadQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by service ID' })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({ description: 'Filter by appointment ID' })
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @ApiPropertyOptional({ enum: DocumentUploadStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(DocumentUploadStatus)
  status?: DocumentUploadStatus;
}
