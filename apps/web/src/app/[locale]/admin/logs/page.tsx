import { getTranslations } from 'next-intl/server';
import { unstable_setRequestLocale } from 'next-intl/server';

import type { SupportedLocale } from '@/i18n/config';
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

export default async function AdminLogsPage({ params }: PageProps) {
  const locale = params.locale as SupportedLocale;
  unstable_setRequestLocale(locale);

  return (
    <Section>
      <ModerationLogsPage />
    </Section>
  );
}
