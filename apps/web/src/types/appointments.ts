export type AppointmentSlotStatus = 'AVAILABLE' | 'FULL' | 'CANCELLED';

export interface AppointmentSlotAvailability {
  id: string;
  serviceId: string;
  startAt: string;
  endAt: string;
  timezone: string;
  capacity: number;
  available: number;
  status: AppointmentSlotStatus;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  queueLength: number;
  notes?: string | null;
}

export type QueueTicketStatus = 'WAITING' | 'NOTIFIED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

export interface QueueTicket {
  id: string;
  serviceId: string;
  slotId?: string | null;
  status: QueueTicketStatus;
  position: number;
  desiredFrom?: string | null;
  desiredTo?: string | null;
  timezone: string;
  notifiedAt?: string | null;
  expiresAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface ServiceSummary {
  id: string;
  slug: string;
  durationMinutes: number;
}

export interface AppointmentSlotSummary {
  id: string;
  startAt: string;
  endAt: string;
  timezone: string;
  capacity: number;
  status: AppointmentSlotStatus;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
}

export interface AppointmentDetails {
  id: string;
  userId: string;
  serviceId: string;
  slotId?: string | null;
  queueTicketId?: string | null;
  status: AppointmentStatus;
  scheduledAt: string;
  timezone: string;
  locale: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  service: ServiceSummary;
  slot?: AppointmentSlotSummary | null;
  queueTicket?: QueueTicket | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface AppointmentListResponse {
  data: AppointmentDetails[];
  meta: PaginationMeta;
}

export interface AppointmentDetailResponse {
  data: AppointmentDetails;
}

export interface AppointmentAvailabilityResponse {
  data: AppointmentSlotAvailability[];
}

export interface QueueTicketDetailResponse {
  data: QueueTicket;
}

export interface AppointmentAvailabilityParams {
  serviceId: string;
  from?: string;
  to?: string;
  timezone?: string;
}

export interface AppointmentListParams {
  locale?: string;
  page?: number;
  limit?: number;
}

export interface BookAppointmentPayload {
  serviceId: string;
  slotId: string;
  queueTicketId?: string;
  locale?: string;
  timezone?: string;
  notes?: string;
}

export interface RescheduleAppointmentPayload {
  slotId: string;
  timezone?: string;
  notes?: string;
}

export interface CancelAppointmentPayload {
  reason?: string;
}

export interface CreateQueueTicketPayload {
  serviceId: string;
  slotId?: string;
  desiredFrom?: string;
  desiredTo?: string;
  timezone?: string;
  notes?: string;
}

export interface UpdateQueueTicketStatusPayload {
  status: QueueTicketStatus;
  notes?: string;
}
