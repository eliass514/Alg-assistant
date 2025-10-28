import { createSharedPathnamesNavigation } from 'next-intl/navigation';
import { supportedLocales } from './config';

export const { Link, redirect, usePathname, useRouter } = createSharedPathnamesNavigation({
  locales: supportedLocales,
  localePrefix: 'always',
});
