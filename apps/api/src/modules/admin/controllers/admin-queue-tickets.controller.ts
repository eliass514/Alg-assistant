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

import { AdminQueueTicketsService } from '../services/admin-queue-tickets.service';
import { AdminQueueTicketsQueryDto } from '../dto/admin-queue-tickets-query.dto';
import { AdminUpdateQueueTicketDto } from '../dto/admin-update-queue-ticket.dto';

@ApiTags('admin-queue-tickets')
@ApiBearerAuth()
@Controller({ path: 'admin/queue-tickets', version: '1' })
@Roles(ROLE.ADMIN)
export class AdminQueueTicketsController {
  constructor(private readonly adminQueueTicketsService: AdminQueueTicketsService) {}

  @Get()
  @ApiOperation({ summary: 'List queue tickets with filters for admin' })
  @ApiOkResponse({ description: 'Queue tickets retrieved' })
  list(@Query() query: AdminQueueTicketsQueryDto) {
    return this.adminQueueTicketsService.listQueueTickets(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get queue ticket by id for admin' })
  @ApiOkResponse({ description: 'Queue ticket retrieved' })
  getById(@Param() params: ResourceIdParamDto) {
    return this.adminQueueTicketsService.getQueueTicketById(params.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a queue ticket (status, position, etc.)' })
  @ApiOkResponse({ description: 'Queue ticket updated' })
  update(@Param() params: ResourceIdParamDto, @Body() dto: AdminUpdateQueueTicketDto) {
    return this.adminQueueTicketsService.updateQueueTicket(params.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a queue ticket' })
  @ApiNoContentResponse({ description: 'Queue ticket deleted' })
  remove(@Param() params: ResourceIdParamDto) {
    return this.adminQueueTicketsService.deleteQueueTicket(params.id);
  }
}
