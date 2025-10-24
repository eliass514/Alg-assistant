import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsObject, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const LOCALE_PATTERN = /^[a-z]{2}(?:-[a-z]{2})?$/i;

export class ServiceTranslationDto {
  @ApiProperty({ example: 'en', description: 'BCP 47 locale code' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @Matches(LOCALE_PATTERN)
  locale!: string;

  @ApiProperty({ example: 'Residency Application Review' })
  @IsString()
  @MaxLength(180)
  name!: string;

  @ApiPropertyOptional({ example: 'Detailed review and checklist session' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  summary?: string;

  @ApiPropertyOptional({ example: 'We help you review the application before submission.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: 'object', example: { delivery: 'virtual' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
