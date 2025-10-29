import { config } from '../config';

function resolveRawBaseUrl(): string {
  if (typeof window === 'undefined') {
    return config.apiBaseUrl;
  }

  return config.publicApiBaseUrl;
}

function resolveApiBaseUrl(): string | null {
  const rawBaseUrl = resolveRawBaseUrl();

  if (!rawBaseUrl) {
    return null;
  }

  return rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
}

function getApiBaseUrl(): string {
  const baseUrl = resolveApiBaseUrl();

  if (!baseUrl) {
    throw new Error('API base URL is not defined. Set NEXT_PUBLIC_API_BASE_URL or API_BASE_URL.');
  }

  return baseUrl;
}

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(status: number, message: string, details: unknown = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

interface ApiRequestInit extends RequestInit {
  skipAuthRefresh?: boolean;
}

let refreshPromise: Promise<boolean> | null = null;

export async function refreshAccessToken(): Promise<boolean> {
  const apiBaseUrl = resolveApiBaseUrl();

  if (!apiBaseUrl) {
    return false;
  }

  if (!refreshPromise) {
    refreshPromise = fetch(`${apiBaseUrl}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: buildHeaders(),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw await createApiError(response);
        }

        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function apiFetch<TResponse>(
  path: string,
  { skipAuthRefresh = false, ...init }: ApiRequestInit = {},
): Promise<TResponse> {
  const url = buildUrl(path);
  const headers = buildHeaders(init.headers, init.body);

  const response = await fetch(url, {
    ...init,
    credentials: 'include',
    headers,
  });

  if (response.ok) {
    return (await parseResponseBody<TResponse>(response)) as TResponse;
  }

  if (response.status === 401 && !skipAuthRefresh) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      return apiFetch<TResponse>(path, { ...init, skipAuthRefresh: true });
    }
  }

  throw await createApiError(response);
}

function buildUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const apiBaseUrl = getApiBaseUrl();

  if (!path.startsWith('/')) {
    return `${apiBaseUrl}/${path}`;
  }

  return `${apiBaseUrl}${path}`;
}

function buildHeaders(headersInit?: HeadersInit, body?: BodyInit | null): Headers {
  const headers = new Headers(headersInit);

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  const isJsonBody =
    body && typeof body === 'string' && !headers.has('Content-Type') && looksLikeJsonString(body);

  if (isJsonBody) {
    headers.set('Content-Type', 'application/json');
  }

  return headers;
}

function looksLikeJsonString(value: string): boolean {
  const firstChar = value.trimStart()[0];
  return firstChar === '{' || firstChar === '[' || firstChar === '"';
}

async function parseResponseBody<T>(response: Response): Promise<T | undefined> {
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined;
  }

  const contentType = response.headers.get('content-type');

  if (contentType?.includes('application/json')) {
    return (await response.json()) as T;
  }

  const text = await response.text();

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('Failed to parse JSON response', error);
    }

    return undefined;
  }
}

async function createApiError(response: Response): Promise<ApiError> {
  const payload = await parseResponseBody<{
    message?: string;
    error?: string;
    errors?: unknown;
    statusCode?: number;
  }>(response);

  const message =
    payload?.message ?? payload?.error ?? (response.statusText || 'Unexpected API error occurred');

  return new ApiError(response.status, message, payload?.errors ?? payload);
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
