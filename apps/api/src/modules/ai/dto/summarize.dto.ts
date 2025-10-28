import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class SummarizeDto {
  @ApiProperty({ description: 'Prompt to summarize', minLength: 3 })
  @IsString()
  @MinLength(3)
  prompt!: string;

  @ApiPropertyOptional({ description: 'Preferred locale for the summary', example: 'en' })
  @IsOptional()
  @IsString()
  locale?: string;
}
