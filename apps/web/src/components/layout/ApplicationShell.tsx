import type { ReactNode } from 'react';

import { getTranslations } from 'next-intl/server';

import { LocaleSwitcher } from '@/components/locale/LocaleSwitcher';

import { Container } from './Container';

interface ApplicationShellProps {
  children: ReactNode;
}

export async function ApplicationShell({ children }: ApplicationShellProps) {
  const t = await getTranslations('Layout');

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border/70 bg-background/80 backdrop-blur">
        <Container className="flex flex-wrap items-center justify-between gap-4 py-6">
          <div className="space-y-1 text-sm font-medium uppercase tracking-[0.35em] text-primary rtl:text-right">
            <span>{t('brand')}</span>
            <p className="text-xs normal-case tracking-normal text-foreground/60 rtl:text-right">
              {t('tagline')}
            </p>
          </div>
          <LocaleSwitcher />
        </Container>
      </header>
      <main className="flex-1">
        <Container className="py-12 sm:py-16 lg:py-20">{children}</Container>
      </main>
      <footer className="border-t border-border/70 bg-background/90">
        <Container className="py-6 text-xs font-medium uppercase tracking-[0.25em] text-foreground/60">
          {t('footer')}
        </Container>
      </footer>
    </div>
  );
}
