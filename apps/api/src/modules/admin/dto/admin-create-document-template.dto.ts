import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TemplateServiceAssignmentDto {
  @ApiProperty({ description: 'Service ID to assign to this template' })
  @IsUUID()
  serviceId!: string;

  @ApiPropertyOptional({ description: 'Whether this template is required for the service' })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ description: 'Whether this template should be auto-applied' })
  @IsOptional()
  @IsBoolean()
  autoApply?: boolean;

  @ApiPropertyOptional({ description: 'Valid from date in ISO format' })
  @IsOptional()
  @IsISO8601()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'Valid to date in ISO format' })
  @IsOptional()
  @IsISO8601()
  validTo?: string;
}

export class AdminCreateDocumentTemplateDto {
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

  @ApiPropertyOptional({
    description: 'Services to assign this template to',
    type: [TemplateServiceAssignmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateServiceAssignmentDto)
  services?: TemplateServiceAssignmentDto[];
}
