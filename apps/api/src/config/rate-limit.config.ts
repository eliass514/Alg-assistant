import { registerAs } from '@nestjs/config';

export interface RateLimitConfig {
  ttl: number;
  limit: number;
}

export default registerAs<RateLimitConfig>('rateLimit', () => {
  const ttl = Number.parseInt(process.env.RATE_LIMIT_TTL ?? '60', 10);
  const limit = Number.parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10);

  return {
    ttl: Number.isNaN(ttl) || ttl <= 0 ? 60 : ttl,
    limit: Number.isNaN(limit) || limit <= 0 ? 100 : limit,
  };
});
