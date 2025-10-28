import { apiFetch } from '@/lib/api/client';
import { buildLocaleHeaders } from '@/lib/api/shared';
import type { AppointmentItem, DocumentItem, UserProfile } from '@/types';

export async function fetchUserProfile(locale?: string): Promise<UserProfile> {
  return apiFetch<UserProfile>('/profile', {
    headers: buildLocaleHeaders(locale),
  });
}

export async function fetchUserDocuments(locale?: string): Promise<DocumentItem[]> {
  return apiFetch<DocumentItem[]>('/documents', {
    headers: buildLocaleHeaders(locale),
  });
}

export async function fetchUserAppointments(locale?: string): Promise<AppointmentItem[]> {
  return apiFetch<AppointmentItem[]>('/appointments', {
    headers: buildLocaleHeaders(locale),
  });
}
