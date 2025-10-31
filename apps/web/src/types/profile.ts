import type { AuthUser } from '@/types/auth';
import type { AppointmentStatus } from '@/types/appointments';

export interface UserProfile extends AuthUser {
  birthDate?: string | null;
  nationality?: string | null;
  identityNumber?: string | null;
  address?: UserAddress;
  preferredLanguage?: string | null;
}

export interface UserAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

export type DocumentStatus = 'pending' | 'approved' | 'rejected';

export interface DocumentItem {
  id: string;
  title: string;
  category: string;
  status: DocumentStatus;
  uploadedAt: string;
  downloadUrl?: string | null;
}

export interface AppointmentItem {
  id: string;
  title: string;
  scheduledAt: string;
  location?: string | null;
  practitioner?: string | null;
  status: AppointmentStatus;
  notes?: string | null;
}
