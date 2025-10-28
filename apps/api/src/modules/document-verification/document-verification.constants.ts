import { registerEnumType } from '@nestjs/swagger';

export enum DocumentVerificationStatus {
  PENDING = 'pending',
  REJECTED = 'rejected',
  MANUAL_REVIEW = 'manual_review',
  APPROVED = 'approved',
}

export enum DocumentVerificationLogSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
}

registerEnumType(DocumentVerificationStatus, {
  name: 'DocumentVerificationStatus',
  description: 'Lifecycle status for a document verification request',
});

registerEnumType(DocumentVerificationLogSeverity, {
  name: 'DocumentVerificationLogSeverity',
  description: 'Severity level for document verification log entries',
});
