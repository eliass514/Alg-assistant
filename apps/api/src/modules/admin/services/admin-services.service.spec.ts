import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';

import { ServicesService } from '@modules/services/services.service';
import { AdminServicesService } from './admin-services.service';
import { AdminCreateServiceDto } from '../dto/admin-create-service.dto';
import { AdminUpdateServiceDto } from '../dto/admin-update-service.dto';
import { AdminCreateServiceCategoryDto } from '../dto/admin-create-category.dto';
import { AdminUpdateServiceCategoryDto } from '../dto/admin-update-category.dto';

describe('AdminServicesService', () => {
  let service: AdminServicesService;
  let servicesService: jest.Mocked<ServicesService>;

  const mockServiceViewModel = {
    id: 'service-1',
    slug: 'test-service',
    durationMinutes: 60,
    price: '150.00',
    isActive: true,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    translation: null,
    translations: [],
    category: {
      id: 'category-1',
      slug: 'test-category',
      isActive: true,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      translation: null,
      translations: [],
    },
  };

  const mockCategoryViewModel = {
    id: 'category-1',
    slug: 'test-category',
    isActive: true,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    translation: null,
    translations: [],
  };

  const mockPaginatedServices = {
    data: [mockServiceViewModel],
    meta: {
      page: 1,
      limit: 25,
      total: 1,
    },
    cache: {
      key: 'test-key',
      ttlSeconds: 300,
    },
  };

  const mockPaginatedCategories = {
    data: [mockCategoryViewModel],
    meta: {
      page: 1,
      limit: 25,
      total: 1,
    },
    cache: {
      key: 'test-key',
      ttlSeconds: 300,
    },
  };

  beforeEach(async () => {
    const mockServicesService = {
      listServices: jest.fn(),
      getServiceById: jest.fn(),
      createService: jest.fn(),
      updateService: jest.fn(),
      deleteService: jest.fn(),
      listCategories: jest.fn(),
      getCategoryById: jest.fn(),
      createCategory: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminServicesService,
        {
          provide: ServicesService,
          useValue: mockServicesService,
        },
      ],
    }).compile();

    service = module.get<AdminServicesService>(AdminServicesService);
    servicesService = module.get(ServicesService);

    jest.spyOn(Logger.prototype, 'verbose').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listServices', () => {
    it('should call servicesService.listServices and return paginated results', async () => {
      const query = { page: 1, limit: 25 };
      servicesService.listServices.mockResolvedValue(mockPaginatedServices);

      const result = await service.listServices(query);

      expect(servicesService.listServices).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedServices);
    });

    it('should handle filtering by category and search', async () => {
      const query = {
        page: 1,
        limit: 10,
        categoryId: 'category-1',
        search: 'test',
        isActive: true,
      };
      servicesService.listServices.mockResolvedValue(mockPaginatedServices);

      await service.listServices(query);

      expect(servicesService.listServices).toHaveBeenCalledWith(query);
    });
  });

  describe('getServiceById', () => {
    it('should call servicesService.getServiceById and return service data', async () => {
      const serviceId = 'service-1';
      servicesService.getServiceById.mockResolvedValue({
        data: mockServiceViewModel,
        cache: { key: 'test-key', ttlSeconds: 300 },
      });

      const result = await service.getServiceById(serviceId);

      expect(servicesService.getServiceById).toHaveBeenCalledWith(serviceId, undefined);
      expect(result).toEqual(mockServiceViewModel);
    });

    it('should pass locale to servicesService.getServiceById', async () => {
      const serviceId = 'service-1';
      const locale = 'fr';
      servicesService.getServiceById.mockResolvedValue({
        data: mockServiceViewModel,
        cache: { key: 'test-key', ttlSeconds: 300 },
      });

      await service.getServiceById(serviceId, locale);

      expect(servicesService.getServiceById).toHaveBeenCalledWith(serviceId, locale);
    });
  });

  describe('createService', () => {
    it('should call servicesService.createService with DTO', async () => {
      const dto: AdminCreateServiceDto = {
        slug: 'new-service',
        categoryId: 'category-1',
        durationMinutes: 60,
        price: '150.00',
        translations: [
          {
            locale: 'en',
            name: 'New Service',
          },
        ],
      };
      servicesService.createService.mockResolvedValue(mockServiceViewModel);

      const result = await service.createService(dto);

      expect(servicesService.createService).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockServiceViewModel);
    });
  });

  describe('updateService', () => {
    it('should call servicesService.updateService with id and DTO', async () => {
      const serviceId = 'service-1';
      const dto: AdminUpdateServiceDto = {
        isActive: false,
        price: '200.00',
      };
      servicesService.updateService.mockResolvedValue(mockServiceViewModel);

      const result = await service.updateService(serviceId, dto);

      expect(servicesService.updateService).toHaveBeenCalledWith(serviceId, dto);
      expect(result).toEqual(mockServiceViewModel);
    });
  });

  describe('deleteService', () => {
    it('should call servicesService.deleteService with id', async () => {
      const serviceId = 'service-1';
      servicesService.deleteService.mockResolvedValue(undefined);

      await service.deleteService(serviceId);

      expect(servicesService.deleteService).toHaveBeenCalledWith(serviceId);
    });
  });

  describe('listCategories', () => {
    it('should call servicesService.listCategories and return paginated results', async () => {
      const query = { page: 1, limit: 25 };
      servicesService.listCategories.mockResolvedValue(mockPaginatedCategories);

      const result = await service.listCategories(query);

      expect(servicesService.listCategories).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedCategories);
    });

    it('should handle filtering by isActive and search', async () => {
      const query = {
        page: 1,
        limit: 10,
        search: 'category',
        isActive: false,
      };
      servicesService.listCategories.mockResolvedValue(mockPaginatedCategories);

      await service.listCategories(query);

      expect(servicesService.listCategories).toHaveBeenCalledWith(query);
    });
  });

  describe('getCategoryById', () => {
    it('should call servicesService.getCategoryById and return category data', async () => {
      const categoryId = 'category-1';
      servicesService.getCategoryById.mockResolvedValue({
        data: mockCategoryViewModel,
        cache: { key: 'test-key', ttlSeconds: 300 },
      });

      const result = await service.getCategoryById(categoryId);

      expect(servicesService.getCategoryById).toHaveBeenCalledWith(categoryId, undefined);
      expect(result).toEqual(mockCategoryViewModel);
    });

    it('should pass locale to servicesService.getCategoryById', async () => {
      const categoryId = 'category-1';
      const locale = 'ar';
      servicesService.getCategoryById.mockResolvedValue({
        data: mockCategoryViewModel,
        cache: { key: 'test-key', ttlSeconds: 300 },
      });

      await service.getCategoryById(categoryId, locale);

      expect(servicesService.getCategoryById).toHaveBeenCalledWith(categoryId, locale);
    });
  });

  describe('createCategory', () => {
    it('should call servicesService.createCategory with DTO', async () => {
      const dto: AdminCreateServiceCategoryDto = {
        slug: 'new-category',
        translations: [
          {
            locale: 'en',
            name: 'New Category',
          },
        ],
      };
      servicesService.createCategory.mockResolvedValue(mockCategoryViewModel);

      const result = await service.createCategory(dto);

      expect(servicesService.createCategory).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockCategoryViewModel);
    });
  });

  describe('updateCategory', () => {
    it('should call servicesService.updateCategory with id and DTO', async () => {
      const categoryId = 'category-1';
      const dto: AdminUpdateServiceCategoryDto = {
        isActive: false,
      };
      servicesService.updateCategory.mockResolvedValue(mockCategoryViewModel);

      const result = await service.updateCategory(categoryId, dto);

      expect(servicesService.updateCategory).toHaveBeenCalledWith(categoryId, dto);
      expect(result).toEqual(mockCategoryViewModel);
    });
  });

  describe('deleteCategory', () => {
    it('should call servicesService.deleteCategory with id', async () => {
      const categoryId = 'category-1';
      servicesService.deleteCategory.mockResolvedValue(undefined);

      await service.deleteCategory(categoryId);

      expect(servicesService.deleteCategory).toHaveBeenCalledWith(categoryId);
    });
  });
});
