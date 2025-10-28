import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { DocumentVerificationStatus } from '@modules/document-verification/document-verification.constants';
import { DocumentVerificationModule } from '@modules/document-verification/document-verification.module';
import { RateLimiterService } from '@modules/document-verification/rate-limiter.service';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';

const API_PREFIX = '/api/v1';

describe('Document Verification (e2e)', () => {
  let app: INestApplication;
  let rateLimiter: RateLimiterService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DocumentVerificationModule],
    }).compile();

    app = moduleRef.createNestApplication();

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

    app.setGlobalPrefix('api');

    await app.init();

    rateLimiter = app.get(RateLimiterService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    rateLimiter.reset();
  });

  it('approves a valid passport document automatically', async () => {
    const metadata = {
      number: 'P1234567',
      fullName: 'Jane Doe',
      country: 'FR',
      expirationDate: '2032-05-20',
      issuingAuthority: 'Paris Prefecture',
    };

    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/document-verification/upload`)
      .set('X-API-Key', 'passport-success')
      .field('docType', 'passport')
      .field('metadata', JSON.stringify(metadata))
      .attach('file', Buffer.from('Valid passport content'), 'document.pdf')
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        status: DocumentVerificationStatus.APPROVED,
        docType: 'passport',
        reasons: [],
      }),
    );
    expect(response.body.metadata.number).toContain('*');

    const statusResponse = await request(app.getHttpServer())
      .get(`${API_PREFIX}/document-verification/${response.body.id}/status`)
      .expect(200);

    expect(statusResponse.body.status).toBe(DocumentVerificationStatus.APPROVED);
    expect(statusResponse.body.id).toBe(response.body.id);
  });

  it('rejects documents that fail business rules', async () => {
    const metadata = {
      number: 'P1234567',
      fullName: 'Expired Person',
      country: 'FR',
      expirationDate: '2020-01-01',
    };

    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/document-verification/upload`)
      .set('X-API-Key', 'passport-expired')
      .field('docType', 'passport')
      .field('metadata', JSON.stringify(metadata))
      .attach('file', Buffer.from('Expired passport'), 'expired.pdf')
      .expect(201);

    expect(response.body.status).toBe(DocumentVerificationStatus.REJECTED);
    expect(response.body.reasons.join(' ')).toContain('expiration');
  });

  it('defers to manual review when AI confidence is too low', async () => {
    const metadata = {
      number: 'D12345',
      fullName: 'Manual Review Candidate',
      state: 'CA',
      expirationDate: '2030-01-01',
      aiConfidence: 0.4,
    };

    const uploadResponse = await request(app.getHttpServer())
      .post(`${API_PREFIX}/document-verification/upload`)
      .set('X-API-Key', 'manual-review')
      .field('docType', 'driver_license')
      .field('metadata', JSON.stringify(metadata))
      .attach('file', Buffer.from('manual_review token inside'), 'license.pdf')
      .expect(201);

    expect(uploadResponse.body.status).toBe(DocumentVerificationStatus.MANUAL_REVIEW);
    const documentId = uploadResponse.body.id;

    const reviewResponse = await request(app.getHttpServer())
      .post(`${API_PREFIX}/document-verification/${documentId}/review`)
      .send({ decision: 'approved', reviewer: 'qa-analyst', notes: 'Looks good upon inspection' })
      .expect(200);

    expect(reviewResponse.body.status).toBe(DocumentVerificationStatus.APPROVED);
    expect(reviewResponse.body.reasons).toEqual([]);
  });

  it('enforces rate limiting per API key', async () => {
    const metadata = {
      number: 'P1234567',
      fullName: 'Rate Limit Tester',
      country: 'FR',
      expirationDate: '2030-01-01',
    };

    const payload = () =>
      request(app.getHttpServer())
        .post(`${API_PREFIX}/document-verification/upload`)
        .set('X-API-Key', 'rate-limit-key')
        .field('docType', 'passport')
        .field('metadata', JSON.stringify(metadata))
        .attach('file', Buffer.from('content'), 'document.pdf');

    for (let i = 0; i < 5; i += 1) {
      await payload().expect(201);
    }

    await payload().expect(429);
  });

  it('captures detailed verification logs', async () => {
    const metadata = {
      accountNumber: '1234567890',
      provider: 'City Utilities',
      serviceAddress: '742 Evergreen Terrace',
      issueDate: new Date().toISOString(),
    };

    const uploadResponse = await request(app.getHttpServer())
      .post(`${API_PREFIX}/document-verification/upload`)
      .set('X-API-Key', 'logs-check')
      .field('docType', 'utility_bill')
      .field('metadata', JSON.stringify(metadata))
      .attach('file', Buffer.from('standard utility bill content'), 'bill.pdf')
      .expect(201);

    const logsResponse = await request(app.getHttpServer())
      .get(`${API_PREFIX}/document-verification/${uploadResponse.body.id}/logs`)
      .expect(200);

    expect(Array.isArray(logsResponse.body)).toBe(true);
    expect(logsResponse.body.length).toBeGreaterThanOrEqual(3);
    expect(logsResponse.body.map((entry: { stage: string }) => entry.stage)).toEqual(
      expect.arrayContaining(['upload', 'antivirus', 'rules']),
    );
  });
});
