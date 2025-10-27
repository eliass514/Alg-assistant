import { Module } from '@nestjs/common';

import { DocumentUploadsController } from './document-uploads.controller';
import { DocumentUploadsService } from './document-uploads.service';
import { FileStorageService } from './file-storage.service';

@Module({
  controllers: [DocumentUploadsController],
  providers: [DocumentUploadsService, FileStorageService],
  exports: [DocumentUploadsService, FileStorageService],
})
export class DocumentUploadsModule {}
