import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CacheMetadataDto {
  @ApiProperty({ example: 'services:list:f3c1f6b2742e5ab9f9d8d7ce1214ed81' })
  key!: string;

  @ApiProperty({ example: 300, description: 'Time to live in seconds' })
  ttlSeconds!: number;

  @ApiProperty({ type: String, format: 'date-time', example: '2024-10-24T12:00:00.000Z' })
  generatedAt!: string;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 25 })
  limit!: number;

  @ApiProperty({ example: 2 })
  total!: number;
}

export class ServiceCategoryTranslationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'en' })
  locale!: string;

  @ApiProperty({ example: 'Immigration Support' })
  name!: string;

  @ApiPropertyOptional({ example: 'Guidance for visa processing and residency applications.' })
  description?: string | null;

  @ApiPropertyOptional({ type: 'object', example: { icon: 'passport' } })
  metadata?: Record<string, unknown> | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}

export class ServiceCategoryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'immigration-support' })
  slug!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiPropertyOptional({ type: 'object', example: { color: '#004d40' } })
  metadata?: Record<string, unknown> | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;

  @ApiPropertyOptional({ type: () => ServiceCategoryTranslationResponseDto })
  @Type(() => ServiceCategoryTranslationResponseDto)
  translation?: ServiceCategoryTranslationResponseDto | null;

  @ApiProperty({ type: () => [ServiceCategoryTranslationResponseDto] })
  @Type(() => ServiceCategoryTranslationResponseDto)
  translations!: ServiceCategoryTranslationResponseDto[];
}

export class ServiceTranslationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'en' })
  locale!: string;

  @ApiProperty({ example: 'Residency Application Review' })
  name!: string;

  @ApiPropertyOptional({ example: 'Detailed review and checklist session' })
  summary?: string | null;

  @ApiPropertyOptional({ example: 'We help you review the application before submission.' })
  description?: string | null;

  @ApiPropertyOptional({ type: 'object', example: { delivery: 'virtual' } })
  metadata?: Record<string, unknown> | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}

export class ServiceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'residency-application-review' })
  slug!: string;

  @ApiProperty({ example: 60 })
  durationMinutes!: number;

  @ApiProperty({ example: '150.00', description: 'Price as a string preserving decimal precision' })
  price!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiPropertyOptional({ type: 'object', example: { channel: 'virtual' } })
  metadata?: Record<string, unknown> | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;

  @ApiPropertyOptional({ type: () => ServiceTranslationResponseDto })
  @Type(() => ServiceTranslationResponseDto)
  translation?: ServiceTranslationResponseDto | null;

  @ApiProperty({ type: () => [ServiceTranslationResponseDto] })
  @Type(() => ServiceTranslationResponseDto)
  translations!: ServiceTranslationResponseDto[];

  @ApiProperty({ type: () => ServiceCategoryResponseDto })
  @Type(() => ServiceCategoryResponseDto)
  category!: ServiceCategoryResponseDto;
}

export class ServiceListResponseDto {
  @ApiProperty({ type: () => [ServiceResponseDto] })
  @Type(() => ServiceResponseDto)
  data!: ServiceResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  @Type(() => PaginationMetaDto)
  meta!: PaginationMetaDto;

  @ApiProperty({ type: () => CacheMetadataDto })
  @Type(() => CacheMetadataDto)
  cache!: CacheMetadataDto;
}

export class ServiceCategoryListResponseDto {
  @ApiProperty({ type: () => [ServiceCategoryResponseDto] })
  @Type(() => ServiceCategoryResponseDto)
  data!: ServiceCategoryResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  @Type(() => PaginationMetaDto)
  meta!: PaginationMetaDto;

  @ApiProperty({ type: () => CacheMetadataDto })
  @Type(() => CacheMetadataDto)
  cache!: CacheMetadataDto;
}

export class ServiceDetailResponseDto {
  @ApiProperty({ type: () => ServiceResponseDto })
  @Type(() => ServiceResponseDto)
  data!: ServiceResponseDto;

  @ApiProperty({ type: () => CacheMetadataDto })
  @Type(() => CacheMetadataDto)
  cache!: CacheMetadataDto;
}

export class ServiceCategoryDetailResponseDto {
  @ApiProperty({ type: () => ServiceCategoryResponseDto })
  @Type(() => ServiceCategoryResponseDto)
  data!: ServiceCategoryResponseDto;

  @ApiProperty({ type: () => CacheMetadataDto })
  @Type(() => CacheMetadataDto)
  cache!: CacheMetadataDto;
}
