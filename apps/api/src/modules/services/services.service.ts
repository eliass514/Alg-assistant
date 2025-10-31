import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, ServiceCategoryTranslation, ServiceTranslation } from '@prisma/client';

import { CreateServiceCategoryDto } from '@modules/services/dto/create-service-category.dto';
import { CreateServiceDto } from '@modules/services/dto/create-service.dto';
import { ServiceCategoriesQueryDto } from '@modules/services/dto/categories-query.dto';
import { ServicesQueryDto } from '@modules/services/dto/services-query.dto';
import { UpdateServiceCategoryDto } from '@modules/services/dto/update-service-category.dto';
import { UpdateServiceDto } from '@modules/services/dto/update-service.dto';
import {
  CacheMetadata,
  CachedResource,
  PaginatedResponse,
  ServiceCategoryTranslationViewModel,
  ServiceCategoryViewModel,
  ServiceTranslationViewModel,
  ServiceViewModel,
} from '@modules/services/interfaces/service-catalog.interface';
import { ServicesCacheService } from '@modules/services/services-cache.service';
import { PrismaService } from '@prisma/prisma.service';

const serviceInclude = {
  translations: true,
  category: {
    include: {
      translations: true,
    },
  },
} satisfies Prisma.ServiceInclude;

const categoryInclude = {
  translations: true,
} satisfies Prisma.ServiceCategoryInclude;

type ServiceWithRelations = Prisma.ServiceGetPayload<{ include: typeof serviceInclude }>;
type CategoryWithTranslations = Prisma.ServiceCategoryGetPayload<{
  include: typeof categoryInclude;
}>;
type ServiceTranslationModel = ServiceTranslation;
type CategoryTranslationModel = ServiceCategoryTranslation;

type WhereInput = Prisma.ServiceWhereInput;
type CategoryWhereInput = Prisma.ServiceCategoryWhereInput;

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  private readonly serviceListNamespace = 'services:list';
  private readonly serviceDetailNamespace = 'services:detail';
  private readonly categoryListNamespace = 'services:categories:list';
  private readonly categoryDetailNamespace = 'services:categories:detail';

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: ServicesCacheService,
  ) {}

  async listServices(query: ServicesQueryDto): Promise<PaginatedResponse<ServiceViewModel>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();
    const locale = query.locale?.toLowerCase();

    const cacheKey = this.cache.generateKey(this.serviceListNamespace, {
      page,
      limit,
      search,
      categoryId: query.categoryId,
      isActive: query.isActive,
      locale,
    });

    const cached = this.cache.get<PaginatedResponse<ServiceViewModel>>(cacheKey);
    if (cached) {
      this.logger.verbose(`Returning services list from cache key=${cacheKey}`);
      return cached;
    }

    const filters: WhereInput[] = [];
    if (query.categoryId) {
      filters.push({ categoryId: query.categoryId });
    }
    if (typeof query.isActive === 'boolean') {
      filters.push({ isActive: query.isActive });
    }
    if (search) {
      filters.push({
        OR: [
          { slug: { contains: search, mode: 'insensitive' } },
          {
            translations: {
              some: {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { summary: { contains: search, mode: 'insensitive' } },
                  { description: { contains: search, mode: 'insensitive' } },
                ],
              },
            },
          },
          {
            category: {
              translations: {
                some: {
                  OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                  ],
                },
              },
            },
          },
        ],
      });
    }

    const where: WhereInput | undefined = filters.length ? { AND: filters } : undefined;

    this.logger.verbose(
      `Listing services page=${page} limit=${limit}${search ? ` search=${search}` : ''}${query.categoryId ? ` category=${query.categoryId}` : ''}`,
    );

    const [services, total] = await this.prisma.$transaction([
      this.prisma.service.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: serviceInclude,
      }),
      this.prisma.service.count({ where }),
    ]);

    const data = services.map((service) => this.mapService(service, locale));

    const payload: PaginatedResponse<ServiceViewModel> = {
      data,
      meta: {
        page,
        limit,
        total,
      },
      cache: this.createCacheMetadata(cacheKey),
    };

    this.cache.set(cacheKey, payload);
    return payload;
  }

  async getServiceById(id: string, locale?: string): Promise<CachedResource<ServiceViewModel>> {
    const normalizedLocale = locale?.toLowerCase();
    const cacheKey = this.cache.generateKey(this.serviceDetailNamespace, {
      id,
      locale: normalizedLocale,
    });

    const cached = this.cache.get<CachedResource<ServiceViewModel>>(cacheKey);
    if (cached) {
      this.logger.verbose(`Returning cached service id=${id} key=${cacheKey}`);
      return cached;
    }

    const service = await this.prisma.service.findUnique({
      where: { id },
      include: serviceInclude,
    });

    if (!service) {
      throw new NotFoundException(`Service ${id} not found`);
    }

    const viewModel = this.mapService(service, normalizedLocale);
    const payload: CachedResource<ServiceViewModel> = {
      data: viewModel,
      cache: this.createCacheMetadata(cacheKey),
    };

    this.cache.set(cacheKey, payload);
    return payload;
  }

  async createService(dto: CreateServiceDto): Promise<ServiceViewModel> {
    this.logger.verbose(`Creating service slug=${dto.slug}`);

    try {
      const service = await this.prisma.service.create({
        data: {
          slug: dto.slug,
          durationMinutes: dto.durationMinutes,
          price: new Prisma.Decimal(dto.price),
          isActive: dto.isActive ?? true,
          metadata: this.toJsonValue(dto.metadata),
          category: {
            connect: {
              id: dto.categoryId,
            },
          },
          translations: {
            create: dto.translations.map((translation) => ({
              locale: translation.locale,
              name: translation.name,
              summary: translation.summary,
              description: translation.description,
              metadata: this.toJsonValue(translation.metadata),
            })),
          },
        },
        include: serviceInclude,
      });

      this.invalidateServicesCache();
      return this.mapService(service);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Service category ${dto.categoryId} not found`);
      }
      this.handleKnownErrors(error, `A service with slug "${dto.slug}" already exists.`);
      throw error;
    }
  }

  async updateService(id: string, dto: UpdateServiceDto): Promise<ServiceViewModel> {
    this.logger.verbose(`Updating service id=${id}`);

    const data: Prisma.ServiceUpdateInput = {};

    if (dto.slug !== undefined) {
      data.slug = dto.slug;
    }
    if (dto.durationMinutes !== undefined) {
      data.durationMinutes = dto.durationMinutes;
    }
    if (dto.price !== undefined) {
      data.price = new Prisma.Decimal(dto.price);
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }
    if (dto.metadata !== undefined) {
      data.metadata = this.toJsonValue(dto.metadata);
    }
    if (dto.categoryId !== undefined) {
      data.category = {
        connect: {
          id: dto.categoryId,
        },
      };
    }
    if (dto.translations) {
      data.translations = {
        deleteMany: {},
        create: dto.translations.map((translation) => ({
          locale: translation.locale,
          name: translation.name,
          summary: translation.summary,
          description: translation.description,
          metadata: this.toJsonValue(translation.metadata),
        })),
      };
    }

    try {
      const service = await this.prisma.service.update({
        where: { id },
        data,
        include: serviceInclude,
      });

      this.invalidateServicesCache();
      return this.mapService(service);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Service ${id} not found`);
      }
      this.handleKnownErrors(error, 'Unable to update service due to a conflicting unique field.');
      throw error;
    }
  }

  async deleteService(id: string): Promise<void> {
    this.logger.verbose(`Deleting service id=${id}`);

    try {
      await this.prisma.service.delete({ where: { id } });
      this.invalidateServicesCache();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Service ${id} not found`);
      }
      throw error;
    }
  }

  async listCategories(
    query: ServiceCategoriesQueryDto,
  ): Promise<PaginatedResponse<ServiceCategoryViewModel>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();
    const locale = query.locale?.toLowerCase();

    const cacheKey = this.cache.generateKey(this.categoryListNamespace, {
      page,
      limit,
      search,
      isActive: query.isActive,
      locale,
    });

    const cached = this.cache.get<PaginatedResponse<ServiceCategoryViewModel>>(cacheKey);
    if (cached) {
      this.logger.verbose(`Returning service categories list from cache key=${cacheKey}`);
      return cached;
    }

    const filters: CategoryWhereInput[] = [];
    if (typeof query.isActive === 'boolean') {
      filters.push({ isActive: query.isActive });
    }
    if (search) {
      filters.push({
        OR: [
          { slug: { contains: search, mode: 'insensitive' } },
          {
            translations: {
              some: {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { description: { contains: search, mode: 'insensitive' } },
                ],
              },
            },
          },
        ],
      });
    }

    const where: CategoryWhereInput | undefined = filters.length ? { AND: filters } : undefined;

    const [categories, total] = await this.prisma.$transaction([
      this.prisma.serviceCategory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: categoryInclude,
      }),
      this.prisma.serviceCategory.count({ where }),
    ]);

    const data = categories.map((category) => this.mapCategory(category, locale));

    const payload: PaginatedResponse<ServiceCategoryViewModel> = {
      data,
      meta: {
        page,
        limit,
        total,
      },
      cache: this.createCacheMetadata(cacheKey),
    };

    this.cache.set(cacheKey, payload);
    return payload;
  }

  async getCategoryById(
    id: string,
    locale?: string,
  ): Promise<CachedResource<ServiceCategoryViewModel>> {
    const normalizedLocale = locale?.toLowerCase();
    const cacheKey = this.cache.generateKey(this.categoryDetailNamespace, {
      id,
      locale: normalizedLocale,
    });

    const cached = this.cache.get<CachedResource<ServiceCategoryViewModel>>(cacheKey);
    if (cached) {
      this.logger.verbose(`Returning cached service category id=${id} key=${cacheKey}`);
      return cached;
    }

    const category = await this.prisma.serviceCategory.findUnique({
      where: { id },
      include: categoryInclude,
    });

    if (!category) {
      throw new NotFoundException(`Service category ${id} not found`);
    }

    const viewModel = this.mapCategory(category, normalizedLocale);
    const payload: CachedResource<ServiceCategoryViewModel> = {
      data: viewModel,
      cache: this.createCacheMetadata(cacheKey),
    };

    this.cache.set(cacheKey, payload);
    return payload;
  }

  async createCategory(dto: CreateServiceCategoryDto): Promise<ServiceCategoryViewModel> {
    this.logger.verbose(`Creating service category slug=${dto.slug}`);

    try {
      const category = await this.prisma.serviceCategory.create({
        data: {
          slug: dto.slug,
          isActive: dto.isActive ?? true,
          metadata: this.toJsonValue(dto.metadata),
          translations: {
            create: dto.translations.map((translation) => ({
              locale: translation.locale,
              name: translation.name,
              description: translation.description,
              metadata: this.toJsonValue(translation.metadata),
            })),
          },
        },
        include: categoryInclude,
      });

      this.invalidateCategoriesCache();
      this.invalidateServicesCache();
      return this.mapCategory(category);
    } catch (error) {
      this.handleKnownErrors(error, `A service category with slug "${dto.slug}" already exists.`);
      throw error;
    }
  }

  async updateCategory(
    id: string,
    dto: UpdateServiceCategoryDto,
  ): Promise<ServiceCategoryViewModel> {
    this.logger.verbose(`Updating service category id=${id}`);

    const data: Prisma.ServiceCategoryUpdateInput = {};

    if (dto.slug !== undefined) {
      data.slug = dto.slug;
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }
    if (dto.metadata !== undefined) {
      data.metadata = this.toJsonValue(dto.metadata);
    }
    if (dto.translations) {
      data.translations = {
        deleteMany: {},
        create: dto.translations.map((translation) => ({
          locale: translation.locale,
          name: translation.name,
          description: translation.description,
          metadata: this.toJsonValue(translation.metadata),
        })),
      };
    }

    try {
      const category = await this.prisma.serviceCategory.update({
        where: { id },
        data,
        include: categoryInclude,
      });

      this.invalidateCategoriesCache();
      this.invalidateServicesCache();
      return this.mapCategory(category);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Service category ${id} not found`);
      }
      this.handleKnownErrors(
        error,
        'Unable to update service category due to a conflicting unique field.',
      );
      throw error;
    }
  }

  async deleteCategory(id: string): Promise<void> {
    this.logger.verbose(`Deleting service category id=${id}`);

    try {
      await this.prisma.serviceCategory.delete({ where: { id } });
      this.invalidateCategoriesCache();
      this.invalidateServicesCache();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Service category ${id} not found`);
      }
      throw error;
    }
  }

  private mapService(service: ServiceWithRelations, locale?: string | null): ServiceViewModel {
    const translations = service.translations.map((translation) =>
      this.mapServiceTranslation(translation),
    );
    const translation = this.resolveTranslation(translations, locale);
    const category = this.mapCategory(service.category, locale);

    return {
      id: service.id,
      slug: service.slug,
      durationMinutes: service.durationMinutes,
      price: service.price.toFixed(2),
      isActive: service.isActive,
      metadata: this.normalizeMetadata(service.metadata),
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
      translations,
      translation,
      category,
    };
  }

  private mapCategory(
    category: CategoryWithTranslations,
    locale?: string | null,
  ): ServiceCategoryViewModel {
    const translations = category.translations.map((translation) =>
      this.mapCategoryTranslation(translation),
    );
    const translation = this.resolveTranslation(translations, locale);

    return {
      id: category.id,
      slug: category.slug,
      isActive: category.isActive,
      metadata: this.normalizeMetadata(category.metadata),
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      translations,
      translation,
    };
  }

  private mapServiceTranslation(translation: ServiceTranslationModel): ServiceTranslationViewModel {
    return {
      id: translation.id,
      locale: translation.locale,
      name: translation.name,
      summary: translation.summary,
      description: translation.description,
      metadata: this.normalizeMetadata(translation.metadata),
      createdAt: translation.createdAt,
      updatedAt: translation.updatedAt,
    };
  }

  private mapCategoryTranslation(
    translation: CategoryTranslationModel,
  ): ServiceCategoryTranslationViewModel {
    return {
      id: translation.id,
      locale: translation.locale,
      name: translation.name,
      description: translation.description,
      metadata: this.normalizeMetadata(translation.metadata),
      createdAt: translation.createdAt,
      updatedAt: translation.updatedAt,
    };
  }

  private resolveTranslation<T extends { locale: string }>(
    translations: T[],
    locale?: string | null,
  ): T | null {
    if (translations.length === 0) {
      return null;
    }

    if (locale) {
      const exactMatch = translations.find((translation) => translation.locale === locale);
      if (exactMatch) {
        return exactMatch;
      }

      const baseLocale = locale.split('-')[0];
      const baseMatch = translations.find((translation) => translation.locale === baseLocale);
      if (baseMatch) {
        return baseMatch;
      }
    }

    const english = translations.find((translation) => translation.locale === 'en');
    if (english) {
      return english;
    }

    return translations[0];
  }

  private normalizeMetadata(
    value: Prisma.JsonValue | null | undefined,
  ): Record<string, unknown> | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (value === null) {
      return null;
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return null;
  }

  private toJsonValue(value?: Record<string, unknown>): Prisma.InputJsonValue | undefined {
    if (value === undefined) {
      return undefined;
    }

    return value as Prisma.InputJsonValue;
  }

  private createCacheMetadata(key: string): CacheMetadata {
    return {
      key,
      ttlSeconds: this.cache.ttlSeconds,
      generatedAt: new Date().toISOString(),
    };
  }

  private invalidateServicesCache(): void {
    this.cache.invalidateByNamespace(this.serviceListNamespace);
    this.cache.invalidateByNamespace(this.serviceDetailNamespace);
  }

  private invalidateCategoriesCache(): void {
    this.cache.invalidateByNamespace(this.categoryListNamespace);
    this.cache.invalidateByNamespace(this.categoryDetailNamespace);
  }

  private handleKnownErrors(error: unknown, conflictMessage: string): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(conflictMessage);
    }
  }
}
