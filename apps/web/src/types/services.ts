export interface CacheMetadata {
  key: string;
  ttlSeconds: number;
  generatedAt: string;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ServiceCategoryTranslation {
  id: string;
  locale: string;
  name: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceCategory {
  id: string;
  slug: string;
  isActive: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  translation: ServiceCategoryTranslation | null;
  translations: ServiceCategoryTranslation[];
}

export interface ServiceTranslation {
  id: string;
  locale: string;
  name: string;
  summary: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceItem {
  id: string;
  slug: string;
  durationMinutes: number;
  price: string;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  translation: ServiceTranslation | null;
  translations: ServiceTranslation[];
  category: ServiceCategory;
}

export interface ServiceListResponse {
  data: ServiceItem[];
  meta: PaginatedMeta;
  cache: CacheMetadata;
}

export interface ServiceCategoryListResponse {
  data: ServiceCategory[];
  meta: PaginatedMeta;
  cache: CacheMetadata;
}
