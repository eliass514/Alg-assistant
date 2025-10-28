import { Module } from '@nestjs/common';

import { ServicesModule } from '@modules/services/services.module';

import { AdminCategoriesController } from './controllers/admin-categories.controller';
import { AdminServicesController } from './controllers/admin-services.controller';
import { AdminAppointmentsController } from './controllers/admin-appointments.controller';
import { AdminQueueTicketsController } from './controllers/admin-queue-tickets.controller';
import { AdminServicesService } from './services/admin-services.service';
import { AdminAppointmentsService } from './services/admin-appointments.service';
import { AdminQueueTicketsService } from './services/admin-queue-tickets.service';

@Module({
  imports: [ServicesModule],
  controllers: [
    AdminServicesController,
    AdminCategoriesController,
    AdminAppointmentsController,
    AdminQueueTicketsController,
  ],
  providers: [AdminServicesService, AdminAppointmentsService, AdminQueueTicketsService],
  exports: [AdminServicesService, AdminAppointmentsService, AdminQueueTicketsService],
})
export class AdminModule {}
