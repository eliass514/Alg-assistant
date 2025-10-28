'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Heading, Text } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

type DocumentFieldType = 'text' | 'textarea' | 'date' | 'select' | 'number';

type ProcessingStatus = 'idle' | 'encrypting' | 'uploading' | 'verifying' | 'success' | 'error';

type FieldOption = {
  value: string;
  label: string;
};

interface DocumentFieldDefinition {
  id: string;
  type: DocumentFieldType;
  required?: boolean;
}

interface DocumentField extends DocumentFieldDefinition {
  label: string;
  placeholder?: string;
  helper?: string;
  options?: FieldOption[];
}

interface DocumentTemplateBlueprint {
  id: TemplateIdentifier;
  icon: string;
  complexity: 'basic' | 'intermediate' | 'advanced';
  fieldDefinitions: DocumentFieldDefinition[];
  sampleValues: Record<string, string>;
}

interface DocumentTemplate extends Omit<DocumentTemplateBlueprint, 'fieldDefinitions'> {
  title: string;
  description: string;
  category: string;
  estimatedTime: string;
  complexityLabel: string;
  fields: DocumentField[];
  guidance: string[];
  verificationChecks: string[];
  previewTitle: string;
  previewSections: string[];
  chatbotPrompts: string[];
}

interface ChatMessage {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
  timestamp: number;
}

type TemplateIdentifier = 'employmentVerification' | 'residencyAttestation' | 'bankReferenceLetter';

const TEMPLATE_BLUEPRINTS: DocumentTemplateBlueprint[] = [
  {
    id: 'employmentVerification',
    icon: '💼',
    complexity: 'advanced',
    fieldDefinitions: [
      { id: 'fullName', type: 'text', required: true },
      { id: 'nationalId', type: 'text', required: true },
      { id: 'employerName', type: 'text', required: true },
      { id: 'jobTitle', type: 'text', required: true },
      { id: 'employmentStatus', type: 'select', required: true },
      { id: 'startDate', type: 'date', required: true },
      { id: 'monthlySalary', type: 'number' },
      { id: 'verifierContact', type: 'text' },
      { id: 'notes', type: 'textarea' },
    ],
    sampleValues: {
      fullName: 'Nadia Benali',
      nationalId: 'DZ-19860512-4521',
      employerName: 'Sahara Logistics SARL',
      jobTitle: 'Responsable des opérations',
      employmentStatus: 'fullTime',
      startDate: '2018-09-15',
      monthlySalary: '240000',
      verifierContact: '+213 770 123 456',
      notes: 'Employée exemplaire, disponible pour missions longue durée.',
    },
  },
  {
    id: 'residencyAttestation',
    icon: '🏠',
    complexity: 'intermediate',
    fieldDefinitions: [
      { id: 'occupantName', type: 'text', required: true },
      { id: 'propertyAddress', type: 'textarea', required: true },
      { id: 'occupancyStart', type: 'date', required: true },
      { id: 'proofType', type: 'select', required: true },
      { id: 'ownerName', type: 'text' },
      { id: 'municipality', type: 'text' },
      { id: 'contactNumber', type: 'text' },
      { id: 'residencyNotes', type: 'textarea' },
    ],
    sampleValues: {
      occupantName: 'Youssef Allam',
      propertyAddress: '45, Rue Emir Abdelkader, Alger',
      occupancyStart: '2021-01-10',
      proofType: 'utilityBill',
      ownerName: 'Samira Bensaïd',
      municipality: 'Sidi Mhamed',
      contactNumber: '+213 661 555 210',
      residencyNotes: 'Le résident partage le logement avec sa famille proche.',
    },
  },
  {
    id: 'bankReferenceLetter',
    icon: '🏦',
    complexity: 'basic',
    fieldDefinitions: [
      { id: 'accountHolder', type: 'text', required: true },
      { id: 'bankName', type: 'text', required: true },
      { id: 'accountNumber', type: 'text', required: true },
      { id: 'iban', type: 'text' },
      { id: 'monthlyTurnover', type: 'number' },
      { id: 'referencePurpose', type: 'select', required: true },
      { id: 'bankOfficer', type: 'text' },
      { id: 'bankNotes', type: 'textarea' },
    ],
    sampleValues: {
      accountHolder: 'Entreprise Atlas Export',
      bankName: 'Banque Nationale d’Algérie',
      accountNumber: '001 234 567 890',
      iban: 'DZ58001001001234567890',
      monthlyTurnover: '3200000',
      referencePurpose: 'tenderSubmission',
      bankOfficer: 'Mme. Lila Aït Saïd',
      bankNotes: 'Client fiable avec des opérations régulières à l’international.',
    },
  },
];

export function DocumentWorkspacePage() {
  const t = useTranslations('Documents');

  const templates = useMemo<DocumentTemplate[]>(() => {
    return TEMPLATE_BLUEPRINTS.map((blueprint) => {
      const baseKey = `templates.items.${blueprint.id}` as const;
      const fields: DocumentField[] = blueprint.fieldDefinitions.map((definition) => {
        const fieldKey = `${baseKey}.fields.${definition.id}` as const;
        const options =
          definition.type === 'select'
            ? ((t.raw(`${fieldKey}.options`) as FieldOption[] | undefined) ?? [])
            : undefined;

        return {
          ...definition,
          label: t(`${fieldKey}.label`),
          placeholder: safeTranslateOptional(t.raw(`${fieldKey}.placeholder`)),
          helper: safeTranslateOptional(t.raw(`${fieldKey}.helper`)),
          options,
        } satisfies DocumentField;
      });

      return {
        id: blueprint.id,
        icon: blueprint.icon,
        complexity: blueprint.complexity,
        sampleValues: blueprint.sampleValues,
        title: t(`${baseKey}.title`),
        description: t(`${baseKey}.description`),
        category: t(`${baseKey}.category`),
        estimatedTime: t(`${baseKey}.estimatedTime`),
        complexityLabel: t(`templates.complexityLabels.${blueprint.complexity}`),
        fields,
        guidance: (t.raw(`${baseKey}.guidance`) as string[] | undefined) ?? [],
        verificationChecks: (t.raw(`${baseKey}.verificationChecks`) as string[] | undefined) ?? [],
        previewTitle: t(`${baseKey}.preview.title`),
        previewSections: (t.raw(`${baseKey}.preview.sections`) as string[] | undefined) ?? [],
        chatbotPrompts: (t.raw(`${baseKey}.chatbotPrompts`) as string[] | undefined) ?? [],
      } satisfies DocumentTemplate;
    });
  }, [t]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<TemplateIdentifier | null>(
    templates[0]?.id ?? null,
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatOpen, setChatOpen] = useState(false);

  const selectedTemplate = useMemo(() => {
    return templates.find((template) => template.id === selectedTemplateId) ?? null;
  }, [templates, selectedTemplateId]);

  useEffect(() => {
    if (!selectedTemplateId && templates.length > 0) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [templates, selectedTemplateId]);

  useEffect(() => {
    setChatMessages([createAssistantMessage(t('chatbot.messages.welcome'))]);
  }, [t]);

  useEffect(() => {
    if (!selectedTemplate) {
      setFormValues({});
      setTouchedFields({});
      return;
    }

    setFormValues((current) => {
      const next: Record<string, string> = {};
      for (const field of selectedTemplate.fields) {
        next[field.id] = current[field.id] ?? '';
      }
      return next;
    });
    setTouchedFields({});

    setChatMessages((previous) => [
      ...previous,
      createAssistantMessage(
        t('chatbot.messages.templateSelected', { template: selectedTemplate.title }),
      ),
    ]);
  }, [selectedTemplate, t]);

  const categories = useMemo(() => {
    const unique = new Set<string>();
    templates.forEach((template) => {
      unique.add(template.category);
    });
    return Array.from(unique);
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesCategory =
        categoryFilter === 'all' || template.category.toLowerCase() === categoryFilter;
      const term = searchTerm.trim().toLowerCase();
      if (!matchesCategory) {
        return false;
      }
      if (!term) {
        return true;
      }
      return (
        template.title.toLowerCase().includes(term) ||
        template.description.toLowerCase().includes(term) ||
        template.category.toLowerCase().includes(term)
      );
    });
  }, [templates, searchTerm, categoryFilter]);

  const fieldErrors = useMemo(() => {
    if (!selectedTemplate) {
      return {} as Record<string, string>;
    }

    return selectedTemplate.fields.reduce<Record<string, string>>((errors, field) => {
      if (field.required && !formValues[field.id]?.trim()) {
        errors[field.id] = t('form.errors.required');
      }
      return errors;
    }, {});
  }, [selectedTemplate, formValues, t]);

  const displayedErrors = useMemo(() => {
    if (!selectedTemplate) {
      return {} as Record<string, string>;
    }

    return selectedTemplate.fields.reduce<Record<string, string>>((errors, field) => {
      if (touchedFields[field.id] && fieldErrors[field.id]) {
        errors[field.id] = fieldErrors[field.id];
      }
      return errors;
    }, {});
  }, [selectedTemplate, touchedFields, fieldErrors]);

  const missingRequiredLabels = useMemo(() => {
    if (!selectedTemplate) {
      return [] as string[];
    }

    return selectedTemplate.fields
      .filter((field) => field.required && !formValues[field.id]?.trim())
      .map((field) => field.label);
  }, [selectedTemplate, formValues]);

  const previewPlaceholder = safeTranslateOptional(t.raw('preview.placeholder')) ?? '—';

  const activePrompts = selectedTemplate?.chatbotPrompts ?? [];

  const handleTemplateSelect = (templateId: TemplateIdentifier) => {
    setSelectedTemplateId(templateId);
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    setFormValues((previous) => ({
      ...previous,
      [fieldId]: value,
    }));
  };

  const handleFieldBlur = (fieldId: string) => {
    setTouchedFields((previous) => ({
      ...previous,
      [fieldId]: true,
    }));
  };

  const handlePromptSelect = (prompt: string) => {
    setChatMessages((previous) => [
      ...previous,
      createUserMessage(prompt),
      createAssistantMessage(t('chatbot.messages.promptResponse', { prompt })),
    ]);
    setChatOpen(true);
  };

  const handleApplySampleData = () => {
    if (!selectedTemplate) {
      return;
    }

    setFormValues((previous) => {
      const next = { ...previous };
      Object.entries(selectedTemplate.sampleValues).forEach(([key, value]) => {
        next[key] = value;
      });
      return next;
    });
    setTouchedFields({});
    setChatMessages((previous) => [
      ...previous,
      createUserMessage(t('chatbot.actions.applySample')),
      createAssistantMessage(t('chatbot.messages.appliedSample')),
    ]);
    setChatOpen(true);
  };

  return (
    <div className="space-y-14">
      <header className="space-y-4">
        <Heading as="h1" size="lg">
          {t('hero.title')}
        </Heading>
        <Text className="max-w-3xl text-foreground/80">{t('hero.subtitle')}</Text>
        <Text muted className="max-w-3xl text-sm text-foreground/70">
          {t('hero.supporting')}
        </Text>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <TemplateDashboard
          templates={filteredTemplates}
          allTemplatesCount={templates.length}
          selectedTemplateId={selectedTemplate?.id ?? null}
          categories={categories}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onTemplateSelect={handleTemplateSelect}
          strings={{
            heading: t('templates.heading'),
            supporting: t('templates.supporting'),
            searchLabel: t('templates.searchLabel'),
            searchPlaceholder: t('templates.searchPlaceholder'),
            categoriesLabel: t('templates.categoriesLabel'),
            categoryAll: t('templates.categoryAll'),
            clearFilters: t('templates.clearFilters'),
            empty: t('templates.empty'),
            estimatedLabel: t('templates.badges.estimated'),
            complexityLabel: t('templates.badges.complexity'),
          }}
        />

        <div className="space-y-6">
          <DynamicForm
            template={selectedTemplate}
            values={formValues}
            errors={displayedErrors}
            onChange={handleFieldChange}
            onBlur={handleFieldBlur}
            strings={{
              heading: t('form.heading'),
              description: selectedTemplate
                ? t('form.description', { template: selectedTemplate.title })
                : t('form.empty'),
              optional: t('form.optional'),
              empty: t('form.empty'),
            }}
          />

          <DocumentPreviewPanel
            template={selectedTemplate}
            values={formValues}
            missingFields={missingRequiredLabels}
            placeholder={previewPlaceholder}
            strings={{
              heading: t('preview.heading'),
              description: t('preview.description'),
              empty: t('preview.empty'),
              missingTitle: t('preview.missingTitle'),
              missingDescription: t('preview.missingDescription'),
              downloadLabel: t('preview.download'),
              documentLabel: t('preview.documentLabel'),
              missingCountLabel: t('preview.missingCountLabel', {
                count: missingRequiredLabels.length,
              }),
            }}
          />

          <DocumentGuidancePanel
            template={selectedTemplate}
            strings={{
              heading: t('guidance.heading'),
              empty: t('guidance.empty'),
              checklistTitle: t('guidance.checklistTitle'),
              verificationTitle: t('guidance.verificationTitle'),
            }}
          />

          <VerificationPanel
            template={selectedTemplate}
            strings={{
              heading: t('verification.heading'),
              description: t('verification.description'),
              acceptedTypes: t('verification.acceptedTypes'),
              maxSize: t('verification.maxSize'),
              encryptionLabel: t('verification.encryptionLabel'),
              encryptionDisclaimer: t('verification.encryptionDisclaimer'),
              fileLabel: t('verification.fileLabel'),
              status: {
                idle: t('verification.status.idle'),
                encrypting: t('verification.status.encrypting'),
                uploading: t('verification.status.uploading'),
                verifying: t('verification.status.verifying'),
                success: t('verification.status.success'),
                error: t('verification.status.error'),
              },
              validation: {
                type: t('verification.validation.type'),
                size: t('verification.validation.size'),
              },
              actions: {
                select: t('verification.actions.select'),
                change: t('verification.actions.change'),
                retry: t('verification.actions.retry'),
              },
            }}
          />
        </div>
      </div>

      <ChatbotAssistant
        open={chatOpen}
        onToggle={() => setChatOpen((value) => !value)}
        messages={chatMessages}
        prompts={activePrompts}
        onPromptSelect={handlePromptSelect}
        onApplySample={handleApplySampleData}
        templateTitle={selectedTemplate?.title}
        strings={{
          toggle: t('chatbot.toggle'),
          title: t('chatbot.title'),
          subtitle: t('chatbot.subtitle'),
          promptsTitle: t('chatbot.promptsTitle'),
          applySample: t('chatbot.actions.applySample'),
          empty: t('chatbot.empty'),
          assistantLabel: t('chatbot.roles.assistant'),
          userLabel: t('chatbot.roles.user'),
        }}
      />
    </div>
  );
}

interface TemplateDashboardProps {
  templates: DocumentTemplate[];
  allTemplatesCount: number;
  selectedTemplateId: TemplateIdentifier | null;
  categories: string[];
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onTemplateSelect: (templateId: TemplateIdentifier) => void;
  strings: {
    heading: string;
    supporting: string;
    searchLabel: string;
    searchPlaceholder: string;
    categoriesLabel: string;
    categoryAll: string;
    clearFilters: string;
    empty: string;
    estimatedLabel: string;
    complexityLabel: string;
  };
}

function TemplateDashboard({
  templates,
  allTemplatesCount,
  selectedTemplateId,
  categories,
  categoryFilter,
  onCategoryFilterChange,
  searchTerm,
  onSearchTermChange,
  onTemplateSelect,
  strings,
}: TemplateDashboardProps) {
  return (
    <Card className="space-y-6">
      <CardHeader className="space-y-3">
        <CardTitle>{strings.heading}</CardTitle>
        <Text muted className="text-sm text-foreground/70">
          {strings.supporting}
        </Text>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex-1">
            <span className="sr-only">{strings.searchLabel}</span>
            <Input
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              placeholder={strings.searchPlaceholder}
              aria-label={strings.searchLabel}
            />
          </label>
          <Button
            variant="ghost"
            onClick={() => {
              onSearchTermChange('');
              onCategoryFilterChange('all');
            }}
            className="justify-start sm:justify-center"
          >
            {strings.clearFilters}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            isActive={categoryFilter === 'all'}
            onClick={() => onCategoryFilterChange('all')}
          >
            {strings.categoryAll} ({allTemplatesCount})
          </Button>
          {categories.map((category) => {
            const normalized = category.toLowerCase();
            return (
              <Button
                key={category}
                variant="secondary"
                size="sm"
                isActive={categoryFilter === normalized}
                onClick={() => onCategoryFilterChange(normalized)}
              >
                {category}
              </Button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {templates.length === 0 ? (
          <EmptyState message={strings.empty} />
        ) : (
          <div className="grid gap-4">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => onTemplateSelect(template.id)}
                className={cn(
                  'group flex w-full flex-col rounded-3xl border border-border/70 bg-background/80 p-6 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/70 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  selectedTemplateId === template.id &&
                    'border-primary bg-primary/5 shadow-lg focus-visible:ring-primary',
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-1 flex-col gap-3">
                    <div className="flex items-center gap-3 text-2xl rtl:space-x-reverse">
                      <span aria-hidden>{template.icon}</span>
                      <span className="text-lg font-semibold text-foreground sm:text-xl">
                        {template.title}
                      </span>
                    </div>
                    <Text muted className="text-sm text-foreground/70">
                      {template.description}
                    </Text>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {strings.complexityLabel} {template.complexityLabel}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground/80">
                      {strings.estimatedLabel} {template.estimatedTime}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-foreground/60">
                  <span className="inline-flex items-center rounded-full border border-border/60 px-3 py-1">
                    {template.category}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface DynamicFormProps {
  template: DocumentTemplate | null;
  values: Record<string, string>;
  errors: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
  onBlur: (fieldId: string) => void;
  strings: {
    heading: string;
    description: string;
    optional: string;
    empty: string;
  };
}

function DynamicForm({ template, values, errors, onChange, onBlur, strings }: DynamicFormProps) {
  if (!template) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{strings.heading}</CardTitle>
          <Text muted>{strings.empty}</Text>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{strings.heading}</CardTitle>
        <Text muted>{strings.description}</Text>
      </CardHeader>
      <CardContent className="space-y-6">
        {template.fields.map((field) => {
          const value = values[field.id] ?? '';
          const error = errors[field.id];
          return (
            <div key={field.id} className="space-y-2">
              <div className="flex items-baseline justify-between gap-3 rtl:space-x-reverse">
                <label htmlFor={field.id} className="text-sm font-medium text-foreground">
                  {field.label}
                </label>
                {!field.required ? (
                  <span className="text-xs text-foreground/60">{strings.optional}</span>
                ) : null}
              </div>
              {renderField(
                field,
                value,
                (newValue) => onChange(field.id, newValue),
                () => onBlur(field.id),
              )}
              {field.helper ? <p className="text-xs text-foreground/60">{field.helper}</p> : null}
              {error ? <p className="text-xs text-red-500">{error}</p> : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

interface DocumentPreviewPanelProps {
  template: DocumentTemplate | null;
  values: Record<string, string>;
  missingFields: string[];
  placeholder: string;
  strings: {
    heading: string;
    description: string;
    empty: string;
    missingTitle: string;
    missingDescription: string;
    downloadLabel: string;
    documentLabel: string;
    missingCountLabel: string;
  };
}

function DocumentPreviewPanel({
  template,
  values,
  missingFields,
  placeholder,
  strings,
}: DocumentPreviewPanelProps) {
  if (!template) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{strings.heading}</CardTitle>
          <Text muted>{strings.empty}</Text>
        </CardHeader>
      </Card>
    );
  }

  const previewText = buildPreviewText(template, values, placeholder);

  const handleDownload = () => {
    const blob = new Blob([previewText], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${template.id}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{strings.heading}</CardTitle>
        <Text muted>{strings.description}</Text>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-muted/30 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground/80">
              {strings.documentLabel} {template.previewTitle}
            </span>
            <Button variant="secondary" size="sm" onClick={handleDownload}>
              {strings.downloadLabel}
            </Button>
          </div>
          <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-background/70 p-4 text-sm leading-6 text-foreground/80">
            {previewText}
          </pre>
        </div>
        {missingFields.length > 0 ? (
          <div className="rounded-2xl border border-amber-400/60 bg-amber-50/80 p-4 text-sm text-amber-900 dark:border-amber-300/40 dark:bg-amber-400/10 dark:text-amber-200">
            <p className="font-semibold">{strings.missingTitle}</p>
            <p className="text-xs text-foreground/70">{strings.missingDescription}</p>
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-100/90">
              {strings.missingCountLabel}
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
              {missingFields.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface DocumentGuidancePanelProps {
  template: DocumentTemplate | null;
  strings: {
    heading: string;
    empty: string;
    checklistTitle: string;
    verificationTitle: string;
  };
}

function DocumentGuidancePanel({ template, strings }: DocumentGuidancePanelProps) {
  if (!template) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{strings.heading}</CardTitle>
          <Text muted>{strings.empty}</Text>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{strings.heading}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-foreground/80">{strings.checklistTitle}</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-foreground/70">
            {template.guidance.map((item) => (
              <li key={item} className="flex items-start gap-2 rtl:space-x-reverse">
                <span className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-primary/70" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground/80">{strings.verificationTitle}</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-foreground/70">
            {template.verificationChecks.map((item) => (
              <li key={item} className="flex items-start gap-2 rtl:space-x-reverse">
                <span className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500/80" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

interface VerificationPanelProps {
  template: DocumentTemplate | null;
  strings: {
    heading: string;
    description: string;
    acceptedTypes: string;
    maxSize: string;
    encryptionLabel: string;
    encryptionDisclaimer: string;
    fileLabel: string;
    status: Record<ProcessingStatus, string>;
    validation: {
      type: string;
      size: string;
    };
    actions: {
      select: string;
      change: string;
      retry: string;
    };
  };
}

function VerificationPanel({ template, strings }: VerificationPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [encryptedDigest, setEncryptedDigest] = useState<string | null>(null);

  useEffect(() => {
    setStatus('idle');
    setProgress(0);
    setError(null);
    setFileName(null);
    setEncryptedDigest(null);
  }, [template?.id]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const validTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    const maxBytes = 10 * 1024 * 1024;

    if (!validTypes.includes(file.type)) {
      setError(strings.validation.type);
      setStatus('error');
      return;
    }

    if (file.size > maxBytes) {
      setError(strings.validation.size);
      setStatus('error');
      return;
    }

    setError(null);
    setFileName(file.name);
    setStatus('encrypting');
    setProgress(10);

    try {
      const digest = await encryptFile(file);
      setEncryptedDigest(digest);
      setStatus('uploading');
      setProgress(45);
      await delay(600);
      setStatus('verifying');
      setProgress(75);
      await delay(700);
      setStatus('success');
      setProgress(100);
    } catch (error_) {
      console.error(error_);
      setError(strings.status.error);
      setStatus('error');
    }
  };

  const handleTriggerFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    setStatus('idle');
    setProgress(0);
    setError(null);
    setFileName(null);
    setEncryptedDigest(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{strings.heading}</CardTitle>
        <Text muted>{strings.description}</Text>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-3 text-xs text-foreground/60">
          <span>{strings.acceptedTypes}</span>
          <span>•</span>
          <span>{strings.maxSize}</span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button onClick={handleTriggerFileDialog} variant="secondary">
            {fileName ? strings.actions.change : strings.actions.select}
          </Button>
          {status === 'error' ? (
            <Button onClick={handleReset} variant="ghost">
              {strings.actions.retry}
            </Button>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileChange}
            className="hidden"
          />
          {fileName ? (
            <span className="text-sm text-foreground/70">
              {strings.fileLabel} {fileName}
            </span>
          ) : null}
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-sm text-foreground/80">
            {status !== 'idle' ? (
              <Spinner size="sm" />
            ) : (
              <span className="inline-flex h-2 w-2 rounded-full bg-border/80" aria-hidden />
            )}
            <span>{strings.status[status]}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-border/60">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          {error ? <p className="text-xs text-red-500">{error}</p> : null}
        </div>
        {encryptedDigest ? (
          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 text-sm text-primary">
            <p className="font-semibold">{strings.encryptionLabel}</p>
            <p className="mt-1 break-all text-xs text-foreground/70">{encryptedDigest}</p>
            <p className="mt-2 text-xs text-foreground/60">{strings.encryptionDisclaimer}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface ChatbotAssistantProps {
  open: boolean;
  onToggle: () => void;
  messages: ChatMessage[];
  prompts: string[];
  onPromptSelect: (prompt: string) => void;
  onApplySample: () => void;
  templateTitle?: string;
  strings: {
    toggle: string;
    title: string;
    subtitle: string;
    promptsTitle: string;
    applySample: string;
    empty: string;
    assistantLabel: string;
    userLabel: string;
  };
}

function ChatbotAssistant({
  open,
  onToggle,
  messages,
  prompts,
  onPromptSelect,
  onApplySample,
  templateTitle,
  strings,
}: ChatbotAssistantProps) {
  return (
    <>
      <Button
        variant="primary"
        className="fixed bottom-6 right-4 z-40 inline-flex items-center gap-2 rounded-full shadow-lg rtl:right-auto rtl:left-4"
        onClick={onToggle}
      >
        <span aria-hidden>🤖</span>
        {strings.toggle}
      </Button>
      <div
        className={cn(
          'fixed bottom-24 right-4 z-40 w-full max-w-md rounded-3xl border border-border/60 bg-background/95 p-6 shadow-2xl backdrop-blur sm:right-6 rtl:right-auto rtl:left-4',
          open
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0 transition-opacity',
        )}
      >
        <div className="mb-4 space-y-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-base font-semibold text-foreground">{strings.title}</p>
            {templateTitle ? (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {templateTitle}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-foreground/60">{strings.subtitle}</p>
        </div>
        <div className="mb-4 max-h-64 space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <p className="text-sm text-foreground/70">{strings.empty}</p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex flex-col gap-1 text-sm leading-6',
                  message.sender === 'assistant' ? 'items-start' : 'items-end',
                )}
              >
                <span className="text-xs font-medium uppercase tracking-wide text-foreground/50">
                  {message.sender === 'assistant' ? strings.assistantLabel : strings.userLabel}
                </span>
                <span
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm backdrop-blur',
                    message.sender === 'assistant'
                      ? 'bg-primary/10 text-foreground'
                      : 'bg-muted text-foreground',
                  )}
                >
                  {message.text}
                </span>
              </div>
            ))
          )}
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
            {strings.promptsTitle}
          </p>
          <div className="flex flex-wrap gap-2">
            {prompts.map((prompt) => (
              <Button
                key={prompt}
                variant="secondary"
                size="sm"
                onClick={() => onPromptSelect(prompt)}
                className="rounded-full"
              >
                {prompt}
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={onApplySample}>
              {strings.applySample}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-muted/40 p-8 text-center text-sm text-foreground/70">
      {message}
    </div>
  );
}

function renderField(
  field: DocumentField,
  value: string,
  onChange: (value: string) => void,
  onBlur: () => void,
) {
  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          id={field.id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          rows={4}
          className="w-full rounded-3xl border border-border/60 bg-background px-5 py-3 text-sm text-foreground shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder={field.placeholder}
        />
      );
    case 'select':
      return (
        <select
          id={field.id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          className="w-full rounded-full border border-border/60 bg-background px-5 py-3 text-sm text-foreground shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="" disabled hidden>
            {field.placeholder ?? ''}
          </option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    case 'date':
      return (
        <Input
          id={field.id}
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
        />
      );
    case 'number':
      return (
        <Input
          id={field.id}
          type="number"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder={field.placeholder}
        />
      );
    default:
      return (
        <Input
          id={field.id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder={field.placeholder}
        />
      );
  }
}

function buildPreviewText(
  template: DocumentTemplate,
  values: Record<string, string>,
  placeholder: string,
) {
  const sections =
    template.previewSections.length > 0 ? template.previewSections : [template.previewTitle];
  return sections
    .map((section) => applyPlaceholders(section, values, placeholder, template.fields))
    .join('\n');
}

function applyPlaceholders(
  text: string,
  values: Record<string, string>,
  placeholder: string,
  fields: DocumentField[],
) {
  return text.replace(/\{([^}]+)\}/g, (_, token: string) => {
    const rawValue = values[token]?.trim();
    if (!rawValue) {
      return placeholder;
    }

    const field = fields.find((item) => item.id === token);
    if (field?.type === 'select') {
      const match = field.options?.find((option) => option.value === rawValue);
      return match?.label ?? rawValue;
    }

    return rawValue;
  });
}

function safeTranslateOptional(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
}

function createAssistantMessage(text: string): ChatMessage {
  return {
    id: createId(),
    sender: 'assistant',
    text,
    timestamp: Date.now(),
  };
}

function createUserMessage(text: string): ChatMessage {
  return {
    id: createId(),
    sender: 'user',
    text,
    timestamp: Date.now(),
  };
}

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function encryptFile(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((value) => value.toString(16).padStart(2, '0')).join('');
}

function delay(duration: number) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}
