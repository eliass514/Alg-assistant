'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';

import { useLocale } from 'next-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { logout as requestLogout } from '@/lib/api/auth';
import { refreshAccessToken } from '@/lib/api/client';
import { getCurrentUser } from '@/lib/api/auth';
import { authKeys } from '@/lib/react-query/keys';
import type { AuthUser } from '@/types';

interface AuthProviderProps {
  children: ReactNode;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refetchUser: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const SESSION_REFRESH_INTERVAL = 4 * 60 * 1000;

export function AuthProvider({ children }: AuthProviderProps) {
  const locale = useLocale();
  const queryClient = useQueryClient();
  const queryKey = [...authKeys.user(), locale] as const;

  const {
    data: user,
    isLoading,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => getCurrentUser(locale),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    const intervalId = window.setInterval(async () => {
      const refreshed = await refreshAccessToken();

      if (!refreshed) {
        queryClient.setQueryData(queryKey, null);
      }
    }, SESSION_REFRESH_INTERVAL);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [queryClient, queryKey, user]);

  const signOut = useCallback(async () => {
    try {
      await requestLogout(locale);
    } finally {
      queryClient.setQueryData(queryKey, null);
    }
  }, [locale, queryClient, queryKey]);

  const value = useMemo<AuthContextValue>(() => {
    const refetchUser = async () => {
      const result = await refetch();
      return result.data ?? null;
    };

    return {
      user: user ?? null,
      isAuthenticated: Boolean(user),
      isLoading,
      signOut,
      refetchUser,
    };
  }, [isLoading, refetch, signOut, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
