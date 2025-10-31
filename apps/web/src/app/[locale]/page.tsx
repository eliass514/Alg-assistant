import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heading, Text } from '@/components/ui/typography';

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function HomePage({ params: { locale } }: PageProps) {
  setRequestLocale(locale);

  const t = await getTranslations('Home');
  const featureList = (t.raw('featureList') as string[]) ?? [];

  return (
    <Section className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-center">
      <div className="space-y-8">
        <Heading as="h1" size="xl">
          {t('heroTitle')}
        </Heading>
        <Text className="text-foreground/80">{t('heroSubtitle')}</Text>
        <div className="flex flex-wrap items-center gap-3 rtl:space-x-reverse">
          <Button>{t('ctaPrimary')}</Button>
          <Button variant="secondary">{t('ctaSecondary')}</Button>
        </div>
      </div>
      <Card className="lg:ml-auto rtl:lg:mr-auto">
        <CardHeader>
          <CardTitle>{t('featureTitle')}</CardTitle>
          <Text muted className="text-sm">
            {t('featureHighlight')}
          </Text>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4 text-sm leading-6 text-foreground/80">
            {featureList.map((item) => (
              <li key={item} className="flex items-start gap-3 rtl:space-x-reverse">
                <span
                  className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-primary"
                  aria-hidden="true"
                />
                <span className="text-balance">{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </Section>
  );
}
