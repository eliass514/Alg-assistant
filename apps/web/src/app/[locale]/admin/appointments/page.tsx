import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AppointmentsManagementPage } from '@/components/admin/AppointmentsManagementPage';

interface PageProps {
  params: {
    locale: string;
  };
}

export async function generateMetadata({ params }: PageProps) {
  const t = await getTranslations({ locale: params.locale, namespace: 'Admin.Appointments.meta' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function AdminAppointmentsPage({ params: { locale } }: PageProps) {
  setRequestLocale(locale);

  return <AppointmentsManagementPage />;
}
