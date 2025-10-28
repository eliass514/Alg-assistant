import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadDocumentVerificationDto {
  @ApiProperty({
    description: 'Type of the document to verify (e.g. passport, driver_license, utility_bill)',
    example: 'passport',
  })
  @IsString()
  @MaxLength(64)
  docType!: string;

  @ApiProperty({
    description: 'JSON payload with document-specific metadata required for validation',
    example: '{"number":"P1234567","country":"FR","expirationDate":"2030-01-01"}',
  })
  @IsString()
  metadata!: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Document file content',
  })
  file!: unknown;

  @ApiProperty({
    required: false,
    description: 'Optional reference identifier used for rate limiting or traceability',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  referenceId?: string;
}
