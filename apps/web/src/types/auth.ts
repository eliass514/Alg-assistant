import type { RoleName } from '@/lib/constants/roles';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  locale?: string | null;
  role?: RoleName | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: AuthUser;
}

export interface LoginPayload {
  email: string;
  password: string;
  locale?: string;
}

export interface SignupPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword?: string;
  phoneNumber?: string;
  locale?: string;
}

export interface PasswordResetRequestPayload {
  email: string;
  locale?: string;
}

export interface PasswordResetPayload {
  token: string;
  password: string;
  confirmPassword?: string;
}
