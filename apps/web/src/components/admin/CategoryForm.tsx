'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supportedLocales } from '@/i18n/config';
import type { AdminServiceCategoryFormData, CategoryTranslationInput } from '@/types/admin';
import type { ServiceCategory } from '@/types';

interface CategoryFormProps {
  initialData?: ServiceCategory;
  onSubmit: (data: AdminServiceCategoryFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function CategoryForm({ initialData, onSubmit, onCancel, isSubmitting }: CategoryFormProps) {
  const t = useTranslations('Admin.Categories.form');
  const commonT = useTranslations('Common');

  const prepareTranslations = useMemo(() => {
    const byLocale = new Map<string, CategoryTranslationInput>();

    if (initialData?.translations) {
      initialData.translations.forEach((translation) => {
        byLocale.set(translation.locale, {
          locale: translation.locale,
          name: translation.name ?? '',
          description: translation.description ?? '',
          metadata: translation.metadata ?? undefined,
        });
      });
    }

    return supportedLocales.map<CategoryTranslationInput>((locale) => {
      return (
        byLocale.get(locale) ?? {
          locale,
          name: '',
          description: '',
        }
      );
    });
  }, [initialData?.translations]);

  const [slug, setSlug] = useState(initialData?.slug ?? '');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [translations, setTranslations] = useState<CategoryTranslationInput[]>(prepareTranslations);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setSlug(initialData?.slug ?? '');
    setIsActive(initialData?.isActive ?? true);
  }, [initialData?.slug, initialData?.isActive]);

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

    translations.forEach((tr, index) => {
      if (!tr.name.trim()) {
        newErrors[`translation-${index}-name`] = t('errors.nameRequired');
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const formData: AdminServiceCategoryFormData = {
      slug,
      isActive,
      translations: translations.filter((tr) => tr.name.trim()),
    };

    await onSubmit(formData);
  };

  const updateTranslation = (
    index: number,
    field: keyof CategoryTranslationInput,
    value: string,
  ) => {
    setTranslations((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="slug" required>
          {t('slug.label')}
        </Label>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder={t('slug.placeholder')}
          disabled={isSubmitting || !!initialData}
          error={!!errors.slug}
        />
        {errors.slug && <p className="mt-1 text-sm text-red-500">{errors.slug}</p>}
        <p className="mt-1 text-xs text-foreground/60">{t('slug.hint')}</p>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="isActive"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          disabled={isSubmitting}
        />
        <Label htmlFor="isActive" className="mb-0 cursor-pointer">
          {t('isActive.label')}
        </Label>
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-foreground">{t('translations.heading')}</h3>

        {translations.map((translation, index) => (
          <div key={index} className="space-y-3 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-foreground/70">
                {translation.locale === 'fr'
                  ? 'Français'
                  : translation.locale === 'ar'
                    ? 'العربية'
                    : translation.locale}
              </span>
            </div>

            <div>
              <Label htmlFor={`translation-${index}-name`} required>
                {t('translations.name.label')}
              </Label>
              <Input
                id={`translation-${index}-name`}
                value={translation.name}
                onChange={(e) => updateTranslation(index, 'name', e.target.value)}
                placeholder={t('translations.name.placeholder')}
                disabled={isSubmitting}
                error={!!errors[`translation-${index}-name`]}
              />
              {errors[`translation-${index}-name`] && (
                <p className="mt-1 text-sm text-red-500">{errors[`translation-${index}-name`]}</p>
              )}
            </div>

            <div>
              <Label htmlFor={`translation-${index}-description`}>
                {t('translations.description.label')}
              </Label>
              <Textarea
                id={`translation-${index}-description`}
                value={translation.description ?? ''}
                onChange={(e) => updateTranslation(index, 'description', e.target.value)}
                placeholder={t('translations.description.placeholder')}
                disabled={isSubmitting}
                rows={3}
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
