import type { CacheMetadata, PaginatedMeta, ServiceCategory, ServiceItem } from './services';
import type { AppointmentDetails, AppointmentStatus, PaginationMeta } from './appointments';

export interface ServiceTranslationInput {
  locale: string;
  name: string;
  summary?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface CategoryTranslationInput {
  locale: string;
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface AdminServiceFormData {
  slug: string;
  categoryId: string;
  durationMinutes: number;
  price: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
  translations: ServiceTranslationInput[];
}

export interface AdminServiceCategoryFormData {
  slug: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
  translations: CategoryTranslationInput[];
}

export interface AdminServiceResponse {
  data: ServiceItem;
  cache: CacheMetadata;
}

export interface AdminServiceListResponse {
  data: ServiceItem[];
  meta: PaginatedMeta;
  cache: CacheMetadata;
}

export interface AdminServiceCategoryResponse {
  data: ServiceCategory;
  cache: CacheMetadata;
}

export interface AdminServiceCategoryListResponse {
  data: ServiceCategory[];
  meta: PaginatedMeta;
  cache: CacheMetadata;
}

export interface AdminAppointmentListResponse {
  data: AppointmentDetails[];
  meta: PaginationMeta;
}

export interface AdminAppointmentResponse {
  data: AppointmentDetails;
}

export interface AdminUpdateAppointmentData {
  status?: AppointmentStatus;
  slotId?: string;
  notes?: string;
}
