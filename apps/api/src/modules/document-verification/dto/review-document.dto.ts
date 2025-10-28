import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum ReviewDecision {
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export class ReviewDocumentDto {
  @ApiProperty({ enum: ReviewDecision, description: 'Decision taken by the reviewer' })
  @IsEnum(ReviewDecision)
  decision!: ReviewDecision;

  @ApiProperty({
    description: 'Name or identifier of the reviewer taking the action',
    example: 'compliance-analyst',
  })
  @IsString()
  @MaxLength(128)
  reviewer!: string;

  @ApiProperty({
    required: false,
    description: 'Optional notes supporting the review decision',
    maxLength: 512,
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  notes?: string;
}
