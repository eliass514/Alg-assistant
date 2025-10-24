import { Module } from '@nestjs/common';

import { AppointmentsController } from '@modules/appointments/appointments.controller';
import { AppointmentsService } from '@modules/appointments/appointments.service';

@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
