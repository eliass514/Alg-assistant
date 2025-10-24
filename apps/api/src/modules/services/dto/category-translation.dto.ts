import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsObject, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const LOCALE_PATTERN = /^[a-z]{2}(?:-[a-z]{2})?$/i;

export class ServiceCategoryTranslationDto {
  @ApiProperty({ example: 'en', description: 'BCP 47 locale code' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @Matches(LOCALE_PATTERN)
  locale!: string;

  @ApiProperty({ example: 'Immigration Support' })
  @IsString()
  @MaxLength(180)
  name!: string;

  @ApiPropertyOptional({ example: 'Guidance for visa processing and residency applications.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: 'object', example: { icon: 'passport' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
