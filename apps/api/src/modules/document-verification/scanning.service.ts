import { Injectable, Logger } from '@nestjs/common';

import { AiScanResult, ScanStageResult } from './interfaces/document-verification.interface';

@Injectable()
export class DocumentScannerService {
  private readonly logger = new Logger(DocumentScannerService.name);
  private readonly suspiciousSignatures = ['virus', 'malware', 'phishing', 'eicar'];
  private readonly manualReviewTokens = ['manual_review', 'illegible', 'uncertain'];
  private readonly maxFileSizeBytes = 8 * 1024 * 1024;

  scanForViruses(buffer: Buffer): ScanStageResult {
    this.logger.debug(`Running antivirus scan for payload (${buffer.byteLength} bytes)`);

    if (buffer.byteLength === 0) {
      return {
        passed: false,
        message: 'File is empty',
        reason: 'Uploaded file is empty',
      };
    }

    if (buffer.byteLength > this.maxFileSizeBytes) {
      return {
        passed: false,
        message: 'File size exceeds allowed limit',
        reason: `File exceeds maximum size of ${this.maxFileSizeBytes} bytes`,
      };
    }

    const lowercase = buffer.toString('utf8').toLowerCase();
    const signature = this.suspiciousSignatures.find((token) => lowercase.includes(token));

    if (signature) {
      return {
        passed: false,
        message: 'File failed antivirus screening',
        reason: `Detected disallowed signature: ${signature}`,
      };
    }

    return {
      passed: true,
      message: 'Antivirus scan passed',
    };
  }

  analyzeWithAi(buffer: Buffer, metadata: Record<string, unknown>): AiScanResult {
    this.logger.debug('Running AI-based document heuristics');

    const lowercase = buffer.toString('utf8').toLowerCase();
    if (this.manualReviewTokens.some((token) => lowercase.includes(token))) {
      return {
        verdict: 'manual_review',
        message: 'Content requires human attention',
        reason: 'Detected ambiguous content markers in file',
        confidence: 0.4,
      };
    }

    const riskFlag = Array.isArray(metadata?.['riskFlags'])
      ? (metadata?.['riskFlags'] as unknown[]).map((value) => `${value}`.toLowerCase())
      : [];

    if (riskFlag.includes('reject_document')) {
      return {
        verdict: 'rejected',
        message: 'AI heuristics rejected the document',
        reason: 'riskFlags includes reject_document',
        confidence: 0.1,
      };
    }

    const confidence = this.deriveConfidenceScore(metadata);

    if (confidence < 0.55) {
      return {
        verdict: 'manual_review',
        message: 'Low AI confidence score',
        reason: `Confidence score ${confidence.toFixed(2)} below threshold`,
        confidence,
      };
    }

    return {
      verdict: 'approved',
      message: 'AI heuristics approved the document',
      confidence,
    };
  }

  private deriveConfidenceScore(metadata: Record<string, unknown>): number {
    const score = metadata?.['aiConfidence'];
    if (typeof score === 'number' && !Number.isNaN(score)) {
      return Math.max(0, Math.min(score, 1));
    }

    if (typeof score === 'string') {
      const numeric = Number(score);
      if (!Number.isNaN(numeric)) {
        return Math.max(0, Math.min(numeric, 1));
      }
    }

    return 0.75;
  }
}
