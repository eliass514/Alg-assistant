import { apiFetch } from '@/lib/api/client';
import { buildQuery } from '@/lib/api/query';
import type {
  AdminDocumentTemplateFormData,
  AdminDocumentTemplateListResponse,
  AdminDocumentTemplateResponse,
} from '@/types/admin';

export interface AdminDocumentTemplateListParams {
  locale?: string;
  search?: string;
  serviceId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export async function fetchAdminDocumentTemplates(
  params: AdminDocumentTemplateListParams = {},
): Promise<AdminDocumentTemplateListResponse> {
  const query = buildQuery({
    locale: params.locale,
    search: params.search,
    serviceId: params.serviceId,
    isActive: typeof params.isActive === 'boolean' ? String(params.isActive) : undefined,
    page: params.page ? String(params.page) : undefined,
    limit: params.limit ? String(params.limit) : undefined,
  });

  return apiFetch<AdminDocumentTemplateListResponse>(`/v1/admin/document-templates${query}`);
}

export async function fetchAdminDocumentTemplate(
  id: string,
): Promise<AdminDocumentTemplateResponse> {
  return apiFetch<AdminDocumentTemplateResponse>(`/v1/admin/document-templates/${id}`);
}

export async function createAdminDocumentTemplate(
  data: AdminDocumentTemplateFormData,
): Promise<AdminDocumentTemplateResponse> {
  return apiFetch<AdminDocumentTemplateResponse>('/v1/admin/document-templates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdminDocumentTemplate(
  id: string,
  data: Partial<AdminDocumentTemplateFormData>,
): Promise<AdminDocumentTemplateResponse> {
  return apiFetch<AdminDocumentTemplateResponse>(`/v1/admin/document-templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteAdminDocumentTemplate(id: string): Promise<void> {
  return apiFetch<void>(`/v1/admin/document-templates/${id}`, {
    method: 'DELETE',
  });
}

export async function uploadDocumentTemplateFile(
  id: string,
  file: File,
  description?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);
  if (description) {
    formData.append('description', description);
  }
  if (metadata) {
    formData.append('metadata', JSON.stringify(metadata));
  }

  return apiFetch<void>(`/v1/admin/document-templates/${id}/upload`, {
    method: 'POST',
    body: formData,
  });
}
