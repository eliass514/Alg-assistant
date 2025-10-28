import { Module } from '@nestjs/common';

import { ServicesModule } from '@modules/services/services.module';

import { AdminCategoriesController } from './controllers/admin-categories.controller';
import { AdminServicesController } from './controllers/admin-services.controller';
import { AdminServicesService } from './services/admin-services.service';

@Module({
  imports: [ServicesModule],
  controllers: [AdminServicesController, AdminCategoriesController],
  providers: [AdminServicesService],
  exports: [AdminServicesService],
})
export class AdminModule {}
