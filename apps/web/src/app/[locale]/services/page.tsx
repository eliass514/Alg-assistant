import { getTranslations } from 'next-intl/server';

import { ServicesCatalogPage } from '@/components/services/ServicesCatalogPage';

interface PageProps {
  params: {
    locale: string;
  };
}

export async function generateMetadata({ params }: PageProps) {
  const t = await getTranslations({ locale: params.locale, namespace: 'Services.meta' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function ServicesPage() {
  return <ServicesCatalogPage />;
}
