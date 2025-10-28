import { getTranslations } from 'next-intl/server';

import { ServicesManagementPage } from '@/components/admin/ServicesManagementPage';

interface PageProps {
  params: {
    locale: string;
  };
}

export async function generateMetadata({ params }: PageProps) {
  const t = await getTranslations({ locale: params.locale, namespace: 'Admin.Services.meta' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function AdminServicesPage() {
  return <ServicesManagementPage />;
}
