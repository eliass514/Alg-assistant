import { ConversationParticipant, DocumentUploadStatus } from '@prisma/client';

interface PaginationMetaDto {
  page: number;
  limit: number;
  total: number;
}

export interface AdminConversationLogEntryDto {
  id: string;
  userId: string | null;
  appointmentId: string | null;
  participant: ConversationParticipant;
  locale: string;
  message: string;
  payload: unknown | null;
  createdAt: string;
}

export interface AdminConversationLogsResponseDto {
  data: AdminConversationLogEntryDto[];
  meta: PaginationMetaDto;
}

export interface AdminDocumentStatusLogEntryDto {
  id: string;
  uploadId: string;
  userId: string | null;
  fromStatus: DocumentUploadStatus | null;
  toStatus: DocumentUploadStatus;
  reason: string | null;
  metadata: unknown | null;
  createdAt: string;
  type: 'status';
}

export interface AdminDocumentValidationLogEntryDto {
  id: string;
  uploadId: string;
  userId: string | null;
  ruleId: string | null;
  status: string;
  message: string | null;
  metadata: unknown | null;
  executedAt: string;
  type: 'validation';
}

export type AdminDocumentVerificationLogEntryDto =
  | AdminDocumentStatusLogEntryDto
  | AdminDocumentValidationLogEntryDto;

export interface AdminDocumentVerificationLogsResponseDto {
  data: AdminDocumentVerificationLogEntryDto[];
  meta: PaginationMetaDto;
}
