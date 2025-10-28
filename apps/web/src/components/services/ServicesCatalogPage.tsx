'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useId,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';

import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';

import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Heading, Text } from '@/components/ui/typography';
import { fetchServiceCategories, fetchServices } from '@/lib/api/services';
import { serviceCategoryKeys, serviceKeys } from '@/lib/react-query/keys';
import { cn } from '@/lib/utils';
import type { ServiceItem } from '@/types';

const SERVICE_FETCH_LIMIT = 50;
const CATEGORY_FETCH_LIMIT = 100;

function readTags(metadata?: Record<string, unknown> | null): string[] {
  const raw = metadata?.['tags'];
  if (!Array.isArray(raw)) {
    return [];
  }

  const tags: string[] = [];
  raw.forEach((tag) => {
    if (typeof tag === 'string') {
      const trimmed = tag.trim();
      if (trimmed.length > 0) {
        tags.push(trimmed);
      }
    }
  });
  return tags;
}

function extractTags(service: ServiceItem): string[] {
  const tags = new Set<string>();
  readTags(service.metadata).forEach((tag) => tags.add(tag));
  readTags(service.translation?.metadata ?? null).forEach((tag) => tags.add(tag));
  return Array.from(tags);
}

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

export function ServicesCatalogPage() {
  const locale = useLocale();
  const heroT = useTranslations('Services.hero');
  const searchT = useTranslations('Services.search');
  const filtersT = useTranslations('Services.filters');
  const categoriesT = useTranslations('Services.categories');
  const statusT = useTranslations('Services.status');
  const actionsT = useTranslations('Services.actions');
  const cardsT = useTranslations('Services.cards');
  const cacheT = useTranslations('Services.cache');
  const a11yT = useTranslations('Services.a11y');

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activeOnly, setActiveOnly] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isOffline, setIsOffline] = useState<boolean>(() =>
    typeof window !== 'undefined' ? !window.navigator.onLine : false,
  );

  const searchInputId = useId();
  const resultsHeadingId = useId();
  const resultsListId = useId();

  const categoryButtonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleOnlineStatus = () => {
      setIsOffline(!window.navigator.onLine);
    };

    handleOnlineStatus();

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    void navigator.serviceWorker.register('/service-worker.js').catch(() => undefined);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, [searchTerm]);

  const normalizedSearchTerm = debouncedSearchTerm.trim();
  const searchParam = normalizedSearchTerm.length > 0 ? normalizedSearchTerm : undefined;

  const servicesQueryParams = useMemo(
    () => ({
      locale,
      search: searchParam,
      categoryId: selectedCategoryId ?? undefined,
      isActive: activeOnly,
      page: 1,
      limit: SERVICE_FETCH_LIMIT,
    }),
    [locale, searchParam, selectedCategoryId, activeOnly],
  );

  const servicesQuery = useQuery({
    queryKey: serviceKeys.list(servicesQueryParams),
    queryFn: () => fetchServices(servicesQueryParams),
    keepPreviousData: true,
  });

  const categoriesQuery = useQuery({
    queryKey: serviceCategoryKeys.list(locale),
    queryFn: () =>
      fetchServiceCategories({
        locale,
        isActive: true,
        limit: CATEGORY_FETCH_LIMIT,
      }),
    staleTime: 5 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
  });

  const categories = useMemo(() => categoriesQuery.data?.data ?? [], [categoriesQuery.data]);

  useEffect(() => {
    if (selectedCategoryId && !categories.some((category) => category.id === selectedCategoryId)) {
      setSelectedCategoryId(null);
    }
  }, [categories, selectedCategoryId]);

  const services = servicesQuery.data?.data ?? [];

  const availableTags = useMemo(() => {
    const tagMap = new Map<string, string>();

    services.forEach((service) => {
      extractTags(service).forEach((tag) => {
        const key = normalizeTag(tag);
        if (!tagMap.has(key)) {
          tagMap.set(key, tag);
        }
      });
    });

    return Array.from(tagMap.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label, locale));
  }, [services, locale]);

  useEffect(() => {
    setSelectedTags((previous) =>
      previous.filter((tag) => availableTags.some(({ key }) => key === tag)),
    );
  }, [availableTags]);

  const filteredServices = useMemo(() => {
    if (selectedTags.length === 0) {
      return services;
    }

    return services.filter((service) => {
      const tags = extractTags(service).map((tag) => normalizeTag(tag));
      return selectedTags.some((selected) => tags.includes(selected));
    });
  }, [services, selectedTags]);

  const statusMessage = useMemo(() => {
    if (servicesQuery.isLoading && !servicesQuery.data) {
      return statusT('loading');
    }

    if (servicesQuery.isError) {
      return statusT('error');
    }

    if (filteredServices.length === 0) {
      return statusT('empty');
    }

    return statusT('count', { count: filteredServices.length });
  }, [
    servicesQuery.isLoading,
    servicesQuery.data,
    servicesQuery.isError,
    filteredServices,
    statusT,
  ]);

  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [locale],
  );

  const cacheMetadata = servicesQuery.data?.cache;
  const cacheMinutes = cacheMetadata
    ? Math.max(1, Math.round(cacheMetadata.ttlSeconds / 60))
    : null;
  const cacheTimestamp = cacheMetadata
    ? dateTimeFormatter.format(new Date(cacheMetadata.generatedAt))
    : null;

  const isRtl = locale.startsWith('ar');
  const totalCategoryTabs = categories.length + 1;

  categoryButtonsRef.current.length = totalCategoryTabs;

  const handleCategoryKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (totalCategoryTabs === 0) return;

    const focusAt = (targetIndex: number) => {
      const button = categoryButtonsRef.current[targetIndex];
      if (button) {
        button.focus();
      }
    };

    switch (event.key) {
      case 'ArrowRight': {
        event.preventDefault();
        const nextIndex = isRtl
          ? (index - 1 + totalCategoryTabs) % totalCategoryTabs
          : (index + 1) % totalCategoryTabs;
        focusAt(nextIndex);
        break;
      }
      case 'ArrowLeft': {
        event.preventDefault();
        const previousIndex = isRtl
          ? (index + 1) % totalCategoryTabs
          : (index - 1 + totalCategoryTabs) % totalCategoryTabs;
        focusAt(previousIndex);
        break;
      }
      case 'Home': {
        event.preventDefault();
        focusAt(0);
        break;
      }
      case 'End': {
        event.preventDefault();
        focusAt(totalCategoryTabs - 1);
        break;
      }
      default:
        break;
    }
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const toggleTag = (tagKey: string) => {
    setSelectedTags((previous) =>
      previous.includes(tagKey) ? previous.filter((tag) => tag !== tagKey) : [...previous, tagKey],
    );
  };

  const clearTags = () => setSelectedTags([]);

  const renderServiceCard = (service: ServiceItem) => {
    const title = service.translation?.name ?? service.slug;
    const summary =
      service.translation?.summary ??
      service.translation?.description ??
      service.category.translation?.description ??
      '';
    const categoryLabel = service.category.translation?.name ?? service.category.slug;
    const tags = extractTags(service);
    const durationMinutes = service.durationMinutes ?? 0;
    const priceValue = Number.parseFloat(service.price);
    const rawCurrency =
      typeof service.metadata?.currency === 'string' ? service.metadata.currency.trim() : undefined;
    const fallbackCurrency =
      rawCurrency && rawCurrency.length === 3 ? rawCurrency.toUpperCase() : 'EUR';

    let priceLabel = service.price;
    if (Number.isFinite(priceValue)) {
      try {
        priceLabel = new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: fallbackCurrency,
        }).format(priceValue);
      } catch (error) {
        priceLabel = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(
          priceValue,
        );
      }
    }

    return (
      <Card
        key={service.id}
        role="article"
        aria-labelledby={`${service.id}-title`}
        aria-describedby={`${service.id}-summary`}
        className="h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        tabIndex={0}
      >
        <CardHeader>
          <CardTitle id={`${service.id}-title`}>{title}</CardTitle>
          {summary ? (
            <Text id={`${service.id}-summary`} muted className="line-clamp-3 text-sm">
              {summary}
            </Text>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-wide text-foreground/60 rtl:space-x-reverse">
            <span>{cardsT('category', { category: categoryLabel })}</span>
            <span>
              {cardsT('duration', {
                count: durationMinutes,
              })}
            </span>
          </div>
          <p className="text-sm font-medium text-primary/80">
            {cardsT('price', { price: priceLabel })}
          </p>
          {tags.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                {cardsT('tagsLabel')}
              </p>
              <ul className="flex flex-wrap gap-2" role="list">
                {tags.map((tag) => (
                  <li key={tag}>
                    <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary/80">
                      {tag}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  };

  return (
    <Section className="space-y-10">
      <header className="space-y-4 text-left rtl:text-right">
        <Heading as="h1" size="lg">
          {heroT('title')}
        </Heading>
        <Text muted>{heroT('subtitle')}</Text>
      </header>

      <div className="flex flex-col gap-6">
        <div className="rounded-3xl border border-border/60 bg-background/80 p-6 shadow-soft backdrop-blur-sm">
          <div className="space-y-2">
            <label htmlFor={searchInputId} className="flex flex-col gap-2 text-sm font-medium">
              <span>{searchT('label')}</span>
              <Input
                id={searchInputId}
                type="search"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder={searchT('placeholder')}
                autoComplete="off"
                aria-controls={resultsListId}
              />
            </label>
            <Text className="text-xs text-foreground/60">{filtersT('heading')}</Text>
          </div>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex items-center gap-3 text-sm text-foreground/80">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border/60 text-primary focus:ring-primary"
                checked={activeOnly}
                onChange={(event) => setActiveOnly(event.target.checked)}
              />
              <span>{filtersT('activeOnly')}</span>
            </label>
            <div aria-live="polite" className="text-sm text-foreground/70">
              {isOffline ? (
                <span className="block text-amber-600">{statusT('offline')}</span>
              ) : null}
              <span>{statusMessage}</span>
            </div>
          </div>
          {availableTags.length > 0 ? (
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between gap-3 text-sm font-medium">
                <span>{filtersT('tagsHeading')}</span>
                {selectedTags.length > 0 ? (
                  <Button variant="ghost" size="sm" onClick={clearTags}>
                    {filtersT('clearTags')}
                  </Button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(({ key, label }) => {
                  const isSelected = selectedTags.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      className={cn(
                        'inline-flex items-center justify-center rounded-full border px-3 py-1 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border/70 bg-background text-foreground/80 hover:border-primary/40',
                      )}
                      onClick={() => toggleTag(key)}
                      aria-pressed={isSelected}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-foreground/60 rtl:text-right">
              <span>{categoriesT('label')}</span>
              {categoriesQuery.isFetching ? <Spinner size="sm" /> : null}
            </div>
            {cacheMetadata ? (
              <div className="text-xs text-foreground/60">
                {cacheMinutes !== null ? (
                  <p>{cacheT('description', { minutes: cacheMinutes })}</p>
                ) : null}
                {cacheTimestamp ? <p>{cacheT('updated', { timestamp: cacheTimestamp })}</p> : null}
              </div>
            ) : null}
          </div>
          <nav aria-label={categoriesT('ariaLabel')} className="overflow-x-auto">
            <ul role="tablist" aria-orientation="horizontal" className="flex min-w-full gap-2 pb-1">
              <li>
                <Button
                  ref={(element) => {
                    categoryButtonsRef.current[0] = element;
                  }}
                  variant="secondary"
                  size="sm"
                  role="tab"
                  aria-selected={selectedCategoryId === null}
                  aria-controls={resultsListId}
                  isActive={selectedCategoryId === null}
                  onClick={() => setSelectedCategoryId(null)}
                  onKeyDown={(event) => handleCategoryKeyDown(event, 0)}
                >
                  {categoriesT('all')}
                </Button>
              </li>
              {categories.length === 0 && !categoriesQuery.isLoading ? (
                <li className="self-center text-sm text-foreground/60">{categoriesT('empty')}</li>
              ) : null}
              {categories.map((category, index) => {
                const buttonIndex = index + 1;
                const label = category.translation?.name ?? category.slug;
                const isSelected = category.id === selectedCategoryId;

                return (
                  <li key={category.id}>
                    <Button
                      ref={(element) => {
                        categoryButtonsRef.current[buttonIndex] = element;
                      }}
                      variant="secondary"
                      size="sm"
                      role="tab"
                      aria-selected={isSelected}
                      aria-controls={resultsListId}
                      isActive={isSelected}
                      onClick={() => setSelectedCategoryId(category.id)}
                      onKeyDown={(event) => handleCategoryKeyDown(event, buttonIndex)}
                      className="whitespace-nowrap"
                    >
                      {label}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </nav>
          {categoriesQuery.isError ? (
            <Text className="text-sm text-red-500">{categoriesT('error')}</Text>
          ) : null}
        </div>
      </div>

      <section aria-labelledby={resultsHeadingId} className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Heading as="h2" id={resultsHeadingId} size="md">
            {heroT('resultsTitle')}
          </Heading>
          <div aria-live="polite" className="text-sm text-foreground/70">
            {servicesQuery.isFetching && servicesQuery.data ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span>{statusT('loading')}</span>
              </div>
            ) : (
              statusMessage
            )}
          </div>
        </div>

        {servicesQuery.isLoading && !servicesQuery.data ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <Spinner size="lg" />
            <Text muted>{statusT('loading')}</Text>
          </div>
        ) : null}

        {servicesQuery.isError ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-red-200 bg-red-50/60 p-6 text-center text-red-700">
            <Text>{statusT('error')}</Text>
            <Button variant="secondary" size="sm" onClick={() => servicesQuery.refetch()}>
              {actionsT('retry')}
            </Button>
          </div>
        ) : null}

        {!servicesQuery.isLoading && !servicesQuery.isError ? (
          filteredServices.length > 0 ? (
            <ul
              id={resultsListId}
              role="list"
              aria-label={a11yT('serviceList')}
              className="grid gap-6 sm:grid-cols-2"
            >
              {filteredServices.map((service) => (
                <li key={service.id} className="h-full">
                  {renderServiceCard(service)}
                </li>
              ))}
            </ul>
          ) : (
            <div
              id={resultsListId}
              role="status"
              aria-live="polite"
              className="rounded-3xl border border-dashed border-border/70 bg-muted/40 p-10 text-center text-sm text-foreground/70"
            >
              {statusT('empty')}
            </div>
          )
        ) : null}
      </section>
    </Section>
  );
}
