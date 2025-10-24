export interface ServiceCategoryTranslationViewModel {
  id: string;
  locale: string;
  name: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceCategoryViewModel {
  id: string;
  slug: string;
  isActive: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  translation: ServiceCategoryTranslationViewModel | null;
  translations: ServiceCategoryTranslationViewModel[];
}

export interface ServiceTranslationViewModel {
  id: string;
  locale: string;
  name: string;
  summary?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceViewModel {
  id: string;
  slug: string;
  durationMinutes: number;
  price: string;
  isActive: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  translation: ServiceTranslationViewModel | null;
  translations: ServiceTranslationViewModel[];
  category: ServiceCategoryViewModel;
}

export interface CacheMetadata {
  key: string;
  ttlSeconds: number;
  generatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
  cache: CacheMetadata;
}

export interface CachedResource<T> {
  data: T;
  cache: CacheMetadata;
}
