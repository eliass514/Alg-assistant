'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select';
import { supportedLocales } from '@/i18n/config';
import type { ServiceItem } from '@/types';
import type {
  AdminDocumentTemplateFormData,
  DocumentTemplate,
  TemplateServiceAssignment,
} from '@/types/admin';

interface DocumentTemplateFormProps {
  services: ServiceItem[];
  initialData?: DocumentTemplate;
  onSubmit: (data: AdminDocumentTemplateFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function DocumentTemplateForm({
  services,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}: DocumentTemplateFormProps) {
  const t = useTranslations('Admin.DocumentTemplates.form');
  const commonT = useTranslations('Common');

  const [slug, setSlug] = useState(initialData?.slug ?? '');
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [defaultLocale, setDefaultLocale] = useState(initialData?.defaultLocale ?? 'en');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [metadataInput, setMetadataInput] = useState(() =>
    initialData?.metadata ? JSON.stringify(initialData.metadata, null, 2) : '',
  );
  const [selectedServices, setSelectedServices] = useState<TemplateServiceAssignment[]>(
    initialData?.services?.map((s) => ({
      serviceId: s.serviceId,
      isRequired: s.isRequired,
      autoApply: s.autoApply,
      validFrom: s.validFrom,
      validTo: s.validTo,
    })) ?? [],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const localeOptions = useMemo(() => {
    return supportedLocales.map((locale) => ({
      value: locale,
      label:
        locale === 'fr' ? 'Français' : locale === 'ar' ? 'العربية' : (locale?.toUpperCase() ?? ''),
    }));
  }, []);

  useEffect(() => {
    setSlug(initialData?.slug ?? '');
    setName(initialData?.name ?? '');
    setDescription(initialData?.description ?? '');
    setDefaultLocale(initialData?.defaultLocale ?? 'en');
    setIsActive(initialData?.isActive ?? true);
    setMetadataInput(initialData?.metadata ? JSON.stringify(initialData.metadata, null, 2) : '');
    setSelectedServices(
      initialData?.services?.map((s) => ({
        serviceId: s.serviceId,
        isRequired: s.isRequired,
        autoApply: s.autoApply,
        validFrom: s.validFrom,
        validTo: s.validTo,
      })) ?? [],
    );
  }, [
    initialData?.slug,
    initialData?.name,
    initialData?.description,
    initialData?.defaultLocale,
    initialData?.isActive,
    initialData?.metadata,
    initialData?.services,
  ]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!slug.trim()) {
      newErrors.slug = t('errors.slugRequired');
    } else if (!/^[a-z0-9-]+$/.test(slug)) {
      newErrors.slug = t('errors.slugInvalid');
    }

    if (!name.trim()) {
      newErrors.name = t('errors.nameRequired');
    }

    if (metadataInput.trim()) {
      try {
        JSON.parse(metadataInput);
      } catch (error) {
        newErrors.metadata = t('errors.metadataInvalid');
      }
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleAddService = (serviceId: string) => {
    if (!selectedServices.find((s) => s.serviceId === serviceId)) {
      setSelectedServices([
        ...selectedServices,
        {
          serviceId,
          isRequired: false,
          autoApply: false,
        },
      ]);
    }
  };

  const handleRemoveService = (serviceId: string) => {
    setSelectedServices(selectedServices.filter((s) => s.serviceId !== serviceId));
  };

  const handleUpdateServiceAssignment = (
    serviceId: string,
    field: keyof TemplateServiceAssignment,
    value: boolean | string | undefined,
  ) => {
    setSelectedServices((prev) =>
      prev.map((assignment) =>
        assignment.serviceId === serviceId ? { ...assignment, [field]: value } : assignment,
      ),
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    let metadata: Record<string, unknown> | undefined;

    if (metadataInput.trim()) {
      metadata = JSON.parse(metadataInput) as Record<string, unknown>;
    }

    const formData: AdminDocumentTemplateFormData = {
      slug,
      name,
      description: description || undefined,
      defaultLocale,
      isActive,
      metadata,
      services: selectedServices.length > 0 ? selectedServices : undefined,
    };

    await onSubmit(formData);
  };

  const availableServices = services.filter(
    (service) => !selectedServices.find((s) => s.serviceId === service.id),
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="template-slug" required>
          {t('slug.label')}
        </Label>
        <Input
          id="template-slug"
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
        <Label htmlFor="template-name" required>
          {t('name.label')}
        </Label>
        <Input
          id="template-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('name.placeholder')}
          disabled={isSubmitting}
          error={!!errors.name}
        />
        {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
      </div>

      <div>
        <Label htmlFor="template-description">{t('description.label')}</Label>
        <Textarea
          id="template-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t('description.placeholder')}
          rows={3}
          disabled={isSubmitting}
        />
      </div>

      <div>
        <Label htmlFor="template-locale">{t('defaultLocale.label')}</Label>
        <Select
          id="template-locale"
          value={defaultLocale}
          onChange={(event) => setDefaultLocale(event.target.value)}
          disabled={isSubmitting}
        >
          {localeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="template-metadata">{t('metadata.label')}</Label>
        <Textarea
          id="template-metadata"
          value={metadataInput}
          onChange={(event) => setMetadataInput(event.target.value)}
          placeholder={t('metadata.placeholder')}
          rows={4}
          disabled={isSubmitting}
          className={
            errors.metadata ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
          }
        />
        {errors.metadata && <p className="mt-1 text-sm text-red-500">{errors.metadata}</p>}
        <p className="mt-1 text-xs text-foreground/60">{t('metadata.hint')}</p>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="template-active"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          disabled={isSubmitting}
        />
        <Label htmlFor="template-active" className="mb-0">
          {t('isActive.label')}
        </Label>
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-foreground">{t('services.heading')}</h3>
        <p className="text-xs text-foreground/60">{t('services.description')}</p>

        <div>
          <Label htmlFor="add-service">{t('services.addLabel')}</Label>
          <div className="flex gap-2">
            <Select
              id="add-service"
              defaultValue=""
              onChange={(event) => {
                const serviceId = event.target.value;
                if (serviceId) {
                  handleAddService(serviceId);
                  event.target.value = '';
                }
              }}
              disabled={isSubmitting || availableServices.length === 0}
            >
              <option value="" disabled>
                {t('services.selectPlaceholder')}
              </option>
              {availableServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.translation?.name || service.slug}
                </option>
              ))}
            </Select>
          </div>
          {availableServices.length === 0 && (
            <p className="mt-1 text-xs text-foreground/50">{t('services.noMore')}</p>
          )}
        </div>

        {selectedServices.length > 0 ? (
          <div className="space-y-3">
            {selectedServices.map((assignment) => {
              const service = services.find((s) => s.id === assignment.serviceId);
              return (
                <div key={assignment.serviceId} className="rounded-lg border border-border p-4">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <div className="font-medium">
                        {service?.translation?.name || assignment.serviceId}
                      </div>
                      <code className="text-xs text-foreground/50">{service?.slug}</code>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveService(assignment.serviceId)}
                      disabled={isSubmitting}
                    >
                      {t('services.remove')}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`service-${assignment.serviceId}-required`}
                        checked={assignment.isRequired ?? false}
                        onChange={(event) =>
                          handleUpdateServiceAssignment(
                            assignment.serviceId,
                            'isRequired',
                            event.target.checked,
                          )
                        }
                        disabled={isSubmitting}
                      />
                      <Label
                        htmlFor={`service-${assignment.serviceId}-required`}
                        className="mb-0 text-sm"
                      >
                        {t('services.isRequired')}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`service-${assignment.serviceId}-autoapply`}
                        checked={assignment.autoApply ?? false}
                        onChange={(event) =>
                          handleUpdateServiceAssignment(
                            assignment.serviceId,
                            'autoApply',
                            event.target.checked,
                          )
                        }
                        disabled={isSubmitting}
                      />
                      <Label
                        htmlFor={`service-${assignment.serviceId}-autoapply`}
                        className="mb-0 text-sm"
                      >
                        {t('services.autoApply')}
                      </Label>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <Label
                          htmlFor={`service-${assignment.serviceId}-validfrom`}
                          className="text-xs"
                        >
                          {t('services.validFrom')}
                        </Label>
                        <Input
                          id={`service-${assignment.serviceId}-validfrom`}
                          type="date"
                          value={assignment.validFrom || ''}
                          onChange={(event) =>
                            handleUpdateServiceAssignment(
                              assignment.serviceId,
                              'validFrom',
                              event.target.value || undefined,
                            )
                          }
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor={`service-${assignment.serviceId}-validto`}
                          className="text-xs"
                        >
                          {t('services.validTo')}
                        </Label>
                        <Input
                          id={`service-${assignment.serviceId}-validto`}
                          type="date"
                          value={assignment.validTo || ''}
                          onChange={(event) =>
                            handleUpdateServiceAssignment(
                              assignment.serviceId,
                              'validTo',
                              event.target.value || undefined,
                            )
                          }
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-foreground/60">{t('services.empty')}</p>
        )}
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
