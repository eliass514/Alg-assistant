import { Injectable, TooManyRequestsException } from '@nestjs/common';

interface RateLimitEntry {
  timestamps: number[];
}

const ONE_SECOND = 1000;

@Injectable()
export class RateLimiterService {
  private readonly requests = new Map<string, RateLimitEntry>();
  private readonly limit = 5;
  private readonly windowMs = 60 * ONE_SECOND;

  assertWithinLimit(key: string): void {
    const now = Date.now();
    const entry = this.requests.get(key) ?? { timestamps: [] };

    entry.timestamps = entry.timestamps.filter((timestamp) => now - timestamp < this.windowMs);

    if (entry.timestamps.length >= this.limit) {
      throw new TooManyRequestsException('Rate limit exceeded for document verification upload');
    }

    entry.timestamps.push(now);
    this.requests.set(key, entry);
  }

  reset(): void {
    this.requests.clear();
  }
}
