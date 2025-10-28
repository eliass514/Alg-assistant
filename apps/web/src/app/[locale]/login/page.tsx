import { getTranslations } from 'next-intl/server';

import { GuestRoute } from '@/components/auth/GuestRoute';
import { Link } from '@/i18n/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { Section } from '@/components/layout/Section';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heading, Text } from '@/components/ui/typography';

interface PageProps {
  params: {
    locale: string;
  };
}

export async function generateMetadata({ params }: PageProps) {
  const t = await getTranslations({ locale: params.locale, namespace: 'Auth.Login.meta' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function LoginPage({ params }: PageProps) {
  const page = await getTranslations({ locale: params.locale, namespace: 'Auth.Login.page' });
  const actions = await getTranslations({ locale: params.locale, namespace: 'Auth.Login.actions' });
  const highlights = (page.raw('highlights') as string[]) ?? [];

  return (
    <GuestRoute>
      <Section className="py-12 sm:py-16 lg:py-20">
        <div className="mx-auto flex max-w-5xl flex-col gap-10 lg:flex-row lg:items-start">
          <div className="flex-1 space-y-5 text-left rtl:text-right">
            <Heading as="h1" size="lg">
              {page('title')}
            </Heading>
            <Text muted>{page('subtitle')}</Text>
            {highlights.length > 0 ? (
              <ul className="space-y-3 text-sm leading-6 text-foreground/70">
                {highlights.map((item) => (
                  <li key={item} className="flex items-start gap-3 rtl:space-x-reverse">
                    <span
                      className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>{page('formTitle')}</CardTitle>
              <Text muted>{page('formSubtitle')}</Text>
            </CardHeader>
            <CardContent className="space-y-6">
              <LoginForm />
              <p className="text-sm text-foreground/70 rtl:text-right">
                {actions('noAccount')}{' '}
                <Link
                  href="/signup"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {actions('createAccount')}
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </Section>
    </GuestRoute>
  );
}
