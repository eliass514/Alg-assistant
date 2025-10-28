import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DocumentAssistDto {
  @ApiProperty({
    description: 'Prompt describing the assistance needed for the document',
    maxLength: 2000,
  })
  @IsString()
  @MaxLength(2000)
  prompt!: string;

  @ApiPropertyOptional({
    description: 'Optional summary of the document contents',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  documentSummary?: string;

  @ApiPropertyOptional({
    description: 'Document type or identifier used to tailor the response',
    example: 'residency_permit',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  documentType?: string;

  @ApiPropertyOptional({
    description: 'Preferred locale for the assistant response',
    example: 'ar',
  })
  @IsOptional()
  @IsString()
  locale?: string;
}
