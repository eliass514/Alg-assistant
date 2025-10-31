import type { ReactNode } from 'react';

import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from '@/components/locale/LocaleSwitcher';
import { Container } from '@/components/layout/Container';
import { AdminMobileNav } from '@/components/admin/AdminMobileNav';

interface AdminLayoutProps {
  children: ReactNode;
  params: {
    locale: string;
  };
}

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  setRequestLocale(params.locale);

  const t = await getTranslations('Admin.Layout');

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border/70 bg-background/80 backdrop-blur">
        <Container className="py-4">
          <div className="flex items-center justify-between gap-4">
            <Link href="/admin" className="text-lg font-semibold text-primary">
              {t('brand')}
            </Link>

            <nav
              aria-label={t('navLabel')}
              className="hidden items-center gap-4 lg:flex rtl:space-x-reverse"
            >
              <Link
                href="/admin/dashboard"
                className="text-sm font-medium text-foreground/80 transition hover:text-foreground"
              >
                {t('dashboardLink')}
              </Link>
              <Link
                href="/admin/users"
                className="text-sm font-medium text-foreground/80 transition hover:text-foreground"
              >
                {t('usersLink')}
              </Link>
              <Link
                href="/admin/services"
                className="text-sm font-medium text-foreground/80 transition hover:text-foreground"
              >
                {t('servicesLink')}
              </Link>
              <Link
                href="/admin/categories"
                className="text-sm font-medium text-foreground/80 transition hover:text-foreground"
              >
                {t('categoriesLink')}
              </Link>
              <Link
                href="/admin/appointments"
                className="text-sm font-medium text-foreground/80 transition hover:text-foreground"
              >
                {t('appointmentsLink')}
              </Link>
              <Link
                href="/admin/document-templates"
                className="text-sm font-medium text-foreground/80 transition hover:text-foreground"
              >
                {t('documentTemplatesLink')}
              </Link>
              <Link
                href="/admin/logs"
                className="text-sm font-medium text-foreground/80 transition hover:text-foreground"
              >
                {t('logsLink')}
              </Link>
              <Link
                href="/admin/settings"
                className="text-sm font-medium text-foreground/80 transition hover:text-foreground"
              >
                {t('settingsLink')}
              </Link>
            </nav>

            <div className="flex items-center gap-4">
              <LocaleSwitcher />
              <Link
                href="/"
                className="hidden text-sm font-medium text-foreground/80 transition hover:text-foreground sm:inline-block"
              >
                {t('exitAdmin')}
              </Link>
              <AdminMobileNav />
            </div>
          </div>
        </Container>
      </header>
      <main className="flex-1">
        <Container className="py-8">{children}</Container>
      </main>
      <footer className="border-t border-border/70 bg-background/90">
        <Container className="py-4 text-xs font-medium text-foreground/60">{t('footer')}</Container>
      </footer>
    </div>
  );
}
