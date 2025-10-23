import createMiddleware from 'next-intl/middleware';

import { defaultLocale, supportedLocales } from '@/i18n/config';

export default createMiddleware({
  defaultLocale,
  locales: supportedLocales,
  localePrefix: 'always',
});

export const config = {
  // eslint-disable-next-line no-useless-escape
  matcher: ['/((?!_next|.*\..*|api).*)'],
};
