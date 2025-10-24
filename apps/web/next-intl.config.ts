import { defaultLocale, supportedLocales } from './src/i18n/config';

export default {
  defaultLocale,
  locales: supportedLocales,
  localePrefix: 'always' as const,
};
