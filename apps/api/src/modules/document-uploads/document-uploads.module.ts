import { Module } from '@nestjs/common';

import { DocumentUploadsController } from './document-uploads.controller';
import { DocumentUploadsService } from './document-uploads.service';
import { FileStorageService } from './file-storage.service';
import { ValidationService } from './validation.service';

@Module({
  controllers: [DocumentUploadsController],
  providers: [DocumentUploadsService, FileStorageService, ValidationService],
  exports: [DocumentUploadsService, FileStorageService, ValidationService],
})
export class DocumentUploadsModule {}
