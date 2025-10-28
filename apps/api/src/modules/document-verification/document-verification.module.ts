import { Module } from '@nestjs/common';

import { DocumentVerificationController } from './document-verification.controller';
import { DocumentVerificationService } from './document-verification.service';
import { PrivacyService } from './privacy.service';
import { RateLimiterService } from './rate-limiter.service';
import { RulesEngineService } from './rules-engine.service';
import { DocumentScannerService } from './scanning.service';

@Module({
  controllers: [DocumentVerificationController],
  providers: [
    DocumentVerificationService,
    DocumentScannerService,
    RulesEngineService,
    PrivacyService,
    RateLimiterService,
  ],
})
export class DocumentVerificationModule {}
