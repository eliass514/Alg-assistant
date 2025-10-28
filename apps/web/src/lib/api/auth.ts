import { apiFetch, isApiError } from '@/lib/api/client';
import { buildLocaleHeaders } from '@/lib/api/shared';
import type {
  AuthResponse,
  AuthUser,
  LoginPayload,
  PasswordResetPayload,
  PasswordResetRequestPayload,
  SignupPayload,
} from '@/types';

function resolveUser(payload: AuthResponse | AuthUser | null | undefined): AuthUser {
  if (!payload) {
    throw new Error('Empty response received from authentication endpoint.');
  }

  if (typeof (payload as AuthResponse).user !== 'undefined') {
    return (payload as AuthResponse).user;
  }

  return payload as AuthUser;
}

export async function login(payload: LoginPayload): Promise<AuthUser> {
  const { locale, ...rest } = payload;

  const response = await apiFetch<AuthResponse | AuthUser>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(rest),
    headers: buildLocaleHeaders(locale),
  });

  return resolveUser(response);
}

export async function signup(payload: SignupPayload): Promise<AuthUser> {
  const { confirmPassword, locale, ...rest } = payload;

  const response = await apiFetch<AuthResponse | AuthUser>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...rest, passwordConfirmation: confirmPassword ?? rest.password }),
    headers: buildLocaleHeaders(locale),
  });

  return resolveUser(response);
}

export async function requestPasswordReset(
  payload: PasswordResetRequestPayload,
): Promise<{ message: string } | undefined> {
  const { locale, ...rest } = payload;

  return apiFetch('/auth/password/forgot', {
    method: 'POST',
    body: JSON.stringify(rest),
    headers: buildLocaleHeaders(locale),
  });
}

export async function resetPassword(
  payload: PasswordResetPayload,
): Promise<{ message: string } | undefined> {
  const { confirmPassword, ...rest } = payload;

  return apiFetch('/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify({ ...rest, passwordConfirmation: confirmPassword ?? rest.password }),
  });
}

export async function getCurrentUser(locale?: string): Promise<AuthUser | null> {
  try {
    const response = await apiFetch<AuthResponse | AuthUser | null>('/auth/me', {
      headers: buildLocaleHeaders(locale),
    });

    if (!response) return null;

    return resolveUser(response);
  } catch (error) {
    if (isApiError(error) && error.status === 401) {
      return null;
    }

    throw error;
  }
}

export async function logout(locale?: string): Promise<void> {
  await apiFetch('/auth/logout', {
    method: 'POST',
    headers: buildLocaleHeaders(locale),
  });
}
