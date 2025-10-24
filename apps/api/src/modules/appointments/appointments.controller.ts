import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { PaginationQueryDto, ResourceIdParamDto } from '@acme/shared-dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/interfaces/authenticated-user.interface';
import {
  AppointmentAvailabilityQueryDto,
  AppointmentAvailabilityResponseDto,
  AppointmentDetailResponseDto,
  AppointmentListResponseDto,
  BookAppointmentDto,
  CancelAppointmentDto,
  CreateQueueTicketDto,
  QueueTicketDetailResponseDto,
  RescheduleAppointmentDto,
  UpdateQueueTicketStatusDto,
} from '@modules/appointments/dto';
import { AppointmentsService } from '@modules/appointments/appointments.service';

@ApiTags('appointments')
@ApiBearerAuth()
@Controller({ path: 'appointments', version: '1' })
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List scheduled appointments' })
  @ApiOkResponse({ description: 'Appointments retrieved', type: AppointmentListResponseDto })
  list(@Query() query: PaginationQueryDto) {
    return this.appointmentsService.list(query);
  }

  @Get('availability')
  @ApiOperation({ summary: 'Retrieve slot availability for a service' })
  @ApiOkResponse({
    description: 'Availability retrieved',
    type: AppointmentAvailabilityResponseDto,
  })
  getAvailability(@Query() query: AppointmentAvailabilityQueryDto) {
    return this.appointmentsService.getAvailability(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment details' })
  @ApiOkResponse({ description: 'Appointment retrieved', type: AppointmentDetailResponseDto })
  getById(@Param() params: ResourceIdParamDto) {
    return this.appointmentsService.getById(params.id);
  }

  @Post()
  @ApiOperation({ summary: 'Book a new appointment' })
  @ApiCreatedResponse({ description: 'Appointment booked', type: AppointmentDetailResponseDto })
  book(@CurrentUser() user: AuthenticatedUser, @Body() payload: BookAppointmentDto) {
    return this.appointmentsService.book(user, payload);
  }

  @Patch(':id/reschedule')
  @ApiOperation({ summary: 'Reschedule an existing appointment' })
  @ApiOkResponse({ description: 'Appointment rescheduled', type: AppointmentDetailResponseDto })
  reschedule(
    @Param() params: ResourceIdParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: RescheduleAppointmentDto,
  ) {
    return this.appointmentsService.reschedule(params.id, user, payload);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a scheduled appointment' })
  @ApiOkResponse({ description: 'Appointment cancelled', type: AppointmentDetailResponseDto })
  cancel(
    @Param() params: ResourceIdParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CancelAppointmentDto,
  ) {
    return this.appointmentsService.cancel(params.id, user, payload);
  }

  @Post('queue')
  @ApiOperation({ summary: 'Create a queue ticket for a service' })
  @ApiCreatedResponse({ description: 'Queue ticket created', type: QueueTicketDetailResponseDto })
  joinQueue(@CurrentUser() user: AuthenticatedUser, @Body() payload: CreateQueueTicketDto) {
    return this.appointmentsService.createQueueTicket(user, payload);
  }

  @Patch('queue/:id/status')
  @ApiOperation({ summary: 'Update the status of a queue ticket' })
  @ApiOkResponse({ description: 'Queue ticket updated', type: QueueTicketDetailResponseDto })
  updateQueueTicketStatus(
    @Param() params: ResourceIdParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: UpdateQueueTicketStatusDto,
  ) {
    return this.appointmentsService.updateQueueTicketStatus(params.id, user, payload);
  }
}
