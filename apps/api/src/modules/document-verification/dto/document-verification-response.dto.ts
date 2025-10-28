import { ApiProperty } from '@nestjs/swagger';

import { DocumentVerificationStatus } from '../document-verification.constants';

export class DocumentVerificationResponseDto {
  @ApiProperty({ description: 'Unique identifier for the verification request' })
  id!: string;

  @ApiProperty({ description: 'Document type associated with the verification request' })
  docType!: string;

  @ApiProperty({
    enum: DocumentVerificationStatus,
    description: 'Current status of the verification',
  })
  status!: DocumentVerificationStatus;

  @ApiProperty({ description: 'Timestamp indicating when the verification request was created' })
  createdAt!: string;

  @ApiProperty({ description: 'Timestamp indicating the last update for the verification request' })
  updatedAt!: string;

  @ApiProperty({ description: 'Original filename provided during upload' })
  originalFilename!: string;

  @ApiProperty({ description: 'Document size in bytes' })
  fileSize!: number;

  @ApiProperty({
    type: [String],
    description: 'Reasons for rejection or manual review, when applicable',
  })
  reasons!: string[];

  @ApiProperty({ type: [String], description: 'Non-blocking warnings raised during validation' })
  warnings!: string[];

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Sanitized metadata with sensitive values masked',
  })
  metadata!: Record<string, unknown>;
}
