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
import { Public } from '@common/decorators/public.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { ResourceIdParamDto } from '@acme/shared-dto';

import { CreateServiceCategoryDto } from '@modules/services/dto/create-service-category.dto';
import { CreateServiceDto } from '@modules/services/dto/create-service.dto';
import { LocaleQueryDto } from '@modules/services/dto/locale-query.dto';
import { ServiceCategoriesQueryDto } from '@modules/services/dto/categories-query.dto';
import {
  ServiceCategoryDetailResponseDto,
  ServiceCategoryListResponseDto,
  ServiceCategoryResponseDto,
  ServiceDetailResponseDto,
  ServiceListResponseDto,
  ServiceResponseDto,
  ServiceTranslationResponseDto,
  ServiceCategoryTranslationResponseDto,
} from '@modules/services/dto/service-responses.dto';
import { ServicesQueryDto } from '@modules/services/dto/services-query.dto';
import { UpdateServiceCategoryDto } from '@modules/services/dto/update-service-category.dto';
import { UpdateServiceDto } from '@modules/services/dto/update-service.dto';
import {
  CachedResource,
  PaginatedResponse,
  ServiceCategoryTranslationViewModel,
  ServiceCategoryViewModel,
  ServiceTranslationViewModel,
  ServiceViewModel,
} from '@modules/services/interfaces/service-catalog.interface';
import { ServicesService } from '@modules/services/services.service';

@ApiTags('services')
@Controller({ path: 'services', version: '1' })
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List available services' })
  @ApiOkResponse({ description: 'Services retrieved', type: ServiceListResponseDto })
  async list(@Query() query: ServicesQueryDto): Promise<ServiceListResponseDto> {
    const result = await this.servicesService.listServices(query);
    return this.mapPaginatedServiceResponse(result);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a service by id' })
  @ApiOkResponse({ description: 'Service retrieved', type: ServiceDetailResponseDto })
  async getById(
    @Param() params: ResourceIdParamDto,
    @Query() query: LocaleQueryDto,
  ): Promise<ServiceDetailResponseDto> {
    const result = await this.servicesService.getServiceById(params.id, query.locale);
    return this.mapCachedServiceResponse(result);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(ROLE.ADMIN)
  @ApiOperation({ summary: 'Create a service' })
  @ApiCreatedResponse({ description: 'Service created', type: ServiceResponseDto })
  async create(@Body() dto: CreateServiceDto): Promise<ServiceResponseDto> {
    const service = await this.servicesService.createService(dto);
    return this.mapServiceResponse(service);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(ROLE.ADMIN)
  @ApiOperation({ summary: 'Update a service' })
  @ApiOkResponse({ description: 'Service updated', type: ServiceResponseDto })
  async update(
    @Param() params: ResourceIdParamDto,
    @Body() dto: UpdateServiceDto,
  ): Promise<ServiceResponseDto> {
    const service = await this.servicesService.updateService(params.id, dto);
    return this.mapServiceResponse(service);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(ROLE.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a service' })
  @ApiNoContentResponse({ description: 'Service deleted' })
  async delete(@Param() params: ResourceIdParamDto): Promise<void> {
    await this.servicesService.deleteService(params.id);
  }

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'List service categories' })
  @ApiOkResponse({ description: 'Categories retrieved', type: ServiceCategoryListResponseDto })
  async listCategories(
    @Query() query: ServiceCategoriesQueryDto,
  ): Promise<ServiceCategoryListResponseDto> {
    const result = await this.servicesService.listCategories(query);
    return this.mapPaginatedCategoryResponse(result);
  }

  @Get('categories/:id')
  @Public()
  @ApiOperation({ summary: 'Get a service category by id' })
  @ApiOkResponse({ description: 'Category retrieved', type: ServiceCategoryDetailResponseDto })
  async getCategoryById(
    @Param() params: ResourceIdParamDto,
    @Query() query: LocaleQueryDto,
  ): Promise<ServiceCategoryDetailResponseDto> {
    const result = await this.servicesService.getCategoryById(params.id, query.locale);
    return this.mapCachedCategoryResponse(result);
  }

  @Post('categories')
  @ApiBearerAuth()
  @Roles(ROLE.ADMIN)
  @ApiOperation({ summary: 'Create a service category' })
  @ApiCreatedResponse({ description: 'Category created', type: ServiceCategoryResponseDto })
  async createCategory(@Body() dto: CreateServiceCategoryDto): Promise<ServiceCategoryResponseDto> {
    const category = await this.servicesService.createCategory(dto);
    return this.mapCategoryResponse(category);
  }

  @Patch('categories/:id')
  @ApiBearerAuth()
  @Roles(ROLE.ADMIN)
  @ApiOperation({ summary: 'Update a service category' })
  @ApiOkResponse({ description: 'Category updated', type: ServiceCategoryResponseDto })
  async updateCategory(
    @Param() params: ResourceIdParamDto,
    @Body() dto: UpdateServiceCategoryDto,
  ): Promise<ServiceCategoryResponseDto> {
    const category = await this.servicesService.updateCategory(params.id, dto);
    return this.mapCategoryResponse(category);
  }

  @Delete('categories/:id')
  @ApiBearerAuth()
  @Roles(ROLE.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a service category' })
  @ApiNoContentResponse({ description: 'Category deleted' })
  async deleteCategory(@Param() params: ResourceIdParamDto): Promise<void> {
    await this.servicesService.deleteCategory(params.id);
  }

  private mapPaginatedServiceResponse(
    result: PaginatedResponse<ServiceViewModel>,
  ): ServiceListResponseDto {
    return {
      data: result.data.map((service) => this.mapServiceResponse(service)),
      meta: {
        page: result.meta.page,
        limit: result.meta.limit,
        total: result.meta.total,
      },
      cache: { ...result.cache },
    };
  }

  private mapCachedServiceResponse(
    result: CachedResource<ServiceViewModel>,
  ): ServiceDetailResponseDto {
    return {
      data: this.mapServiceResponse(result.data),
      cache: { ...result.cache },
    };
  }

  private mapPaginatedCategoryResponse(
    result: PaginatedResponse<ServiceCategoryViewModel>,
  ): ServiceCategoryListResponseDto {
    return {
      data: result.data.map((category) => this.mapCategoryResponse(category)),
      meta: {
        page: result.meta.page,
        limit: result.meta.limit,
        total: result.meta.total,
      },
      cache: { ...result.cache },
    };
  }

  private mapCachedCategoryResponse(
    result: CachedResource<ServiceCategoryViewModel>,
  ): ServiceCategoryDetailResponseDto {
    return {
      data: this.mapCategoryResponse(result.data),
      cache: { ...result.cache },
    };
  }

  private mapServiceResponse(service: ServiceViewModel): ServiceResponseDto {
    return {
      id: service.id,
      slug: service.slug,
      durationMinutes: service.durationMinutes,
      price: service.price,
      isActive: service.isActive,
      metadata: service.metadata ?? null,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
      translation: service.translation ? this.mapServiceTranslation(service.translation) : null,
      translations: service.translations.map((translation) =>
        this.mapServiceTranslation(translation),
      ),
      category: this.mapCategoryResponse(service.category),
    };
  }

  private mapCategoryResponse(category: ServiceCategoryViewModel): ServiceCategoryResponseDto {
    return {
      id: category.id,
      slug: category.slug,
      isActive: category.isActive,
      metadata: category.metadata ?? undefined,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
      translation: category.translation ? this.mapCategoryTranslation(category.translation) : null,
      translations: category.translations.map((translation) =>
        this.mapCategoryTranslation(translation),
      ),
    };
  }

  private mapServiceTranslation(
    translation: ServiceTranslationViewModel,
  ): ServiceTranslationResponseDto {
    return {
      id: translation.id,
      locale: translation.locale,
      name: translation.name,
      summary: translation.summary ?? null,
      description: translation.description ?? null,
      metadata: translation.metadata ?? null,
      createdAt: translation.createdAt.toISOString(),
      updatedAt: translation.updatedAt.toISOString(),
    };
  }

  private mapCategoryTranslation(
    translation: ServiceCategoryTranslationViewModel,
  ): ServiceCategoryTranslationResponseDto {
    return {
      id: translation.id,
      locale: translation.locale,
      name: translation.name,
      description: translation.description ?? null,
      metadata: translation.metadata ?? null,
      createdAt: translation.createdAt.toISOString(),
      updatedAt: translation.updatedAt.toISOString(),
    };
  }
}
