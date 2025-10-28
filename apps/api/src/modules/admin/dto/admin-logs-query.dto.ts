import { Transform } from 'class-transformer';
import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';

import { PaginationQueryDto } from '@acme/shared-dto';
import { ConversationParticipant } from '@prisma/client';

export class AdminConversationLogsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID('4')
  userId?: string;

  @IsOptional()
  @IsUUID('4')
  appointmentId?: string;

  @IsOptional()
  @IsEnum(ConversationParticipant)
  participant?: ConversationParticipant;

  @IsOptional()
  @IsISO8601()
  @Transform(({ value }) => (value ? value.trim() : value))
  createdFrom?: string;

  @IsOptional()
  @IsISO8601()
  @Transform(({ value }) => (value ? value.trim() : value))
  createdTo?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? value.trim() : value))
  locale?: string;
}

export class AdminDocumentVerificationLogsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID('4')
  userId?: string;

  @IsOptional()
  @IsUUID('4')
  uploadId?: string;

  @IsOptional()
  @IsISO8601()
  @Transform(({ value }) => (value ? value.trim() : value))
  createdFrom?: string;

  @IsOptional()
  @IsISO8601()
  @Transform(({ value }) => (value ? value.trim() : value))
  createdTo?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? value.trim() : value))
  logType?: 'status' | 'validation';
}
