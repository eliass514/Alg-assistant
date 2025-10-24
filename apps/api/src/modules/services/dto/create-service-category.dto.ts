import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { ServiceCategoryTranslationDto } from './category-translation.dto';

export class CreateServiceCategoryDto {
  @ApiProperty({ example: 'immigration-support' })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: 'object', example: { color: '#004d40' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiProperty({ type: [ServiceCategoryTranslationDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ServiceCategoryTranslationDto)
  translations!: ServiceCategoryTranslationDto[];
}
