'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { useTranslations } from 'next-intl';

import { Spinner } from '@/components/ui/spinner';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/components/auth/AuthProvider';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations('Auth.Messages');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm font-medium text-foreground/70">
        <Spinner />
        <span>{t('checkingSession')}</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
