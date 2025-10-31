import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Section } from '@/components/layout/Section';

interface PageProps {
  params: {
    locale: string;
  };
}

export async function generateMetadata({ params }: PageProps) {
  const t = await getTranslations({ locale: params.locale, namespace: 'Admin.Dashboard.meta' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function AdminDashboardPage({ params: { locale } }: PageProps) {
  setRequestLocale(locale);

  const t = await getTranslations('Admin.Dashboard');

  return (
    <Section>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{t('title')}</h1>
          <p className="mt-2 text-foreground/70">{t('description')}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-foreground/60">{t('placeholder')}</p>
        </div>
      </div>
    </Section>
  );
}
