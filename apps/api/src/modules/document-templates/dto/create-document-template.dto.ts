import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateDocumentTemplateDto {
  @ApiProperty({ example: 'passport-document' })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiProperty({ example: 'Passport Document' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'Template for passport documents' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: 'en' })
  @IsOptional()
  @IsString()
  defaultLocale?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: 'object' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Form fields definition for document preparation',
    type: 'array',
    example: [
      { name: 'firstName', label: 'Prénom', type: 'text' },
      { name: 'lastName', label: 'Nom', type: 'text' },
    ],
  })
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  formFields?: Record<string, unknown>[];
}
