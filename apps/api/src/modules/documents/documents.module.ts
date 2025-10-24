import { Module } from '@nestjs/common';

import { DocumentsController } from '@modules/documents/documents.controller';
import { DocumentsService } from '@modules/documents/documents.service';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
