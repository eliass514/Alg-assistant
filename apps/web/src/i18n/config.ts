export const supportedLocales = ['ar', 'fr'] as const;
export const futureLocales = ['kab'] as const;

export type SupportedLocale = (typeof supportedLocales)[number];
export type FutureLocale = (typeof futureLocales)[number];
export type AnyLocale = SupportedLocale | FutureLocale;

export const defaultLocale: SupportedLocale = 'fr';

const rtlLocales = new Set<AnyLocale>(['ar']);

export function getLocaleDirection(locale: AnyLocale): 'ltr' | 'rtl' {
  return rtlLocales.has(locale) ? 'rtl' : 'ltr';
}

export function isSupportedLocale(locale?: string): locale is SupportedLocale {
  return !!locale && supportedLocales.includes(locale as SupportedLocale);
}

export const localeLabels: Record<AnyLocale, { native: string; english: string }> = {
  ar: { native: 'العربية', english: 'Arabic' },
  fr: { native: 'Français', english: 'French' },
  kab: { native: 'ⵜⴰⵎⴰⵣⵉⵖⵜ', english: 'Tamazight' },
};

export const localeOrder: AnyLocale[] = [...supportedLocales, ...futureLocales];
