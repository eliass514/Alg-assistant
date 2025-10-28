import { getTranslations } from 'next-intl/server';

import { ProfilePage } from '@/components/profile/ProfilePage';

interface PageProps {
  params: {
    locale: string;
  };
}

export async function generateMetadata({ params }: PageProps) {
  const t = await getTranslations({ locale: params.locale, namespace: 'Profile.meta' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function ProfileRoute() {
  return <ProfilePage />;
}
