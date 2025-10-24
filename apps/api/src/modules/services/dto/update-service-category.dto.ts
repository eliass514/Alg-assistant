import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, ValidateNested } from 'class-validator';

import { CreateServiceCategoryDto } from './create-service-category.dto';
import { ServiceCategoryTranslationDto } from './category-translation.dto';

export class UpdateServiceCategoryDto extends PartialType(CreateServiceCategoryDto) {
  @ApiPropertyOptional({ type: [ServiceCategoryTranslationDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ServiceCategoryTranslationDto)
  override translations?: ServiceCategoryTranslationDto[];
}
