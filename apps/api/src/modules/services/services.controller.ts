import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PaginationQueryDto, ResourceIdParamDto } from '@acme/shared-dto';

import { ServicesService } from '@modules/services/services.service';

@ApiTags('services')
@Controller({ path: 'services', version: '1' })
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @ApiOperation({ summary: 'List available services' })
  @ApiOkResponse({ description: 'Services retrieved' })
  list(@Query() query: PaginationQueryDto) {
    return this.servicesService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service by id' })
  @ApiOkResponse({ description: 'Service retrieved' })
  getById(@Param() params: ResourceIdParamDto) {
    return this.servicesService.getById(params.id);
  }
}
