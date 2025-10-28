import { getTranslations } from 'next-intl/server';

import { Section } from '@/components/layout/Section';

interface PageProps {
  params: {
    locale: string;
  };
}

export async function generateMetadata({ params }: PageProps) {
  const t = await getTranslations({ locale: params.locale, namespace: 'Admin.meta' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function AdminPage() {
  const t = await getTranslations('Admin');

  const sampleLabel = t('dashboard.metrics.sample');

  const metrics = [
    {
      id: 'users',
      value: '1,250',
      label: t('dashboard.metrics.users.label'),
      description: t('dashboard.metrics.users.description'),
    },
    {
      id: 'appointments',
      value: '38',
      label: t('dashboard.metrics.appointments.label'),
      description: t('dashboard.metrics.appointments.description'),
    },
    {
      id: 'documents',
      value: '24',
      label: t('dashboard.metrics.documents.label'),
      description: t('dashboard.metrics.documents.description'),
    },
    {
      id: 'services',
      value: '12',
      label: t('dashboard.metrics.services.label'),
      description: t('dashboard.metrics.services.description'),
    },
  ];

  return (
    <Section>
      <div className="space-y-12">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-foreground/70">{t('description')}</p>
        </header>

        <section aria-labelledby="dashboard-metrics" className="space-y-6">
          <div className="space-y-2">
            <h2 id="dashboard-metrics" className="text-lg font-semibold text-foreground sm:text-xl">
              {t('dashboard.metrics.title')}
            </h2>
            <p className="text-sm text-foreground/70">{t('dashboard.metrics.subtitle')}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div
                key={metric.id}
                className="flex h-full flex-col justify-between gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground/70">{metric.label}</p>
                    <p className="text-3xl font-semibold tracking-tight text-foreground">
                      {metric.value}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {sampleLabel}
                  </span>
                </div>
                <p className="text-sm text-foreground/60">{metric.description}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">{t('dashboard.overview')}</h2>
            <p className="mt-2 text-sm text-foreground/70">{t('dashboard.overviewDescription')}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">{t('dashboard.users')}</h2>
            <p className="mt-2 text-sm text-foreground/70">{t('dashboard.usersDescription')}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">{t('dashboard.services')}</h2>
            <p className="mt-2 text-sm text-foreground/70">{t('dashboard.servicesDescription')}</p>
          </div>
        </div>
      </div>
    </Section>
  );
}
