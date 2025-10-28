import type { CacheMetadata, PaginatedMeta, ServiceCategory, ServiceItem } from './services';
import type { AppointmentDetails, AppointmentStatus, PaginationMeta } from './appointments';

export interface ServiceTranslationInput {
  locale: string;
  name: string;
  summary?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface CategoryTranslationInput {
  locale: string;
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface AdminServiceFormData {
  slug: string;
  categoryId: string;
  durationMinutes: number;
  price: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
  translations: ServiceTranslationInput[];
}

export interface AdminServiceCategoryFormData {
  slug: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
  translations: CategoryTranslationInput[];
}

export interface AdminServiceResponse {
  data: ServiceItem;
  cache: CacheMetadata;
}

export interface AdminServiceListResponse {
  data: ServiceItem[];
  meta: PaginatedMeta;
  cache: CacheMetadata;
}

export interface AdminServiceCategoryResponse {
  data: ServiceCategory;
  cache: CacheMetadata;
}

export interface AdminServiceCategoryListResponse {
  data: ServiceCategory[];
  meta: PaginatedMeta;
  cache: CacheMetadata;
}

export interface AdminAppointmentListResponse {
  data: AppointmentDetails[];
  meta: PaginationMeta;
}

export interface AdminAppointmentResponse {
  data: AppointmentDetails;
}

export interface AdminUpdateAppointmentData {
  status?: AppointmentStatus;
  slotId?: string;
  notes?: string;
}

export interface TemplateServiceAssignment {
  serviceId: string;
  isRequired?: boolean;
  autoApply?: boolean;
  validFrom?: string;
  validTo?: string;
}

export interface DocumentTemplateVersion {
  id: string;
  versionNumber: number;
  label?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentTemplateService {
  id: string;
  serviceId: string;
  isRequired: boolean;
  autoApply: boolean;
  validFrom?: string;
  validTo?: string;
  service: {
    id: string;
    slug: string;
    translations: Array<{
      locale: string;
      name: string;
    }>;
  };
}

export interface DocumentTemplate {
  id: string;
  slug: string;
  name: string;
  description?: string;
  defaultLocale: string;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  services?: DocumentTemplateService[];
  versions?: DocumentTemplateVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminDocumentTemplateFormData {
  slug: string;
  name: string;
  description?: string;
  defaultLocale?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
  services?: TemplateServiceAssignment[];
}

export interface AdminDocumentTemplateResponse {
  data: DocumentTemplate;
}

export interface AdminDocumentTemplateListResponse {
  data: DocumentTemplate[];
  meta: PaginatedMeta;
}

export type ConversationParticipant = 'CLIENT' | 'SPECIALIST' | 'SYSTEM' | 'AI_ASSISTANT';

export interface AdminConversationLogEntry {
  id: string;
  userId: string | null;
  appointmentId: string | null;
  participant: ConversationParticipant;
  locale: string;
  message: string;
  payload: unknown | null;
  createdAt: string;
}

export interface AdminConversationLogsResponse {
  data: AdminConversationLogEntry[];
  meta: PaginationMeta;
}

export type DocumentUploadStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'VALIDATED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface AdminDocumentStatusLogEntry {
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

export interface AdminDocumentValidationLogEntry {
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

export type AdminDocumentVerificationLogEntry =
  | AdminDocumentStatusLogEntry
  | AdminDocumentValidationLogEntry;

export interface AdminDocumentVerificationLogsResponse {
  data: AdminDocumentVerificationLogEntry[];
  meta: PaginationMeta;
}
