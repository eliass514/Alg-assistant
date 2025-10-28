import { getTranslations } from 'next-intl/server';

import { DocumentWorkspacePage } from '@/components/documents/DocumentWorkspacePage';

interface PageProps {
  params: {
    locale: string;
  };
}

export async function generateMetadata({ params }: PageProps) {
  const t = await getTranslations({ locale: params.locale, namespace: 'Documents.meta' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function DocumentsPage() {
  return <DocumentWorkspacePage />;
}
