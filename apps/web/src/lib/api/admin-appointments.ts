import { apiFetch } from '@/lib/api/client';
import { buildQuery } from '@/lib/api/query';
import type {
  AdminAppointmentListResponse,
  AdminAppointmentResponse,
  AdminUpdateAppointmentData,
} from '@/types/admin';

export interface AdminAppointmentListParams {
  locale?: string;
  userId?: string;
  serviceId?: string;
  status?: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  scheduledFrom?: string;
  scheduledTo?: string;
  page?: number;
  limit?: number;
}

export async function fetchAdminAppointments(
  params: AdminAppointmentListParams = {},
): Promise<AdminAppointmentListResponse> {
  const query = buildQuery({
    locale: params.locale,
    userId: params.userId,
    serviceId: params.serviceId,
    status: params.status,
    scheduledFrom: params.scheduledFrom,
    scheduledTo: params.scheduledTo,
    page: params.page ? String(params.page) : undefined,
    limit: params.limit ? String(params.limit) : undefined,
  });

  return apiFetch<AdminAppointmentListResponse>(`/v1/admin/appointments${query}`);
}

export async function fetchAdminAppointment(
  id: string,
  locale?: string,
): Promise<AdminAppointmentResponse> {
  const query = buildQuery({ locale });
  return apiFetch<AdminAppointmentResponse>(`/v1/admin/appointments/${id}${query}`);
}

export async function updateAdminAppointment(
  id: string,
  data: AdminUpdateAppointmentData,
): Promise<AdminAppointmentResponse> {
  return apiFetch<AdminAppointmentResponse>(`/v1/admin/appointments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteAdminAppointment(id: string): Promise<void> {
  return apiFetch<void>(`/v1/admin/appointments/${id}`, {
    method: 'DELETE',
  });
}
