import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PaginationQueryDto, ResourceIdParamDto } from '@acme/shared-dto';

import { AppointmentsService } from '@modules/appointments/appointments.service';

@ApiTags('appointments')
@Controller({ path: 'appointments', version: '1' })
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List scheduled appointments' })
  @ApiOkResponse({ description: 'Appointments retrieved' })
  list(@Query() query: PaginationQueryDto) {
    return this.appointmentsService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment details' })
  @ApiOkResponse({ description: 'Appointment retrieved' })
  getById(@Param() params: ResourceIdParamDto) {
    return this.appointmentsService.getById(params.id);
  }
}
