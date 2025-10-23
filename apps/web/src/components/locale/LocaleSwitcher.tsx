'use client';

import { useTransition } from 'react';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next-intl/navigation';

import { Button } from '@/components/ui/button';
import { localeLabels, localeOrder, supportedLocales, type SupportedLocale } from '@/i18n/config';
import { cn } from '@/lib/utils';

const supportedSet = new Set<string>(supportedLocales);

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations('LocaleSwitcher');
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleSwitch = (nextLocale: SupportedLocale) => {
    if (nextLocale === locale) return;

    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  };

  return (
    <div className="flex flex-col items-start gap-2 text-left text-sm rtl:text-right">
      <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
        {t('label')}
      </span>
      <div className="flex flex-wrap items-center gap-2 rtl:space-x-reverse">
        {localeOrder.map((entry) => {
          const labels = localeLabels[entry];
          const isSupported = supportedSet.has(entry);
          const isActive = locale === entry;

          if (!isSupported) {
            return (
              <div
                key={entry}
                className={cn(
                  'flex items-center gap-2 rounded-full border border-dashed border-border/70 px-4 py-2 text-xs text-foreground/60',
                  'bg-background/50 backdrop-blur',
                )}
              >
                <span>{labels.native}</span>
                <span className="hidden text-[0.65rem] font-medium sm:inline">
                  {t('comingSoon')}
                </span>
              </div>
            );
          }

          const nextLocale = entry as SupportedLocale;

          return (
            <Button
              key={entry}
              variant={isActive ? 'primary' : 'secondary'}
              size="sm"
              isActive={isActive}
              disabled={isActive || isPending}
              onClick={() => handleSwitch(nextLocale)}
            >
              {labels.native}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
