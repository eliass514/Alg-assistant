export function buildLocaleHeaders(locale?: string): HeadersInit | undefined {
  if (!locale) return undefined;

  return {
    'Accept-Language': locale,
  } satisfies HeadersInit;
}
