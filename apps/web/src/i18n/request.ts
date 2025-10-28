import type { AbstractIntlMessages } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, isSupportedLocale, supportedLocales, type SupportedLocale } from './config';

type MessagePrimitive = string | number | boolean | null;
type MessageValue = MessagePrimitive | MessageValue[] | { [key: string]: MessageValue };
type MessagesModule = { default: Record<string, MessageValue> };

const loaders: Record<SupportedLocale, () => Promise<MessagesModule>> = {
  ar: () => import('./messages/ar.json'),
  fr: () => import('./messages/fr.json'),
};

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale = isSupportedLocale(locale) ? locale : defaultLocale;

  return {
    locale: resolvedLocale,
    messages: (await loaders[resolvedLocale]()).default as AbstractIntlMessages,
  };
});

export { supportedLocales, defaultLocale };
