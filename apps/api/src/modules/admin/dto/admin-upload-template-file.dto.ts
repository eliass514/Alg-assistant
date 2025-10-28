import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class AdminUploadTemplateFileDto {
  @ApiProperty({ description: 'Description of the template file' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({ description: 'Additional metadata for the file', type: 'object' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
