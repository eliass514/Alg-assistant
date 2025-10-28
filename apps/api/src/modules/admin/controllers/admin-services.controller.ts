import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { ROLE } from '@common/constants/role.constants';
import { Roles } from '@common/decorators/roles.decorator';
import { ResourceIdParamDto } from '@acme/shared-dto';
import { ServicesQueryDto } from '@modules/services/dto/services-query.dto';
import { LocaleQueryDto } from '@modules/services/dto/locale-query.dto';

import { AdminServicesService } from '../services/admin-services.service';
import { AdminCreateServiceDto } from '../dto/admin-create-service.dto';
import { AdminUpdateServiceDto } from '../dto/admin-update-service.dto';

@ApiTags('admin-services')
@ApiBearerAuth()
@Controller({ path: 'admin/services', version: '1' })
@Roles(ROLE.ADMIN)
export class AdminServicesController {
  constructor(private readonly adminServicesService: AdminServicesService) {}

  @Get()
  @ApiOperation({ summary: 'List services for admin' })
  @ApiOkResponse({ description: 'Services retrieved' })
  list(@Query() query: ServicesQueryDto) {
    return this.adminServicesService.listServices(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service by id for admin' })
  @ApiOkResponse({ description: 'Service retrieved' })
  getById(@Param() params: ResourceIdParamDto, @Query() query: LocaleQueryDto) {
    return this.adminServicesService.getServiceById(params.id, query.locale);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a service' })
  @ApiCreatedResponse({ description: 'Service created' })
  create(@Body() dto: AdminCreateServiceDto) {
    return this.adminServicesService.createService(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a service' })
  @ApiOkResponse({ description: 'Service updated' })
  update(@Param() params: ResourceIdParamDto, @Body() dto: AdminUpdateServiceDto) {
    return this.adminServicesService.updateService(params.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a service' })
  @ApiNoContentResponse({ description: 'Service deleted' })
  remove(@Param() params: ResourceIdParamDto) {
    return this.adminServicesService.deleteService(params.id);
  }
}
