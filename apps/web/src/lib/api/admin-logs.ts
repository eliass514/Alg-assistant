import { apiFetch } from '@/lib/api/client';
import { buildQuery } from '@/lib/api/query';
import type {
  AdminConversationLogsResponse,
  AdminDocumentVerificationLogsResponse,
  ConversationParticipant,
} from '@/types/admin';

export interface AdminConversationLogsParams {
  userId?: string;
  appointmentId?: string;
  participant?: ConversationParticipant;
  createdFrom?: string;
  createdTo?: string;
  locale?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminDocumentVerificationLogsParams {
  userId?: string;
  uploadId?: string;
  createdFrom?: string;
  createdTo?: string;
  logType?: 'status' | 'validation';
  page?: number;
  limit?: number;
}

export async function fetchAdminConversationLogs(
  params: AdminConversationLogsParams = {},
): Promise<AdminConversationLogsResponse> {
  const query = buildQuery({
    userId: params.userId,
    appointmentId: params.appointmentId,
    participant: params.participant,
    createdFrom: params.createdFrom,
    createdTo: params.createdTo,
    locale: params.locale,
    search: params.search,
    page: params.page ? String(params.page) : undefined,
    limit: params.limit ? String(params.limit) : undefined,
  });

  return apiFetch<AdminConversationLogsResponse>(`/v1/admin/logs/conversations${query}`);
}

export async function fetchAdminDocumentVerificationLogs(
  params: AdminDocumentVerificationLogsParams = {},
): Promise<AdminDocumentVerificationLogsResponse> {
  const query = buildQuery({
    userId: params.userId,
    uploadId: params.uploadId,
    createdFrom: params.createdFrom,
    createdTo: params.createdTo,
    logType: params.logType,
    page: params.page ? String(params.page) : undefined,
    limit: params.limit ? String(params.limit) : undefined,
  });

  return apiFetch<AdminDocumentVerificationLogsResponse>(
    `/v1/admin/logs/document-verifications${query}`,
  );
}
