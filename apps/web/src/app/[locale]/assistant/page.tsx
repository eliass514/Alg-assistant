import { getTranslations } from 'next-intl/server';

import { AssistantExperience } from '@/components/assistant/AssistantExperience';

interface PageProps {
  params: {
    locale: string;
  };
}

export async function generateMetadata({ params }: PageProps) {
  const t = await getTranslations({ locale: params.locale, namespace: 'Assistant.meta' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function AssistantPage() {
  return <AssistantExperience />;
}
