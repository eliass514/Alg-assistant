import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, isSupportedLocale, type SupportedLocale } from './config';

const loaders: Record<SupportedLocale, () => Promise<{ default: Record<string, unknown> }>> = {
  ar: () => import('./messages/ar.json'),
  fr: () => import('./messages/fr.json'),
};

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale = isSupportedLocale(locale) ? locale : defaultLocale;

  return {
    locale: resolvedLocale,
    messages: (await loaders[resolvedLocale]()).default,
  };
});

export { supportedLocales, defaultLocale };
