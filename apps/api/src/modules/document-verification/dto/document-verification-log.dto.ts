import { ApiProperty } from '@nestjs/swagger';

import { DocumentVerificationLogSeverity } from '../document-verification.constants';

export class DocumentVerificationLogDto {
  @ApiProperty({ description: 'Timestamp of the log entry in ISO 8601 format' })
  timestamp!: string;

  @ApiProperty({ description: 'Pipeline stage that generated the log entry' })
  stage!: string;

  @ApiProperty({ enum: DocumentVerificationLogSeverity, description: 'Severity of the log entry' })
  severity!: DocumentVerificationLogSeverity;

  @ApiProperty({ description: 'Human-readable message describing the event' })
  message!: string;

  @ApiProperty({
    required: false,
    type: 'object',
    additionalProperties: true,
    description: 'Additional structured metadata associated with the event',
  })
  metadata?: Record<string, unknown>;
}
