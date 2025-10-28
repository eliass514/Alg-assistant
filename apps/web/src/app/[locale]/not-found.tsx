import { getTranslations } from 'next-intl/server';

import { Section } from '@/components/layout/Section';
import { Link } from '@/i18n/navigation';
import { Heading, Text } from '@/components/ui/typography';

export default async function NotFound() {
  const t = await getTranslations('NotFound');

  return (
    <Section className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <Heading as="h1" size="lg" className="max-w-xl">
        {t('title')}
      </Heading>
      <Text muted className="mt-4 max-w-2xl">
        {t('description')}
      </Text>
      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {t('cta')}
      </Link>
    </Section>
  );
}
