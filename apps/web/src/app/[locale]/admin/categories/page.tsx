import { getTranslations } from 'next-intl/server';

import { CategoriesManagementPage } from '@/components/admin/CategoriesManagementPage';

interface PageProps {
  params: {
    locale: string;
  };
}

export async function generateMetadata({ params }: PageProps) {
  const t = await getTranslations({ locale: params.locale, namespace: 'Admin.Categories.meta' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function AdminCategoriesPage() {
  return <CategoriesManagementPage />;
}
