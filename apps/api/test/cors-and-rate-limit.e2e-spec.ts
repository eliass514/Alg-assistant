import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@app/app.module';
import { AppConfig } from '@config/app.config';
import { CorsConfig } from '@config/cors.config';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';

const API_PREFIX = '/api/v1';

let originalRateLimitTtl: string | undefined;
let originalRateLimitMax: string | undefined;

describe('CORS and Rate Limiting (e2e)', () => {
  let app: INestApplication;
  let corsConfig: CorsConfig | undefined;

  beforeAll(async () => {
    originalRateLimitTtl = process.env.RATE_LIMIT_TTL;
    originalRateLimitMax = process.env.RATE_LIMIT_MAX;
    process.env.RATE_LIMIT_TTL = '60';
    process.env.RATE_LIMIT_MAX = '5';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    const configService = app.get(ConfigService);
    const appConfig = configService.get<AppConfig>('app', { infer: true });
    corsConfig = configService.get<CorsConfig>('cors', { infer: true });

    if (corsConfig?.enabled) {
      app.enableCors({
        origin: corsConfig.origins,
        credentials: corsConfig.credentials,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
        exposedHeaders: [
          'X-Total-Count',
          'X-RateLimit-Limit',
          'X-RateLimit-Remaining',
          'X-RateLimit-Reset',
        ],
      });
    }

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidUnknownValues: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new LoggingInterceptor());

    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    app.setGlobalPrefix(appConfig?.globalPrefix ?? 'api');

    await app.init();
  });

  afterAll(async () => {
    await app.close();

    if (originalRateLimitTtl === undefined) {
      delete process.env.RATE_LIMIT_TTL;
    } else {
      process.env.RATE_LIMIT_TTL = originalRateLimitTtl;
    }

    if (originalRateLimitMax === undefined) {
      delete process.env.RATE_LIMIT_MAX;
    } else {
      process.env.RATE_LIMIT_MAX = originalRateLimitMax;
    }
  });

  describe('CORS Configuration', () => {
    it('should include CORS headers in response', async () => {
      const origin = corsConfig?.origins[0] ?? 'http://localhost:3000';

      const response = await request(app.getHttpServer())
        .get(`${API_PREFIX}/health`)
        .set('Origin', origin)
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe(origin);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should handle OPTIONS preflight requests', async () => {
      const origin = corsConfig?.origins[0] ?? 'http://localhost:3000';

      const response = await request(app.getHttpServer())
        .options(`${API_PREFIX}/health`)
        .set('Origin', origin)
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe(origin);
      expect(response.headers['access-control-allow-methods']).toContain('GET');
    });

    it('should reject requests from disallowed origins', async () => {
      const response = await request(app.getHttpServer())
        .get(`${API_PREFIX}/health`)
        .set('Origin', 'http://malicious-site.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should expose rate limit headers', async () => {
      const origin = corsConfig?.origins[0] ?? 'http://localhost:3000';

      const response = await request(app.getHttpServer())
        .get(`${API_PREFIX}/health`)
        .set('Origin', origin)
        .expect(200);

      expect(response.headers['access-control-expose-headers']).toContain('X-RateLimit-Limit');
      expect(response.headers['access-control-expose-headers']).toContain('X-RateLimit-Remaining');
      expect(response.headers['access-control-expose-headers']).toContain('X-RateLimit-Reset');
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers in response', async () => {
      const response = await request(app.getHttpServer()).get(`${API_PREFIX}/health`).expect(200);

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('should track remaining rate limit on successive requests', async () => {
      const response1 = await request(app.getHttpServer()).get(`${API_PREFIX}/health`).expect(200);

      const remaining1 = parseInt(response1.headers['x-ratelimit-remaining'], 10);
      expect(remaining1).toBeGreaterThanOrEqual(0);

      const response2 = await request(app.getHttpServer()).get(`${API_PREFIX}/health`).expect(200);

      const remaining2 = parseInt(response2.headers['x-ratelimit-remaining'], 10);
      expect(remaining2).toBeLessThanOrEqual(remaining1);
    });

    it('should return 429 when rate limit is exceeded', async () => {
      const limit = parseInt(process.env.RATE_LIMIT_MAX ?? '5', 10);

      for (let i = 0; i < limit; i++) {
        await request(app.getHttpServer()).get(`${API_PREFIX}/health`).expect(200);
      }

      await request(app.getHttpServer()).get(`${API_PREFIX}/health`).expect(429);
    }, 30000);

    it('should have correct limit value in headers', async () => {
      const expectedLimit = process.env.RATE_LIMIT_MAX ?? '5';

      const response = await request(app.getHttpServer()).get(`${API_PREFIX}/health`).expect(200);

      expect(response.headers['x-ratelimit-limit']).toBe(expectedLimit);
    });
  });
});
