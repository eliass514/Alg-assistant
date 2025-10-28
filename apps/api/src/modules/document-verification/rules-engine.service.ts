import { Injectable, Logger } from '@nestjs/common';
import { DateTime } from 'luxon';

import { RulesEvaluationResult } from './interfaces/document-verification.interface';

interface RuleContext {
  metadata: Record<string, unknown>;
}

type RuleHandler = (context: RuleContext) => string | null;

type WarningHandler = (context: RuleContext) => string | null;

interface RuleSet {
  requiredFields: string[];
  rules: RuleHandler[];
  warnings?: WarningHandler[];
}

@Injectable()
export class RulesEngineService {
  private readonly logger = new Logger(RulesEngineService.name);

  private readonly ruleSets: Record<string, RuleSet> = {
    passport: {
      requiredFields: ['number', 'fullName', 'country', 'expirationDate'],
      rules: [
        ({ metadata }) =>
          this.assertFutureDate(
            metadata,
            'expirationDate',
            'Passport expiration date must be in the future',
          ),
        ({ metadata }) =>
          this.assertLength(
            metadata,
            'number',
            6,
            12,
            'Passport number must be between 6 and 12 characters',
          ),
      ],
      warnings: [({ metadata }) => this.warnIfMissing(metadata, 'issuingAuthority')],
    },
    driver_license: {
      requiredFields: ['number', 'state', 'fullName', 'expirationDate'],
      rules: [
        ({ metadata }) =>
          this.assertFutureDate(
            metadata,
            'expirationDate',
            'Driver license expiration date must be in the future',
          ),
        ({ metadata }) =>
          this.assertPattern(
            metadata,
            'state',
            /^[A-Z]{2}$/,
            'Driver license state must be a two-letter code',
          ),
        ({ metadata }) =>
          this.assertPattern(
            metadata,
            'number',
            /^[A-Z0-9]{5,16}$/,
            'Driver license number must be alphanumeric (5-16 chars)',
          ),
      ],
      warnings: [({ metadata }) => this.warnIfMissing(metadata, 'address')],
    },
    utility_bill: {
      requiredFields: ['accountNumber', 'serviceAddress', 'issueDate', 'provider'],
      rules: [
        ({ metadata }) =>
          this.assertRecentDate(
            metadata,
            'issueDate',
            90,
            'Utility bill must be issued within the last 90 days',
          ),
        ({ metadata }) =>
          this.assertLength(
            metadata,
            'accountNumber',
            6,
            20,
            'Account number must be between 6 and 20 characters',
          ),
      ],
      warnings: [({ metadata }) => this.warnIfMissing(metadata, 'customerName')],
    },
  };

  evaluate(docType: string, metadata: Record<string, unknown>): RulesEvaluationResult {
    const sanitizedType = docType?.toLowerCase();
    const rules = this.ruleSets[sanitizedType];

    if (!rules) {
      this.logger.warn(`Unsupported document type received: ${docType}`);
      return {
        isValid: false,
        reasons: [`Unsupported document type: ${docType}`],
        warnings: [],
      };
    }

    const reasons: string[] = [];
    const warnings: string[] = [];

    for (const field of rules.requiredFields) {
      if (!this.hasValue(metadata, field)) {
        reasons.push(`Missing required field: ${field}`);
      }
    }

    if (reasons.length > 0) {
      return {
        isValid: false,
        reasons,
        warnings,
      };
    }

    for (const rule of rules.rules) {
      const outcome = rule({ metadata });
      if (outcome) {
        reasons.push(outcome);
      }
    }

    for (const warningRule of rules.warnings ?? []) {
      const warning = warningRule({ metadata });
      if (warning) {
        warnings.push(warning);
      }
    }

    return {
      isValid: reasons.length === 0,
      reasons,
      warnings,
    };
  }

  private hasValue(metadata: Record<string, unknown>, field: string): boolean {
    const value = metadata?.[field];
    return value !== null && value !== undefined && value !== '';
  }

  private assertFutureDate(
    metadata: Record<string, unknown>,
    field: string,
    message: string,
  ): string | null {
    const raw = metadata?.[field];
    if (typeof raw !== 'string') {
      return `${field} must be a valid ISO date string`;
    }

    const date = DateTime.fromISO(raw, { zone: 'utc' });
    if (!date.isValid) {
      return `${field} must be a valid ISO date string`;
    }

    if (date.startOf('day') <= DateTime.utc().startOf('day')) {
      return message;
    }

    return null;
  }

  private assertRecentDate(
    metadata: Record<string, unknown>,
    field: string,
    days: number,
    message: string,
  ): string | null {
    const raw = metadata?.[field];
    if (typeof raw !== 'string') {
      return `${field} must be a valid ISO date string`;
    }

    const date = DateTime.fromISO(raw, { zone: 'utc' });
    if (!date.isValid) {
      return `${field} must be a valid ISO date string`;
    }

    if (date < DateTime.utc().minus({ days })) {
      return message;
    }

    return null;
  }

  private assertLength(
    metadata: Record<string, unknown>,
    field: string,
    min: number,
    max: number,
    message: string,
  ): string | null {
    const value = metadata?.[field];
    if (typeof value !== 'string') {
      return `${field} must be a string`;
    }

    if (value.length < min || value.length > max) {
      return message;
    }

    return null;
  }

  private assertPattern(
    metadata: Record<string, unknown>,
    field: string,
    pattern: RegExp,
    message: string,
  ): string | null {
    const value = metadata?.[field];

    if (typeof value !== 'string') {
      return `${field} must be a string`;
    }

    if (!pattern.test(value)) {
      return message;
    }

    return null;
  }

  private warnIfMissing(metadata: Record<string, unknown>, field: string): string | null {
    if (!this.hasValue(metadata, field)) {
      return `Optional field ${field} is missing`;
    }

    return null;
  }
}
