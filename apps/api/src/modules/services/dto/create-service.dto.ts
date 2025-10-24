import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import { ServiceTranslationDto } from './service-translation.dto';

const PRICE_PATTERN = /^\d+(?:\.\d{1,2})?$/;

export class CreateServiceDto {
  @ApiProperty({ example: 'residency-application-review' })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiProperty({ example: '703ef610-dc52-4aec-bf62-c47e08383e57' })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ example: 60, description: 'Duration in minutes' })
  @IsInt()
  @Min(5)
  @Max(480)
  durationMinutes!: number;

  @ApiProperty({
    example: '150.00',
    description: 'Price in major currency units with two decimals',
  })
  @IsString()
  @Matches(PRICE_PATTERN)
  price!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: 'object', example: { channel: 'virtual' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiProperty({ type: [ServiceTranslationDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ServiceTranslationDto)
  translations!: ServiceTranslationDto[];
}
