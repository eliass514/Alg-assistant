import { apiFetch } from '@/lib/api/client';
import { persistCache, readCache } from '@/lib/api/cache';
import { buildQuery, normalizeSearch } from '@/lib/api/query';
import { buildLocaleHeaders } from '@/lib/api/shared';
import type { ServiceCategoryListResponse, ServiceListResponse } from '@/types';

const SERVICES_CACHE_PREFIX = 'services:list';
const SERVICE_CATEGORIES_CACHE_PREFIX = 'services:categories';

function buildServicesCacheKey(params: ServiceListParams): string {
  const normalizedSearch = normalizeSearch(params.search)?.toLowerCase() ?? 'all';
  const category = params.categoryId ?? 'all';
  const activeState =
    params.isActive === undefined ? 'any' : params.isActive ? 'active' : 'inactive';
  const limit = params.limit ?? 'default';
  const page = params.page ?? 1;
  const localePart = params.locale.toLowerCase();

  return [
    SERVICES_CACHE_PREFIX,
    localePart,
    category,
    activeState,
    limit,
    page,
    encodeURIComponent(normalizedSearch),
  ].join(':');
}

function buildCategoriesCacheKey(params: ServiceCategoriesParams): string {
  const normalizedSearch = normalizeSearch(params.search)?.toLowerCase() ?? 'all';
  const activeState =
    params.isActive === undefined ? 'any' : params.isActive ? 'active' : 'inactive';
  const limit = params.limit ?? 'default';
  const page = params.page ?? 1;
  const localePart = (params.locale ?? 'default').toLowerCase();

  return [
    SERVICE_CATEGORIES_CACHE_PREFIX,
    localePart,
    activeState,
    limit,
    page,
    encodeURIComponent(normalizedSearch),
  ].join(':');
}

export interface ServiceListParams {
  locale: string;
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface ServiceCategoriesParams {
  locale?: string;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export async function fetchServices(params: ServiceListParams): Promise<ServiceListResponse> {
  const normalizedLocale = params.locale.toLowerCase();
  const normalizedSearch = normalizeSearch(params.search);
  const cacheKey = buildServicesCacheKey({ ...params, search: normalizedSearch });
  const query = buildQuery({
    locale: normalizedLocale,
    search: normalizedSearch,
    categoryId: params.categoryId,
    isActive: typeof params.isActive === 'boolean' ? String(params.isActive) : undefined,
    page: params.page ? String(params.page) : undefined,
    limit: params.limit ? String(params.limit) : undefined,
  });

  try {
    const result = await apiFetch<ServiceListResponse>(`/services${query}`, {
      headers: buildLocaleHeaders(params.locale),
    });
    persistCache(cacheKey, result);
    return result;
  } catch (error) {
    const cached = readCache<ServiceListResponse>(cacheKey);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

export async function fetchServiceCategories(
  params: ServiceCategoriesParams = {},
): Promise<ServiceCategoryListResponse> {
  const normalizedLocale = params.locale?.toLowerCase();
  const normalizedSearch = normalizeSearch(params.search);
  const cacheKey = buildCategoriesCacheKey({ ...params, search: normalizedSearch });
  const query = buildQuery({
    locale: normalizedLocale,
    search: normalizedSearch,
    isActive: typeof params.isActive === 'boolean' ? String(params.isActive) : undefined,
    page: params.page ? String(params.page) : undefined,
    limit: params.limit ? String(params.limit) : undefined,
  });

  try {
    const result = await apiFetch<ServiceCategoryListResponse>(`/services/categories${query}`, {
      headers: buildLocaleHeaders(params.locale),
    });
    persistCache(cacheKey, result);
    return result;
  } catch (error) {
    const cached = readCache<ServiceCategoryListResponse>(cacheKey);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

export type { ServiceCategory, ServiceItem } from '@/types';
