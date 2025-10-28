import { apiFetch } from '@/lib/api/client';
import { buildLocaleHeaders } from '@/lib/api/shared';
import type { ServiceCategoryListResponse, ServiceListResponse } from '@/types';

const SERVICES_CACHE_PREFIX = 'services:list';
const SERVICE_CATEGORIES_CACHE_PREFIX = 'services:categories';

interface PersistedCacheEntry<T> {
  data: T;
  savedAt: number;
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    return null;
  }
}

function persistCache<T>(key: string, data: T): void {
  const storage = getStorage();
  if (!storage) return;

  const entry: PersistedCacheEntry<T> = {
    data,
    savedAt: Date.now(),
  };

  try {
    storage.setItem(key, JSON.stringify(entry));
  } catch {
    return;
  }
}

function readCache<T>(key: string): T | null {
  const storage = getStorage();
  if (!storage) return null;

  const raw = storage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PersistedCacheEntry<T>;
    return parsed.data;
  } catch (error) {
    storage.removeItem(key);
    return null;
  }
}

function normalizeSearch(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

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

function buildQuery(params: Record<string, string | undefined>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return query.length > 0 ? `?${query}` : '';
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
