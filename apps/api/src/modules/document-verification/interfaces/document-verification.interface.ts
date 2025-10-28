import {
  DocumentVerificationLogSeverity,
  DocumentVerificationStatus,
} from '../document-verification.constants';

export interface DocumentVerificationRecord {
  id: string;
  docType: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  fileChecksum: string;
  createdAt: Date;
  updatedAt: Date;
  status: DocumentVerificationStatus;
  reasons: string[];
  warnings: string[];
  metadata: Record<string, unknown>;
  sanitizedMetadata: Record<string, unknown>;
  logs: DocumentVerificationLogEntry[];
  reviewNotes?: string;
}

export interface DocumentVerificationLogEntry {
  timestamp: string;
  stage: string;
  severity: DocumentVerificationLogSeverity;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface ScanStageResult {
  passed: boolean;
  message: string;
  reason?: string;
}

export interface AiScanResult {
  verdict: 'approved' | 'manual_review' | 'rejected';
  message: string;
  reason?: string;
  confidence?: number;
}

export interface RulesEvaluationResult {
  isValid: boolean;
  reasons: string[];
  warnings: string[];
}
