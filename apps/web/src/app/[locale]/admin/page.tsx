import { getTranslations } from 'next-intl/server';

import { Section } from '@/components/layout/Section';

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

export default async function AdminPage() {
  const t = await getTranslations('Admin');

  return (
    <Section>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="mt-2 text-foreground/70">{t('description')}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
