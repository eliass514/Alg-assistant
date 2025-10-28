'use client';

import { useMemo } from 'react';

import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Spinner } from '@/components/ui/spinner';
import { fetchUserAppointments, fetchUserDocuments, fetchUserProfile } from '@/lib/api/profile';
import { appointmentKeys, documentKeys, profileKeys } from '@/lib/react-query/keys';
import { useAuth } from '@/components/auth/AuthProvider';
import { localeLabels } from '@/i18n/config';
import type { AppointmentItem, DocumentItem, DocumentStatus, UserProfile } from '@/types';
import { Section } from '@/components/layout/Section';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heading, Text } from '@/components/ui/typography';

export function ProfilePage() {
  const { user } = useAuth();
  const locale = useLocale();
  const t = useTranslations('Profile');
  const personalT = useTranslations('Profile.personal');
  const documentsT = useTranslations('Profile.documents');
  const appointmentsT = useTranslations('Profile.appointments');

  const profileQuery = useQuery({
    queryKey: profileKeys.details(locale),
    queryFn: () => fetchUserProfile(locale),
  });

  const documentsQuery = useQuery({
    queryKey: documentKeys.list(locale),
    queryFn: () => fetchUserDocuments(locale),
  });

  const appointmentsQuery = useQuery({
    queryKey: appointmentKeys.list(locale),
    queryFn: () => fetchUserAppointments(locale),
  });

  const profile = (profileQuery.data ?? user ?? null) as UserProfile | null;

  const missingValue = personalT('missing');

  const formatValue = (value?: string | null) => {
    if (typeof value !== 'string') return missingValue;

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : missingValue;
  };

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [locale],
  );

  const dateFormatterShort = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
      }),
    [locale],
  );

  const formatDateTimeValue = (value?: string | null) => {
    if (!value) return missingValue;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return missingValue;

    return dateFormatter.format(date);
  };

  const formatDate = (value?: string | null) => {
    if (!value) return missingValue;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return missingValue;

    return dateFormatterShort.format(date);
  };

  const preferredLanguageLabel = profile?.preferredLanguage
    ? (localeLabels?.[profile.preferredLanguage as keyof typeof localeLabels]?.native ??
      profile.preferredLanguage)
    : missingValue;

  const addressLabel = (() => {
    if (!profile?.address) return missingValue;

    const { line1, line2, postalCode, city, country } = profile.address;
    const parts = [line1, line2, postalCode, city, country].filter(
      (part): part is string => typeof part === 'string' && part.trim().length > 0,
    );

    if (parts.length === 0) {
      return missingValue;
    }

    return parts.join(' · ');
  })();

  const fullName = formatValue(
    profile ? `${profile.firstName ?? ''} ${profile.lastName ?? ''}` : null,
  );
  const emailValue = formatValue(profile?.email);
  const phoneValue = formatValue(profile?.phoneNumber);
  const nationalityValue = formatValue(profile?.nationality);
  const identityNumberValue = formatValue(profile?.identityNumber);
  const preferredLanguageValue = formatValue(preferredLanguageLabel);
  const addressValue = formatValue(addressLabel);

  const personalInfo = [
    { label: personalT('fields.fullName'), value: fullName },
    { label: personalT('fields.email'), value: emailValue },
    { label: personalT('fields.phoneNumber'), value: phoneValue },
    { label: personalT('fields.nationality'), value: nationalityValue },
    { label: personalT('fields.identityNumber'), value: identityNumberValue },
    { label: personalT('fields.birthDate'), value: formatDate(profile?.birthDate) },
    { label: personalT('fields.preferredLanguage'), value: preferredLanguageValue },
    { label: personalT('fields.address'), value: addressValue },
  ];

  const renderDocumentStatus = (status: DocumentStatus) => documentsT(`status.${status}`);

  const renderAppointmentStatus = (status: AppointmentItem['status']) =>
    appointmentsT(`status.${status}`);

  const renderDocuments = (
    documents: DocumentItem[] | undefined,
    isLoading: boolean,
    isError: boolean,
  ) => {
    if (isError) {
      return <Text className="text-sm text-red-500">{documentsT('error')}</Text>;
    }

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-sm text-foreground/70">
          <Spinner />
          <span>{documentsT('loading')}</span>
        </div>
      );
    }

    if (!documents || documents.length === 0) {
      return <Text muted>{documentsT('empty')}</Text>;
    }

    return (
      <ul className="space-y-4">
        {documents.map((document) => {
          const uploadedAtDate = new Date(document.uploadedAt);
          const uploadedAtLabel = Number.isNaN(uploadedAtDate.getTime())
            ? documentsT('uploadedAt', { date: missingValue })
            : documentsT('uploadedAt', { date: dateFormatterShort.format(uploadedAtDate) });

          return (
            <li key={document.id} className="rounded-2xl border border-border/60 px-5 py-4">
              <div className="flex flex-col gap-2 text-sm rtl:text-right sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-foreground">{document.title}</p>
                  <p className="text-xs uppercase tracking-wide text-foreground/60">
                    {document.category}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4 rtl:space-x-reverse">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary/90">
                    {renderDocumentStatus(document.status)}
                  </span>
                  <span className="text-xs text-foreground/60">{uploadedAtLabel}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderAppointments = (
    appointments: AppointmentItem[] | undefined,
    isLoading: boolean,
    isError: boolean,
  ) => {
    if (isError) {
      return <Text className="text-sm text-red-500">{appointmentsT('error')}</Text>;
    }

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-sm text-foreground/70">
          <Spinner />
          <span>{appointmentsT('loading')}</span>
        </div>
      );
    }

    if (!appointments || appointments.length === 0) {
      return <Text muted>{appointmentsT('empty')}</Text>;
    }

    return (
      <ul className="space-y-4">
        {appointments.map((appointment) => {
          const locationLabel =
            typeof appointment.location === 'string' && appointment.location.trim().length > 0
              ? appointment.location
              : appointmentsT('unknownLocation');

          return (
            <li key={appointment.id} className="rounded-2xl border border-border/60 px-5 py-4">
              <div className="flex flex-col gap-4 text-sm rtl:text-right md:flex-row md:justify-between">
                <div className="space-y-2">
                  <p className="font-semibold text-foreground">{appointment.title}</p>
                  <p className="text-xs text-foreground/60">
                    {appointmentsT('details', {
                      date: formatDateTimeValue(appointment.scheduledAt),
                      location: locationLabel,
                    })}
                  </p>
                  {appointment.practitioner ? (
                    <p className="text-xs text-foreground/70">
                      {appointmentsT('practitioner', { name: appointment.practitioner })}
                    </p>
                  ) : null}
                  {appointment.notes ? (
                    <p className="text-xs text-foreground/70">{appointment.notes}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3 md:justify-end">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary/90">
                    {renderAppointmentStatus(appointment.status)}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <ProtectedRoute>
      <Section className="py-12 sm:py-16 lg:py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <div className="space-y-3 text-left rtl:text-right">
            <Heading as="h1" size="lg">
              {t('title')}
            </Heading>
            <Text muted>{t('subtitle')}</Text>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{personalT('title')}</CardTitle>
              <Text muted>{personalT('description')}</Text>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                {personalInfo.map(({ label, value }) => (
                  <div key={label} className="space-y-1 text-left rtl:text-right">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                      {label}
                    </dt>
                    <dd className="text-sm text-foreground/90">{value || personalT('missing')}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{documentsT('title')}</CardTitle>
                <Text muted>{documentsT('description')}</Text>
              </CardHeader>
              <CardContent>
                {renderDocuments(
                  documentsQuery.data,
                  documentsQuery.isLoading,
                  documentsQuery.isError,
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{appointmentsT('title')}</CardTitle>
                <Text muted>{appointmentsT('description')}</Text>
              </CardHeader>
              <CardContent>
                {renderAppointments(
                  appointmentsQuery.data,
                  appointmentsQuery.isLoading,
                  appointmentsQuery.isError,
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </Section>
    </ProtectedRoute>
  );
}
