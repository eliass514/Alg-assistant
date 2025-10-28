import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { ROLE } from '@common/constants/role.constants';
import { Roles } from '@common/decorators/roles.decorator';
import { ResourceIdParamDto } from '@acme/shared-dto';

import { AdminAppointmentsService } from '../services/admin-appointments.service';
import { AdminAppointmentsQueryDto } from '../dto/admin-appointments-query.dto';
import { AdminUpdateAppointmentDto } from '../dto/admin-update-appointment.dto';

@ApiTags('admin-appointments')
@ApiBearerAuth()
@Controller({ path: 'admin/appointments', version: '1' })
@Roles(ROLE.ADMIN)
export class AdminAppointmentsController {
  constructor(private readonly adminAppointmentsService: AdminAppointmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List appointments with filters for admin' })
  @ApiOkResponse({ description: 'Appointments retrieved' })
  list(@Query() query: AdminAppointmentsQueryDto) {
    return this.adminAppointmentsService.listAppointments(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment by id for admin' })
  @ApiOkResponse({ description: 'Appointment retrieved' })
  getById(@Param() params: ResourceIdParamDto) {
    return this.adminAppointmentsService.getAppointmentById(params.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an appointment (status, reschedule, etc.)' })
  @ApiOkResponse({ description: 'Appointment updated' })
  update(@Param() params: ResourceIdParamDto, @Body() dto: AdminUpdateAppointmentDto) {
    return this.adminAppointmentsService.updateAppointment(params.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an appointment' })
  @ApiNoContentResponse({ description: 'Appointment deleted' })
  remove(@Param() params: ResourceIdParamDto) {
    return this.adminAppointmentsService.deleteAppointment(params.id);
  }
}
