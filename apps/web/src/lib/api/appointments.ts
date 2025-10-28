import { apiFetch } from '@/lib/api/client';
import { persistCache, readCache } from '@/lib/api/cache';
import { buildQuery } from '@/lib/api/query';
import { buildLocaleHeaders } from '@/lib/api/shared';
import type {
  AppointmentAvailabilityParams,
  AppointmentAvailabilityResponse,
  AppointmentDetailResponse,
  AppointmentListParams,
  AppointmentListResponse,
  BookAppointmentPayload,
  CancelAppointmentPayload,
  CreateQueueTicketPayload,
  QueueTicketDetailResponse,
  RescheduleAppointmentPayload,
  UpdateQueueTicketStatusPayload,
} from '@/types/appointments';

const AVAILABILITY_CACHE_PREFIX = 'appointments:availability';
const APPOINTMENTS_CACHE_PREFIX = 'appointments:list';

function buildAvailabilityCacheKey(params: AppointmentAvailabilityParams, locale?: string): string {
  const from = params.from ?? 'default';
  const to = params.to ?? 'default';
  const timezone = params.timezone ?? 'default';
  const localeKey = (locale ?? 'default').toLowerCase();

  return [
    AVAILABILITY_CACHE_PREFIX,
    params.serviceId,
    localeKey,
    encodeURIComponent(from),
    encodeURIComponent(to),
    encodeURIComponent(timezone),
  ].join(':');
}

function buildAppointmentsCacheKey(params: AppointmentListParams = {}): string {
  const locale = (params.locale ?? 'default').toLowerCase();
  const page = params.page ?? 1;
  const limit = params.limit ?? 'default';

  return [APPOINTMENTS_CACHE_PREFIX, locale, page, limit].join(':');
}

export async function fetchAppointmentAvailability(
  params: AppointmentAvailabilityParams,
  locale?: string,
): Promise<AppointmentAvailabilityResponse> {
  const cacheKey = buildAvailabilityCacheKey(params, locale);
  const query = buildQuery({
    serviceId: params.serviceId,
    from: params.from,
    to: params.to,
    timezone: params.timezone,
  });

  try {
    const result = await apiFetch<AppointmentAvailabilityResponse>(
      `/appointments/availability${query}`,
      {
        headers: buildLocaleHeaders(locale),
      },
    );
    persistCache(cacheKey, result);
    return result;
  } catch (error) {
    const cached = readCache<AppointmentAvailabilityResponse>(cacheKey);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

export async function fetchAppointments(
  params: AppointmentListParams = {},
): Promise<AppointmentListResponse> {
  const cacheKey = buildAppointmentsCacheKey(params);
  const query = buildQuery({
    page: params.page ? String(params.page) : undefined,
    limit: params.limit ? String(params.limit) : undefined,
  });

  try {
    const result = await apiFetch<AppointmentListResponse>(`/appointments${query}`, {
      headers: buildLocaleHeaders(params.locale),
    });
    persistCache(cacheKey, result);
    return result;
  } catch (error) {
    const cached = readCache<AppointmentListResponse>(cacheKey);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

export async function bookAppointment(
  payload: BookAppointmentPayload,
  locale?: string,
): Promise<AppointmentDetailResponse> {
  return apiFetch<AppointmentDetailResponse>('/appointments', {
    method: 'POST',
    headers: buildLocaleHeaders(locale),
    body: JSON.stringify(payload),
  });
}

export async function rescheduleAppointment(
  appointmentId: string,
  payload: RescheduleAppointmentPayload,
  locale?: string,
): Promise<AppointmentDetailResponse> {
  return apiFetch<AppointmentDetailResponse>(`/appointments/${appointmentId}/reschedule`, {
    method: 'PATCH',
    headers: buildLocaleHeaders(locale),
    body: JSON.stringify(payload),
  });
}

export async function cancelAppointment(
  appointmentId: string,
  payload: CancelAppointmentPayload,
  locale?: string,
): Promise<AppointmentDetailResponse> {
  return apiFetch<AppointmentDetailResponse>(`/appointments/${appointmentId}/cancel`, {
    method: 'PATCH',
    headers: buildLocaleHeaders(locale),
    body: JSON.stringify(payload),
  });
}

export async function createQueueTicket(
  payload: CreateQueueTicketPayload,
  locale?: string,
): Promise<QueueTicketDetailResponse> {
  return apiFetch<QueueTicketDetailResponse>('/appointments/queue', {
    method: 'POST',
    headers: buildLocaleHeaders(locale),
    body: JSON.stringify(payload),
  });
}

export async function updateQueueTicketStatus(
  ticketId: string,
  payload: UpdateQueueTicketStatusPayload,
  locale?: string,
): Promise<QueueTicketDetailResponse> {
  return apiFetch<QueueTicketDetailResponse>(`/appointments/queue/${ticketId}/status`, {
    method: 'PATCH',
    headers: buildLocaleHeaders(locale),
    body: JSON.stringify(payload),
  });
}
