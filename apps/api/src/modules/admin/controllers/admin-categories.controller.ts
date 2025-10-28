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
import { ServiceCategoriesQueryDto } from '@modules/services/dto/categories-query.dto';
import { LocaleQueryDto } from '@modules/services/dto/locale-query.dto';

import { AdminServicesService } from '../services/admin-services.service';
import { AdminCreateServiceCategoryDto } from '../dto/admin-create-category.dto';
import { AdminUpdateServiceCategoryDto } from '../dto/admin-update-category.dto';

@ApiTags('admin-categories')
@ApiBearerAuth()
@Controller({ path: 'admin/categories', version: '1' })
@Roles(ROLE.ADMIN)
export class AdminCategoriesController {
  constructor(private readonly adminServicesService: AdminServicesService) {}

  @Get()
  @ApiOperation({ summary: 'List service categories for admin' })
  @ApiOkResponse({ description: 'Categories retrieved' })
  list(@Query() query: ServiceCategoriesQueryDto) {
    return this.adminServicesService.listCategories(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by id for admin' })
  @ApiOkResponse({ description: 'Category retrieved' })
  getById(@Param() params: ResourceIdParamDto, @Query() query: LocaleQueryDto) {
    return this.adminServicesService.getCategoryById(params.id, query.locale);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a service category' })
  @ApiCreatedResponse({ description: 'Category created' })
  create(@Body() dto: AdminCreateServiceCategoryDto) {
    return this.adminServicesService.createCategory(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a service category' })
  @ApiOkResponse({ description: 'Category updated' })
  update(@Param() params: ResourceIdParamDto, @Body() dto: AdminUpdateServiceCategoryDto) {
    return this.adminServicesService.updateCategory(params.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a service category' })
  @ApiNoContentResponse({ description: 'Category deleted' })
  remove(@Param() params: ResourceIdParamDto) {
    return this.adminServicesService.deleteCategory(params.id);
  }
}
