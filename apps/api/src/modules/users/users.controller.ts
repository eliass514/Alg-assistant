import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PaginationQueryDto, ResourceIdParamDto } from '@acme/shared-dto';

import { UsersService } from '@modules/users/users.service';

@ApiTags('users')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users' })
  @ApiOkResponse({ description: 'Users retrieved' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single user' })
  @ApiOkResponse({ description: 'User retrieved' })
  findOne(@Param() params: ResourceIdParamDto) {
    return this.usersService.findOne(params.id);
  }
}
