import { apiFetch } from '@/lib/api/client';
import { buildQuery } from '@/lib/api/query';
import type {
  AdminServiceCategoryFormData,
  AdminServiceCategoryListResponse,
  AdminServiceCategoryResponse,
  AdminServiceFormData,
  AdminServiceListResponse,
  AdminServiceResponse,
} from '@/types/admin';

export interface AdminServiceListParams {
  locale?: string;
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface AdminCategoryListParams {
  locale?: string;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export async function fetchAdminServices(
  params: AdminServiceListParams = {},
): Promise<AdminServiceListResponse> {
  const query = buildQuery({
    locale: params.locale,
    search: params.search,
    categoryId: params.categoryId,
    isActive: typeof params.isActive === 'boolean' ? String(params.isActive) : undefined,
    page: params.page ? String(params.page) : undefined,
    limit: params.limit ? String(params.limit) : undefined,
  });

  return apiFetch<AdminServiceListResponse>(`/v1/admin/services${query}`);
}

export async function fetchAdminService(
  id: string,
  locale?: string,
): Promise<AdminServiceResponse> {
  const query = buildQuery({ locale });
  return apiFetch<AdminServiceResponse>(`/v1/admin/services/${id}${query}`);
}

export async function createAdminService(
  data: AdminServiceFormData,
): Promise<AdminServiceResponse> {
  return apiFetch<AdminServiceResponse>('/v1/admin/services', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdminService(
  id: string,
  data: Partial<AdminServiceFormData>,
): Promise<AdminServiceResponse> {
  return apiFetch<AdminServiceResponse>(`/v1/admin/services/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteAdminService(id: string): Promise<void> {
  return apiFetch<void>(`/v1/admin/services/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchAdminCategories(
  params: AdminCategoryListParams = {},
): Promise<AdminServiceCategoryListResponse> {
  const query = buildQuery({
    locale: params.locale,
    search: params.search,
    isActive: typeof params.isActive === 'boolean' ? String(params.isActive) : undefined,
    page: params.page ? String(params.page) : undefined,
    limit: params.limit ? String(params.limit) : undefined,
  });

  return apiFetch<AdminServiceCategoryListResponse>(`/v1/admin/categories${query}`);
}

export async function fetchAdminCategory(
  id: string,
  locale?: string,
): Promise<AdminServiceCategoryResponse> {
  const query = buildQuery({ locale });
  return apiFetch<AdminServiceCategoryResponse>(`/v1/admin/categories/${id}${query}`);
}

export async function createAdminCategory(
  data: AdminServiceCategoryFormData,
): Promise<AdminServiceCategoryResponse> {
  return apiFetch<AdminServiceCategoryResponse>('/v1/admin/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdminCategory(
  id: string,
  data: Partial<AdminServiceCategoryFormData>,
): Promise<AdminServiceCategoryResponse> {
  return apiFetch<AdminServiceCategoryResponse>(`/v1/admin/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteAdminCategory(id: string): Promise<void> {
  return apiFetch<void>(`/v1/admin/categories/${id}`, {
    method: 'DELETE',
  });
}
