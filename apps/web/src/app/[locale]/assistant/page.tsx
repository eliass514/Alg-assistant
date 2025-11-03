import { getTranslations } from 'next-intl/server';

import { EnhancedAssistantExperience } from '@/components/assistant/EnhancedAssistantExperience';

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
  return <EnhancedAssistantExperience />;
}
