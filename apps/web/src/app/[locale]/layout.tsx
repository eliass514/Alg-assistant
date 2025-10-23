import type { ReactNode } from 'react';

import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { ApplicationShell } from '@/components/layout/ApplicationShell';
import { fontVariables } from '@/lib/fonts';
import { cn } from '@/lib/utils';
import {
  getLocaleDirection,
  isSupportedLocale,
  supportedLocales,
  type SupportedLocale,
} from '@/i18n/config';

interface LocaleLayoutProps {
  children: ReactNode;
  params: {
    locale: string;
  };
}

export function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: { locale: string } }) {
  if (!isSupportedLocale(params.locale)) {
    return {};
  }

  const t = await getTranslations({ locale: params.locale, namespace: 'Metadata' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const locale = params.locale;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const activeLocale = locale as SupportedLocale;

  unstable_setRequestLocale(activeLocale);

  const messages = await getMessages();
  const direction = getLocaleDirection(activeLocale);

  return (
    <html lang={activeLocale} dir={direction} className={fontVariables} suppressHydrationWarning>
      <body className={cn('bg-background text-foreground antialiased')}>
        <NextIntlClientProvider locale={activeLocale} messages={messages} timeZone="Africa/Algiers">
          <ApplicationShell>{children}</ApplicationShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
