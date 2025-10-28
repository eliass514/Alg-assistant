'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supportedLocales } from '@/i18n/config';
import type { ServiceCategory, ServiceItem } from '@/types';
import type { AdminServiceFormData, ServiceTranslationInput } from '@/types/admin';

interface ServiceFormProps {
  categories: ServiceCategory[];
  initialData?: ServiceItem;
  onSubmit: (data: AdminServiceFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function ServiceForm({
  categories,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}: ServiceFormProps) {
  const t = useTranslations('Admin.Services.form');
  const commonT = useTranslations('Common');

  const categoryOptions = useMemo(() => {
    return categories.map((category) => ({
      id: category.id,
      label: category.translation?.name ?? category.slug,
    }));
  }, [categories]);

  const prepareTranslations = useMemo(() => {
    const byLocale = new Map<string, ServiceTranslationInput>();

    if (initialData?.translations) {
      initialData.translations.forEach((translation) => {
        byLocale.set(translation.locale, {
          locale: translation.locale,
          name: translation.name ?? '',
          summary: translation.summary ?? '',
          description: translation.description ?? '',
          metadata: translation.metadata ?? undefined,
        });
      });
    }

    return supportedLocales.map<ServiceTranslationInput>((locale) => {
      return (
        byLocale.get(locale) ?? {
          locale,
          name: '',
          summary: '',
          description: '',
        }
      );
    });
  }, [initialData?.translations]);

  const [slug, setSlug] = useState(initialData?.slug ?? '');
  const [categoryId, setCategoryId] = useState(initialData?.category.id ?? '');
  const [durationMinutes, setDurationMinutes] = useState(() =>
    initialData ? String(initialData.durationMinutes) : '',
  );
  const [price, setPrice] = useState(initialData?.price ?? '');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [translations, setTranslations] = useState<ServiceTranslationInput[]>(prepareTranslations);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setSlug(initialData?.slug ?? '');
    setCategoryId(initialData?.category.id ?? '');
    setDurationMinutes(initialData ? String(initialData.durationMinutes) : '');
    setPrice(initialData?.price ?? '');
    setIsActive(initialData?.isActive ?? true);
  }, [
    initialData?.slug,
    initialData?.category.id,
    initialData?.durationMinutes,
    initialData?.price,
    initialData?.isActive,
  ]);

  useEffect(() => {
    setTranslations(prepareTranslations);
  }, [prepareTranslations]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!slug.trim()) {
      newErrors.slug = t('errors.slugRequired');
    } else if (!/^[a-z0-9-]+$/.test(slug)) {
      newErrors.slug = t('errors.slugInvalid');
    }

    if (!categoryId) {
      newErrors.categoryId = t('errors.categoryRequired');
    }

    const durationValue = Number(durationMinutes);
    if (!durationMinutes.trim()) {
      newErrors.durationMinutes = t('errors.durationRequired');
    } else if (!Number.isFinite(durationValue) || durationValue < 5 || durationValue > 480) {
      newErrors.durationMinutes = t('errors.durationInvalid');
    }

    if (!price.trim()) {
      newErrors.price = t('errors.priceRequired');
    } else if (!/^\d+(?:\.\d{1,2})?$/.test(price)) {
      newErrors.price = t('errors.priceInvalid');
    }

    translations.forEach((translation, index) => {
      if (!translation.name.trim()) {
        newErrors[`translation-${index}-name`] = t('errors.nameRequired');
      }
    });

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const updateTranslation = (
    index: number,
    field: keyof ServiceTranslationInput,
    value: string,
  ) => {
    setTranslations((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    const formData: AdminServiceFormData = {
      slug,
      categoryId,
      durationMinutes: Number(durationMinutes),
      price,
      isActive,
      translations: translations.filter((translation) => translation.name.trim()),
    };

    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="service-slug" required>
          {t('slug.label')}
        </Label>
        <Input
          id="service-slug"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          placeholder={t('slug.placeholder')}
          disabled={isSubmitting || !!initialData}
          error={!!errors.slug}
        />
        {errors.slug && <p className="mt-1 text-sm text-red-500">{errors.slug}</p>}
        <p className="mt-1 text-xs text-foreground/60">{t('slug.hint')}</p>
      </div>

      <div>
        <Label htmlFor="service-category" required>
          {t('categoryId.label')}
        </Label>
        <Select
          id="service-category"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          disabled={isSubmitting}
          error={!!errors.categoryId}
        >
          <option value="" disabled>
            {t('categoryId.placeholder')}
          </option>
          {categoryOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
        {errors.categoryId && <p className="mt-1 text-sm text-red-500">{errors.categoryId}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="service-duration" required>
            {t('durationMinutes.label')}
          </Label>
          <Input
            id="service-duration"
            type="number"
            min={5}
            max={480}
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(event.target.value)}
            placeholder={t('durationMinutes.placeholder')}
            disabled={isSubmitting}
            error={!!errors.durationMinutes}
          />
          {errors.durationMinutes && (
            <p className="mt-1 text-sm text-red-500">{errors.durationMinutes}</p>
          )}
        </div>
        <div>
          <Label htmlFor="service-price" required>
            {t('price.label')}
          </Label>
          <Input
            id="service-price"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder={t('price.placeholder')}
            disabled={isSubmitting}
            error={!!errors.price}
          />
          <p className="mt-1 text-xs text-foreground/60">{t('price.hint')}</p>
          {errors.price && <p className="mt-1 text-sm text-red-500">{errors.price}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="service-active"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          disabled={isSubmitting}
        />
        <Label htmlFor="service-active" className="mb-0">
          {t('isActive.label')}
        </Label>
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-foreground">{t('translations.heading')}</h3>

        {translations.map((translation, index) => (
          <div key={translation.locale} className="space-y-3 rounded-lg border border-border p-4">
            <div className="text-xs font-semibold uppercase text-foreground/70">
              {translation.locale === 'fr'
                ? 'Français'
                : translation.locale === 'ar'
                  ? 'العربية'
                  : translation.locale}
            </div>
            <div>
              <Label htmlFor={`translation-${index}-name`} required>
                {t('translations.name.label')}
              </Label>
              <Input
                id={`translation-${index}-name`}
                value={translation.name}
                onChange={(event) => updateTranslation(index, 'name', event.target.value)}
                placeholder={t('translations.name.placeholder')}
                disabled={isSubmitting}
                error={!!errors[`translation-${index}-name`]}
              />
              {errors[`translation-${index}-name`] && (
                <p className="mt-1 text-sm text-red-500">{errors[`translation-${index}-name`]}</p>
              )}
            </div>
            <div>
              <Label htmlFor={`translation-${index}-summary`}>
                {t('translations.summary.label')}
              </Label>
              <Input
                id={`translation-${index}-summary`}
                value={translation.summary ?? ''}
                onChange={(event) => updateTranslation(index, 'summary', event.target.value)}
                placeholder={t('translations.summary.placeholder')}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor={`translation-${index}-description`}>
                {t('translations.description.label')}
              </Label>
              <Textarea
                id={`translation-${index}-description`}
                value={translation.description ?? ''}
                onChange={(event) => updateTranslation(index, 'description', event.target.value)}
                placeholder={t('translations.description.placeholder')}
                rows={4}
                disabled={isSubmitting}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          {commonT('actions.cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? commonT('actions.saving')
            : initialData
              ? commonT('actions.update')
              : commonT('actions.create')}
        </Button>
      </div>
    </form>
  );
}
