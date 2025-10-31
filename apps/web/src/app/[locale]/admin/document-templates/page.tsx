import { getTranslations, setRequestLocale } from 'next-intl/server';

import { DocumentTemplatesManagementPage } from '@/components/admin/DocumentTemplatesManagementPage';

interface PageProps {
  params: {
    locale: string;
  };
}

export async function generateMetadata({ params }: PageProps) {
  const t = await getTranslations({
    locale: params.locale,
    namespace: 'Admin.DocumentTemplates.meta',
  });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function AdminDocumentTemplatesPage({ params: { locale } }: PageProps) {
  setRequestLocale(locale);

  return <DocumentTemplatesManagementPage />;
}
