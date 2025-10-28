'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { useTranslations } from 'next-intl';

import { useAuth } from '@/components/auth/AuthProvider';
import { Spinner } from '@/components/ui/spinner';
import { useRouter } from '@/i18n/navigation';
import { ROLE } from '@/lib/constants/roles';

interface AdminGuardProps {
  children: ReactNode;
  fallbackPath?: string;
}

export function AdminGuard({ children, fallbackPath = '/' }: AdminGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const t = useTranslations('Auth.Messages');

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }

    if (user.role !== ROLE.ADMIN) {
      router.replace(fallbackPath);
    }
  }, [fallbackPath, isAuthenticated, isLoading, router, user]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm font-medium text-foreground/70">
        <Spinner />
        <span>{t('checkingSession')}</span>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (user.role !== ROLE.ADMIN) {
    return null;
  }

  return <>{children}</>;
}
