import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class UploadDocumentDto {
  @ApiProperty({ description: 'The service ID for which the document is being uploaded' })
  @IsUUID()
  @IsNotEmpty()
  serviceId!: string;

  @ApiPropertyOptional({ description: 'The appointment ID associated with this document' })
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @ApiPropertyOptional({ description: 'The template ID for this document' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ description: 'The template version ID for this document' })
  @IsOptional()
  @IsUUID()
  templateVersionId?: string;

  @ApiProperty({ type: 'string', format: 'binary', description: 'The document file to upload' })
  file!: unknown;
}
