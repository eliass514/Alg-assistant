import { createHash } from 'crypto';

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Express } from 'express';
import { v4 as uuidv4 } from 'uuid';

import {
  DocumentVerificationLogSeverity,
  DocumentVerificationStatus,
} from './document-verification.constants';
import {
  AiScanResult,
  DocumentVerificationLogEntry,
  DocumentVerificationRecord,
  RulesEvaluationResult,
  ScanStageResult,
} from './interfaces/document-verification.interface';
import { ReviewDecision } from './dto/review-document.dto';
import { PrivacyService } from './privacy.service';
import { RateLimiterService } from './rate-limiter.service';
import { RulesEngineService } from './rules-engine.service';
import { DocumentScannerService } from './scanning.service';

interface DocumentVerificationResponse {
  id: string;
  docType: string;
  status: DocumentVerificationStatus;
  createdAt: string;
  updatedAt: string;
  originalFilename: string;
  fileSize: number;
  reasons: string[];
  warnings: string[];
  metadata: Record<string, unknown>;
}

@Injectable()
export class DocumentVerificationService {
  private readonly logger = new Logger(DocumentVerificationService.name);
  private readonly records = new Map<string, DocumentVerificationRecord>();

  constructor(
    private readonly scanner: DocumentScannerService,
    private readonly rulesEngine: RulesEngineService,
    private readonly privacyService: PrivacyService,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  uploadDocument(
    rateLimitKey: string,
    docType: string,
    metadata: Record<string, unknown>,
    file: Express.Multer.File,
  ): DocumentVerificationResponse {
    this.rateLimiter.assertWithinLimit(rateLimitKey);

    if (!file || !file.buffer) {
      throw new BadRequestException('File payload is required');
    }

    const record = this.createRecord(docType, metadata, file);

    this.appendLog(record, 'upload', 'Document received for verification', {
      mimeType: record.mimeType,
      fileSize: record.fileSize,
    });

    const antivirusResult = this.scanner.scanForViruses(file.buffer);
    this.handleAntivirusResult(record, antivirusResult);
    if (record.status === DocumentVerificationStatus.REJECTED) {
      return this.toResponse(record);
    }

    const aiResult = this.scanner.analyzeWithAi(file.buffer, metadata);
    this.handleAiResult(record, aiResult);
    if (
      record.status === DocumentVerificationStatus.REJECTED ||
      record.status === DocumentVerificationStatus.MANUAL_REVIEW
    ) {
      return this.toResponse(record);
    }

    const rulesResult = this.rulesEngine.evaluate(docType, metadata);
    this.handleRulesResult(record, rulesResult);
    if (record.status !== DocumentVerificationStatus.APPROVED) {
      return this.toResponse(record);
    }

    this.appendLog(record, 'verification', 'Document approved automatically', {
      warnings: record.warnings,
    });

    return this.toResponse(record);
  }

  getStatus(id: string): DocumentVerificationResponse {
    const record = this.getRecordOrFail(id);
    return this.toResponse(record);
  }

  getLogs(id: string): DocumentVerificationLogEntry[] {
    const record = this.getRecordOrFail(id);
    return record.logs.map((entry) => ({ ...entry }));
  }

  submitReview(
    id: string,
    decision: ReviewDecision,
    reviewer: string,
    notes?: string,
  ): DocumentVerificationResponse {
    const record = this.getRecordOrFail(id);

    if (record.status !== DocumentVerificationStatus.MANUAL_REVIEW) {
      throw new BadRequestException('Document is not awaiting manual review');
    }

    record.updatedAt = new Date();
    record.reviewNotes = notes;

    if (decision === ReviewDecision.APPROVED) {
      record.status = DocumentVerificationStatus.APPROVED;
      record.reasons = [];
      this.appendLog(record, 'manual-review', 'Document approved by reviewer', {
        reviewer,
        notes,
      });
    } else {
      record.status = DocumentVerificationStatus.REJECTED;
      record.reasons = notes ? [notes] : ['Rejected during manual review'];
      this.appendLog(record, 'manual-review', 'Document rejected by reviewer', {
        reviewer,
        notes,
      });
    }

    return this.toResponse(record);
  }

  private createRecord(
    docType: string,
    metadata: Record<string, unknown>,
    file: Express.Multer.File,
  ): DocumentVerificationRecord {
    const now = new Date();
    const id = uuidv4();
    const checksum = createHash('sha256').update(file.buffer).digest('hex');
    const normalizedDocType = docType?.trim().toLowerCase() ?? docType;

    const record: DocumentVerificationRecord = {
      id,
      docType: normalizedDocType,
      originalFilename: file.originalname ?? 'document',
      mimeType: file.mimetype ?? 'application/octet-stream',
      fileSize: file.buffer.byteLength,
      fileChecksum: checksum,
      createdAt: now,
      updatedAt: now,
      status: DocumentVerificationStatus.PENDING,
      reasons: [],
      warnings: [],
      metadata: { ...metadata },
      sanitizedMetadata: this.privacyService.sanitizeMetadata(metadata),
      logs: [],
    };

    this.records.set(id, record);
    this.logger.verbose(
      `Stored document verification record ${id} (${docType}) for file ${record.originalFilename}`,
    );

    return record;
  }

  private handleAntivirusResult(record: DocumentVerificationRecord, result: ScanStageResult): void {
    this.appendLog(record, 'antivirus', result.message, {
      passed: result.passed,
    });

    if (!result.passed) {
      record.status = DocumentVerificationStatus.REJECTED;
      record.updatedAt = new Date();
      if (result.reason) {
        record.reasons = [result.reason];
      }
      this.appendLog(
        record,
        'antivirus',
        'Document rejected due to antivirus failure',
        {
          reason: result.reason,
        },
        DocumentVerificationLogSeverity.ERROR,
      );
    }
  }

  private handleAiResult(record: DocumentVerificationRecord, result: AiScanResult): void {
    const severity =
      result.verdict === 'approved'
        ? DocumentVerificationLogSeverity.INFO
        : result.verdict === 'manual_review'
          ? DocumentVerificationLogSeverity.WARNING
          : DocumentVerificationLogSeverity.ERROR;

    this.appendLog(
      record,
      'ai',
      result.message,
      {
        verdict: result.verdict,
        confidence: result.confidence,
        reason: result.reason,
      },
      severity,
    );

    record.updatedAt = new Date();

    if (result.verdict === 'rejected') {
      record.status = DocumentVerificationStatus.REJECTED;
      if (result.reason) {
        record.reasons = [result.reason];
      }
    } else if (result.verdict === 'manual_review') {
      record.status = DocumentVerificationStatus.MANUAL_REVIEW;
      if (result.reason) {
        record.reasons = [result.reason];
      }
    }
  }

  private handleRulesResult(
    record: DocumentVerificationRecord,
    result: RulesEvaluationResult,
  ): void {
    if (result.isValid) {
      record.status = DocumentVerificationStatus.APPROVED;
      record.warnings = result.warnings;
      record.updatedAt = new Date();
      this.appendLog(record, 'rules', 'Document passed business rules validation', {
        warnings: result.warnings,
      });
      return;
    }

    record.status = DocumentVerificationStatus.REJECTED;
    record.updatedAt = new Date();
    record.reasons = result.reasons;
    record.warnings = result.warnings;
    this.appendLog(
      record,
      'rules',
      'Document rejected by business rules validation',
      {
        reasons: result.reasons,
        warnings: result.warnings,
      },
      DocumentVerificationLogSeverity.ERROR,
    );
  }

  private appendLog(
    record: DocumentVerificationRecord,
    stage: string,
    message: string,
    metadata: Record<string, unknown> = {},
    severity: DocumentVerificationLogSeverity = DocumentVerificationLogSeverity.INFO,
  ): void {
    const logEntry: DocumentVerificationLogEntry = {
      timestamp: new Date().toISOString(),
      stage,
      severity,
      message,
      metadata,
    };

    record.logs.push(logEntry);
  }

  private getRecordOrFail(id: string): DocumentVerificationRecord {
    const record = this.records.get(id);
    if (!record) {
      throw new NotFoundException(`Document verification request ${id} not found`);
    }

    return record;
  }

  private toResponse(record: DocumentVerificationRecord): DocumentVerificationResponse {
    return {
      id: record.id,
      docType: record.docType,
      status: record.status,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      originalFilename: record.originalFilename,
      fileSize: record.fileSize,
      reasons: [...record.reasons],
      warnings: [...record.warnings],
      metadata: { ...record.sanitizedMetadata },
    };
  }
}
