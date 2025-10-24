import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ROLE } from '@common/constants/role.constants';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { PaginationQueryDto, ResourceIdParamDto } from '@acme/shared-dto';
import { AuthenticatedUserDto } from '@modules/auth/dto/auth-tokens-response.dto';
import { AuthenticatedUser } from '@modules/auth/interfaces/authenticated-user.interface';
import { UpdateProfileDto } from '@modules/users/dto/update-profile.dto';
import { UsersService } from '@modules/users/users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(ROLE.ADMIN)
  @ApiOperation({ summary: 'List users' })
  @ApiOkResponse({ description: 'Users retrieved' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get('me')
  @ApiOperation({ summary: 'Retrieve the authenticated user profile' })
  @ApiOkResponse({ description: 'Profile retrieved', type: AuthenticatedUserDto })
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the authenticated user profile' })
  @ApiOkResponse({ description: 'Profile updated', type: AuthenticatedUserDto })
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, updateProfileDto);
  }

  @Get(':id')
  @Roles(ROLE.ADMIN)
  @ApiOperation({ summary: 'Get a single user' })
  @ApiOkResponse({ description: 'User retrieved' })
  findOne(@Param() params: ResourceIdParamDto) {
    return this.usersService.findOne(params.id);
  }
}
