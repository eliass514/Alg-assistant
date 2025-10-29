'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { Spinner } from '@/components/ui/spinner';
import { getAdminDashboardMetrics } from '@/lib/api/admin-dashboard';
import { isApiError } from '@/lib/api/client';

export function AdminDashboardMetrics() {
  const t = useTranslations('Admin');

  const {
    data: metrics,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['admin', 'dashboard', 'metrics'],
    queryFn: getAdminDashboardMetrics,
    refetchInterval: 30000,
  });

  const metricsData = [
    {
      id: 'users',
      value: metrics?.totalUsers,
      label: t('dashboard.metrics.users.label'),
      description: t('dashboard.metrics.users.description'),
    },
    {
      id: 'appointments',
      value: metrics?.pendingAppointments,
      label: t('dashboard.metrics.appointments.label'),
      description: t('dashboard.metrics.appointments.description'),
    },
    {
      id: 'documents',
      value: metrics?.pendingDocuments,
      label: t('dashboard.metrics.documents.label'),
      description: t('dashboard.metrics.documents.description'),
    },
    {
      id: 'services',
      value: metrics?.activeServices,
      label: t('dashboard.metrics.services.label'),
      description: t('dashboard.metrics.services.description'),
    },
  ];

  if (isLoading) {
    return (
      <section aria-labelledby="dashboard-metrics" className="space-y-6">
        <div className="space-y-2">
          <h2 id="dashboard-metrics" className="text-lg font-semibold text-foreground sm:text-xl">
            {t('dashboard.metrics.title')}
          </h2>
          <p className="text-sm text-foreground/70">{t('dashboard.metrics.subtitle')}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metricsData.map((metric) => (
            <div
              key={metric.id}
              className="flex h-full flex-col justify-between gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground/70">{metric.label}</p>
                  <div className="flex h-10 items-center">
                    <Spinner size="lg" />
                  </div>
                </div>
              </div>
              <p className="text-sm text-foreground/60">{metric.description}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section aria-labelledby="dashboard-metrics" className="space-y-6">
        <div className="space-y-2">
          <h2 id="dashboard-metrics" className="text-lg font-semibold text-foreground sm:text-xl">
            {t('dashboard.metrics.title')}
          </h2>
          <p className="text-sm text-foreground/70">{t('dashboard.metrics.subtitle')}</p>
        </div>
        <div className="rounded-lg border border-red-300 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">
            {isApiError(error) ? error.message : t('dashboard.metrics.error')}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="dashboard-metrics" className="space-y-6">
      <div className="space-y-2">
        <h2 id="dashboard-metrics" className="text-lg font-semibold text-foreground sm:text-xl">
          {t('dashboard.metrics.title')}
        </h2>
        <p className="text-sm text-foreground/70">{t('dashboard.metrics.subtitle')}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricsData.map((metric) => (
          <div
            key={metric.id}
            className="flex h-full flex-col justify-between gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground/70">{metric.label}</p>
                <p className="text-3xl font-semibold tracking-tight text-foreground">
                  {metric.value?.toLocaleString() ?? '0'}
                </p>
              </div>
            </div>
            <p className="text-sm text-foreground/60">{metric.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
