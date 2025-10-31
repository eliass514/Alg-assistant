import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Section } from '@/components/layout/Section';
import { AdminDashboardMetrics } from '@/components/admin/AdminDashboardMetrics';

interface PageProps {
  params: {
    locale: string;
  };
}

export async function generateMetadata({ params }: PageProps) {
  const t = await getTranslations({ locale: params.locale, namespace: 'Admin.meta' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function AdminPage({ params: { locale } }: PageProps) {
  setRequestLocale(locale);

  const t = await getTranslations('Admin');

  return (
    <Section>
      <div className="space-y-12">
        <header className="space-y-3">
          <h1 className="text-2xl font-bold sm:text-3xl">{t('title')}</h1>
          <p className="text-foreground/70">{t('description')}</p>
        </header>

        <AdminDashboardMetrics />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">{t('dashboard.overview')}</h2>
            <p className="mt-2 text-sm text-foreground/70">{t('dashboard.overviewDescription')}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">{t('dashboard.users')}</h2>
            <p className="mt-2 text-sm text-foreground/70">{t('dashboard.usersDescription')}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">{t('dashboard.services')}</h2>
            <p className="mt-2 text-sm text-foreground/70">{t('dashboard.servicesDescription')}</p>
          </div>
        </div>
      </div>
    </Section>
  );
}
