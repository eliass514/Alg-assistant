import { Module } from '@nestjs/common';

import { ServicesController } from '@modules/services/services.controller';
import { ServicesCacheService } from '@modules/services/services-cache.service';
import { ServicesService } from '@modules/services/services.service';

@Module({
  controllers: [ServicesController],
  providers: [ServicesService, ServicesCacheService],
  exports: [ServicesService],
})
export class ServicesModule {}
