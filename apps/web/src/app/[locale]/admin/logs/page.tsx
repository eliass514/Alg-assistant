import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Section } from '@/components/layout/Section';
import { ModerationLogsPage } from '@/components/admin/ModerationLogsPage';

interface PageProps {
  params: {
    locale: string;
  };
}

export async function generateMetadata({ params }: PageProps) {
  const t = await getTranslations({ locale: params.locale, namespace: 'Admin.Logs.meta' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function AdminLogsPage({ params: { locale } }: PageProps) {
  setRequestLocale(locale);

  return (
    <Section>
      <ModerationLogsPage />
    </Section>
  );
}
