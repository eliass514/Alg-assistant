import { Module } from '@nestjs/common';

import { ServicesModule } from '@modules/services/services.module';
import { DocumentTemplatesModule } from '@modules/document-templates/document-templates.module';
import { DocumentUploadsModule } from '@modules/document-uploads/document-uploads.module';

import { AdminCategoriesController } from './controllers/admin-categories.controller';
import { AdminServicesController } from './controllers/admin-services.controller';
import { AdminAppointmentsController } from './controllers/admin-appointments.controller';
import { AdminQueueTicketsController } from './controllers/admin-queue-tickets.controller';
import { AdminDocumentTemplatesController } from './controllers/admin-document-templates.controller';
import { AdminLogsController } from './controllers/admin-logs.controller';
import { AdminServicesService } from './services/admin-services.service';
import { AdminAppointmentsService } from './services/admin-appointments.service';
import { AdminQueueTicketsService } from './services/admin-queue-tickets.service';
import { AdminDocumentTemplatesService } from './services/admin-document-templates.service';
import { AdminLogsService } from './services/admin-logs.service';

@Module({
  imports: [ServicesModule, DocumentTemplatesModule, DocumentUploadsModule],
  controllers: [
    AdminServicesController,
    AdminCategoriesController,
    AdminAppointmentsController,
    AdminQueueTicketsController,
    AdminDocumentTemplatesController,
    AdminLogsController,
  ],
  providers: [
    AdminServicesService,
    AdminAppointmentsService,
    AdminQueueTicketsService,
    AdminDocumentTemplatesService,
    AdminLogsService,
  ],
  exports: [
    AdminServicesService,
    AdminAppointmentsService,
    AdminQueueTicketsService,
    AdminDocumentTemplatesService,
    AdminLogsService,
  ],
})
export class AdminModule {}
