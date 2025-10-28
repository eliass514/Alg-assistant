import { Injectable } from '@nestjs/common';

@Injectable()
export class PrivacyService {
  private readonly sensitiveKeyPatterns = [
    /name/i,
    /email/i,
    /phone/i,
    /number/i,
    /address/i,
    /account/i,
    /identifier/i,
  ];

  sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    return this.maskObject(metadata);
  }

  private maskObject(value: unknown): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return result;
    }

    for (const [key, nestedValue] of Object.entries(value)) {
      result[key] = this.maskValue(key, nestedValue);
    }

    return result;
  }

  private maskArray(key: string, values: unknown[]): unknown[] {
    return values.map((value) => this.maskValue(key, value));
  }

  private maskValue(key: string, value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (Array.isArray(value)) {
      return this.maskArray(key, value);
    }

    if (typeof value === 'object') {
      return this.maskObject(value);
    }

    if (typeof value === 'string' && this.isSensitiveKey(key)) {
      return this.maskString(value);
    }

    return value;
  }

  private isSensitiveKey(key: string): boolean {
    return this.sensitiveKeyPatterns.some((pattern) => pattern.test(key));
  }

  private maskString(value: string): string {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return trimmed;
    }

    if (trimmed.length <= 2) {
      return '*'.repeat(trimmed.length);
    }

    if (trimmed.length <= 4) {
      return `${trimmed[0]}${'*'.repeat(trimmed.length - 1)}`;
    }

    const lastFour = trimmed.slice(-4);
    return `${trimmed.slice(0, 1)}${'*'.repeat(Math.max(0, trimmed.length - 5))}${lastFour}`;
  }
}
