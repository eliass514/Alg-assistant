import { Injectable, Logger } from '@nestjs/common';

import { ServicesService } from '@modules/services/services.service';
import { ServiceCategoriesQueryDto } from '@modules/services/dto/categories-query.dto';
import { ServicesQueryDto } from '@modules/services/dto/services-query.dto';
import {
  PaginatedResponse,
  ServiceCategoryViewModel,
  ServiceViewModel,
} from '@modules/services/interfaces/service-catalog.interface';

import { AdminCreateServiceDto } from '../dto/admin-create-service.dto';
import { AdminUpdateServiceDto } from '../dto/admin-update-service.dto';
import { AdminCreateServiceCategoryDto } from '../dto/admin-create-category.dto';
import { AdminUpdateServiceCategoryDto } from '../dto/admin-update-category.dto';

@Injectable()
export class AdminServicesService {
  private readonly logger = new Logger(AdminServicesService.name);

  constructor(private readonly servicesService: ServicesService) {}

  async listServices(query: ServicesQueryDto): Promise<PaginatedResponse<ServiceViewModel>> {
    this.logger.verbose('Admin listing services');
    return this.servicesService.listServices(query);
  }

  async getServiceById(id: string, locale?: string): Promise<ServiceViewModel> {
    this.logger.verbose(`Admin retrieving service ${id}`);
    const result = await this.servicesService.getServiceById(id, locale);
    return result.data;
  }

  async createService(dto: AdminCreateServiceDto): Promise<ServiceViewModel> {
    this.logger.verbose('Admin creating service');
    return this.servicesService.createService(dto);
  }

  async updateService(id: string, dto: AdminUpdateServiceDto): Promise<ServiceViewModel> {
    this.logger.verbose(`Admin updating service ${id}`);
    return this.servicesService.updateService(id, dto);
  }

  async deleteService(id: string): Promise<void> {
    this.logger.verbose(`Admin deleting service ${id}`);
    await this.servicesService.deleteService(id);
  }

  async listCategories(
    query: ServiceCategoriesQueryDto,
  ): Promise<PaginatedResponse<ServiceCategoryViewModel>> {
    this.logger.verbose('Admin listing service categories');
    return this.servicesService.listCategories(query);
  }

  async getCategoryById(id: string, locale?: string): Promise<ServiceCategoryViewModel> {
    this.logger.verbose(`Admin retrieving category ${id}`);
    const result = await this.servicesService.getCategoryById(id, locale);
    return result.data;
  }

  async createCategory(dto: AdminCreateServiceCategoryDto): Promise<ServiceCategoryViewModel> {
    this.logger.verbose('Admin creating service category');
    return this.servicesService.createCategory(dto);
  }

  async updateCategory(
    id: string,
    dto: AdminUpdateServiceCategoryDto,
  ): Promise<ServiceCategoryViewModel> {
    this.logger.verbose(`Admin updating category ${id}`);
    return this.servicesService.updateCategory(id, dto);
  }

  async deleteCategory(id: string): Promise<void> {
    this.logger.verbose(`Admin deleting category ${id}`);
    await this.servicesService.deleteCategory(id);
  }
}
