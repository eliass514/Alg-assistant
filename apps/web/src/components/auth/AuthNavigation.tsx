'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthProvider';

export function AuthNavigation() {
  const { user, isAuthenticated, signOut, isLoading } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();
  const t = useTranslations('Auth.Navigation');

  const handleLogout = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);

    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      router.replace('/login');
    } finally {
      setIsSigningOut(false);
    }
  };

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-3 text-sm font-medium rtl:space-x-reverse">
        <Link href="/login" className="text-foreground/80 transition hover:text-foreground">
          {t('login')}
        </Link>
        <Button size="sm" onClick={() => router.push('/signup')}>
          {t('signup')}
        </Button>
      </div>
    );
  }

  const displayName = user?.firstName
    ? `${user.firstName} ${user?.lastName ?? ''}`.trim()
    : (user?.email ?? t('profile'));

  return (
    <div className="flex items-center gap-3 text-sm font-medium rtl:space-x-reverse">
      <Link href="/profile" className="text-foreground/80 transition hover:text-foreground">
        <span className="truncate" title={displayName}>
          {displayName}
        </span>
      </Link>
      <Button variant="secondary" size="sm" onClick={handleLogout} disabled={isSigningOut}>
        {t('logout')}
      </Button>
    </div>
  );
}
