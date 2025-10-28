import { getTranslations } from 'next-intl/server';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { BookingWizard } from '@/components/appointments/BookingWizard';

interface PageProps {
  params: {
    locale: string;
  };
}

export async function generateMetadata({ params }: PageProps) {
  const t = await getTranslations({ locale: params.locale, namespace: 'Booking.meta' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function AppointmentsPage() {
  return (
    <ProtectedRoute>
      <BookingWizard />
    </ProtectedRoute>
  );
}
