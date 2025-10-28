import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ServiceSuggestionsDto {
  @ApiProperty({ description: 'Context describing the user need or question', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  context!: string;

  @ApiPropertyOptional({ description: 'Locale for localized suggestions', example: 'fr' })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({
    description: 'Optional intent hint for downstream routing',
    example: 'immigration',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  intentHint?: string;
}
