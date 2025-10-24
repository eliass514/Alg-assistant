import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

interface CacheEntry<T> {
  value: T;
  createdAt: number;
}

@Injectable()
export class ServicesCacheService {
  private readonly ttlMs = 5 * 60 * 1000; // 5 minutes placeholder TTL for low-connectivity caching
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  get ttlSeconds(): number {
    return Math.floor(this.ttlMs / 1000);
  }

  generateKey(namespace: string, payload?: unknown): string {
    const hash = createHash('sha256');
    hash.update(namespace);
    if (payload !== undefined) {
      hash.update(JSON.stringify(payload));
    }
    return `${namespace}:${hash.digest('hex').slice(0, 32)}`;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const isExpired = Date.now() - entry.createdAt > this.ttlMs;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T): void {
    this.cache.set(key, {
      value,
      createdAt: Date.now(),
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateByNamespace(namespace: string): void {
    for (const cacheKey of this.cache.keys()) {
      if (cacheKey.startsWith(`${namespace}:`)) {
        this.cache.delete(cacheKey);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}
