import { Module } from '@nestjs/common';

import { AppointmentNotificationsService } from '@modules/appointments/appointment-notifications.service';
import { AppointmentsController } from '@modules/appointments/appointments.controller';
import { AppointmentsService } from '@modules/appointments/appointments.service';

@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentNotificationsService],
  exports: [AppointmentsService, AppointmentNotificationsService],
})
export class AppointmentsModule {}
