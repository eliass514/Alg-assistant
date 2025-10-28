'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useId,
  type ChangeEvent,
  type FormEvent,
} from 'react';

import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Heading, Text } from '@/components/ui/typography';
import {
  bookAppointment,
  cancelAppointment,
  createQueueTicket,
  fetchAppointmentAvailability,
  fetchAppointments,
  rescheduleAppointment,
  updateQueueTicketStatus,
} from '@/lib/api/appointments';
import { isApiError } from '@/lib/api/client';
import { fetchServices } from '@/lib/api/services';
import { bookingKeys, serviceKeys } from '@/lib/react-query/keys';
import {
  addOfflineAction,
  loadOfflineActions,
  removeOfflineAction,
  type OfflineBookingAction,
} from '@/lib/storage/offlineBookingQueue';
import { loadQueueTickets, saveQueueTickets } from '@/lib/storage/queueTickets';
import { cn } from '@/lib/utils';
import type {
  AppointmentAvailabilityParams,
  AppointmentDetails,
  AppointmentSlotAvailability,
  AppointmentStatus,
  QueueTicket,
  QueueTicketStatus,
  ServiceItem,
} from '@/types';

const SERVICE_FETCH_LIMIT = 200;
const DEFAULT_AVAILABILITY_RANGE_DAYS = 21;

type WizardStep = 'service' | 'slots' | 'confirm' | 'manage';
type WizardMode = 'new' | 'reschedule';

type PendingQueueForm = {
  serviceId: string;
  desiredFrom: string;
  desiredTo: string;
  notes: string;
};

interface AvailabilityGrouping {
  dayLabel: string;
  dayKey: string;
  items: AppointmentSlotAvailability[];
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `offline-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toISODateTime(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const instance = new Date(value);
  if (Number.isNaN(instance.getTime())) {
    return undefined;
  }
  return instance.toISOString();
}

function shouldQueueOffline(error: unknown): boolean {
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    return true;
  }

  return error instanceof TypeError;
}

function mergeQueueTickets(original: QueueTicket[], incoming: QueueTicket[]): QueueTicket[] {
  if (incoming.length === 0) {
    return original;
  }

  const map = new Map<string, QueueTicket>();
  original.forEach((ticket) => {
    map.set(ticket.id, ticket);
  });

  let changed = false;

  incoming.forEach((ticket) => {
    const current = map.get(ticket.id);
    if (!current) {
      map.set(ticket.id, ticket);
      changed = true;
      return;
    }

    if (
      current.updatedAt !== ticket.updatedAt ||
      current.status !== ticket.status ||
      current.position !== ticket.position
    ) {
      map.set(ticket.id, ticket);
      changed = true;
    }
  });

  if (!changed) {
    return original;
  }

  return Array.from(map.values());
}

export function BookingWizard() {
  const locale = useLocale();
  const t = useTranslations('Booking');
  const queryClient = useQueryClient();
  const isRtl = locale.startsWith('ar');

  const [step, setStep] = useState<WizardStep>('service');
  const [mode, setMode] = useState<WizardMode>('new');
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlotAvailability | null>(null);
  const [targetAppointment, setTargetAppointment] = useState<AppointmentDetails | null>(null);
  const [notes, setNotes] = useState('');

  const defaultTimezone = useMemo(() => {
    if (typeof Intl !== 'undefined') {
      const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (resolved) return resolved;
    }
    return 'UTC';
  }, []);

  const [timezone, setTimezone] = useState(defaultTimezone);

  const today = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(() => toISODate(today), [today]);
  const defaultTo = useMemo(() => {
    const limit = new Date(today);
    limit.setDate(limit.getDate() + DEFAULT_AVAILABILITY_RANGE_DAYS);
    return toISODate(limit);
  }, [today]);

  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [queueForm, setQueueForm] = useState<PendingQueueForm>({
    serviceId: '',
    desiredFrom: '',
    desiredTo: '',
    notes: '',
  });

  const [offlineActions, setOfflineActions] = useState<OfflineBookingAction[]>(() =>
    loadOfflineActions(),
  );
  const [queueTickets, setQueueTickets] = useState<QueueTicket[]>(() => loadQueueTickets());

  const [isOffline, setIsOffline] = useState<boolean>(() =>
    typeof window !== 'undefined' ? !window.navigator.onLine : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const timezoneSelectId = useId();
  const dateFromId = useId();
  const dateToId = useId();
  const notesInputId = useId();
  const queueDesiredFromId = useId();
  const queueDesiredToId = useId();
  const queueNotesId = useId();

  useEffect(() => {
    if (dateFrom > dateTo) {
      setDateTo(dateFrom);
    }
  }, [dateFrom, dateTo]);

  const servicesQuery = useQuery({
    queryKey: serviceKeys.list({
      locale,
      categoryId: null,
      search: undefined,
      isActive: true,
    }),
    queryFn: () =>
      fetchServices({
        locale,
        isActive: true,
        page: 1,
        limit: SERVICE_FETCH_LIMIT,
      }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const services = servicesQuery.data?.data ?? [];

  const servicesById = useMemo(() => {
    const map = new Map<string, ServiceItem>();
    services.forEach((service) => map.set(service.id, service));
    return map;
  }, [services]);

  const filteredServices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return services;
    return services.filter((service) => {
      const title = service.translation?.name ?? service.slug;
      const summary = service.translation?.summary ?? '';
      return (
        title.toLowerCase().includes(term) ||
        summary.toLowerCase().includes(term) ||
        service.slug.toLowerCase().includes(term)
      );
    });
  }, [services, searchTerm]);

  const fromIso = useMemo(() => toISODateTime(`${dateFrom}T00:00:00`), [dateFrom]);
  const toIso = useMemo(() => toISODateTime(`${dateTo}T23:59:59`), [dateTo]);

  const availabilityParams = useMemo<AppointmentAvailabilityParams | null>(() => {
    if (!selectedService) return null;

    return {
      serviceId: selectedService.id,
      from: fromIso,
      to: toIso,
      timezone: timezone || undefined,
    };
  }, [fromIso, selectedService, timezone, toIso]);

  const availabilityQuery = useQuery({
    queryKey: availabilityParams
      ? bookingKeys.availability({ ...availabilityParams, locale })
      : ['booking', 'availability', 'idle'],
    queryFn: () => fetchAppointmentAvailability(availabilityParams!, locale),
    enabled: Boolean(availabilityParams),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const availability = availabilityQuery.data?.data ?? [];

  const groupedAvailability = useMemo<AvailabilityGrouping[]>(() => {
    if (!availability) return [];

    const formatter = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    const groups = new Map<string, AvailabilityGrouping>();

    availability
      .filter((slot) => slot.status !== 'CANCELLED')
      .forEach((slot) => {
        const start = new Date(slot.startAt);
        const key = start.toISOString().slice(0, 10);
        const label = formatter.format(start);
        const existing = groups.get(key);
        if (existing) {
          existing.items.push(slot);
        } else {
          groups.set(key, {
            dayKey: key,
            dayLabel: label,
            items: [slot],
          });
        }
      });

    return Array.from(groups.values()).map((group) => ({
      ...group,
      items: group.items.sort((a, b) => {
        const aDate = new Date(a.startAt).getTime();
        const bDate = new Date(b.startAt).getTime();
        return aDate - bDate;
      }),
    }));
  }, [availability, locale]);

  const appointmentsQuery = useQuery({
    queryKey: bookingKeys.appointments({ locale }),
    queryFn: () => fetchAppointments({ locale }),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const appointments = appointmentsQuery.data?.data ?? [];

  useEffect(() => {
    const ticketsFromAppointments = appointments
      .map((appointment) => appointment.queueTicket)
      .filter((ticket): ticket is QueueTicket => Boolean(ticket));

    if (ticketsFromAppointments.length === 0) {
      return;
    }

    setQueueTickets((prev) => {
      const merged = mergeQueueTickets(prev, ticketsFromAppointments);
      if (merged === prev) {
        return prev;
      }
      saveQueueTickets(merged);
      return merged;
    });
  }, [appointments]);

  const sortedQueueTickets = useMemo(() => {
    return [...queueTickets].sort((a, b) => {
      const left = new Date(b.updatedAt).getTime();
      const right = new Date(a.updatedAt).getTime();
      return left - right;
    });
  }, [queueTickets]);

  const timezoneOptions = useMemo(() => {
    const base = ['UTC', defaultTimezone, 'Africa/Algiers'];
    const unique = Array.from(new Set(base.filter(Boolean)));
    return unique;
  }, [defaultTimezone]);

  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [locale],
  );

  const slotDurationLabel = useCallback(
    (minutes: number) =>
      t('labels.serviceDuration', {
        count: minutes,
      }),
    [t],
  );

  const queueLengthLabel = useCallback(
    (count: number) =>
      t('labels.queueLength', {
        count,
      }),
    [t],
  );

  const availableSpotsLabel = useCallback(
    (count: number) =>
      t('labels.availableSpots', {
        count,
      }),
    [t],
  );

  const resetFeedback = () => {
    setFeedback(null);
    setErrorMessage(null);
  };

  const handleSelectService = (service: ServiceItem) => {
    setSelectedService(service);
    setSelectedSlot(null);
    setTargetAppointment(null);
    setMode('new');
    setNotes('');
    setStep('slots');
    resetFeedback();

    if (!queueForm.serviceId) {
      setQueueForm((current) => ({ ...current, serviceId: service.id }));
    }
  };

  const handleSlotSelect = (slot: AppointmentSlotAvailability) => {
    setSelectedSlot(slot);
    setStep('confirm');
    resetFeedback();
  };

  const handleBackToService = () => {
    setStep('service');
    setSelectedService(null);
    setSelectedSlot(null);
    setTargetAppointment(null);
    setMode('new');
    setNotes('');
    resetFeedback();
  };

  const handleBackToSlots = () => {
    setStep('slots');
    setSelectedSlot(null);
    resetFeedback();
  };

  const refreshAppointments = () => {
    void queryClient.invalidateQueries({ queryKey: bookingKeys.appointments({ locale }) });
  };

  const refreshAvailability = () => {
    if (!availabilityParams) return;
    void queryClient.invalidateQueries({
      queryKey: bookingKeys.availability({ ...availabilityParams, locale }),
    });
  };

  const handleOfflineActionAdd = (action: OfflineBookingAction) => {
    setOfflineActions(addOfflineAction(action));
  };

  const handleOfflineActionRemove = (id: string) => {
    setOfflineActions(removeOfflineAction(id));
  };

  const handleProcessOfflineAction = async (action: OfflineBookingAction) => {
    setErrorMessage(null);
    try {
      switch (action.type) {
        case 'book': {
          await bookAppointment(action.data, action.locale);
          break;
        }
        case 'reschedule': {
          await rescheduleAppointment(action.appointmentId, action.data, action.locale);
          break;
        }
        case 'cancel': {
          await cancelAppointment(action.appointmentId, action.data, action.locale);
          break;
        }
        case 'joinQueue': {
          const result = await createQueueTicket(action.data, action.locale);
          const ticket = result.data;
          setQueueTickets((prev) => {
            const map = new Map(prev.map((item) => [item.id, item]));
            map.set(ticket.id, ticket);
            const merged = Array.from(map.values());
            saveQueueTickets(merged);
            return merged;
          });
          break;
        }
        case 'updateQueueStatus': {
          const result = await updateQueueTicketStatus(action.ticketId, action.data, action.locale);
          const ticket = result.data;
          setQueueTickets((prev) => {
            const map = new Map(prev.map((item) => [item.id, item]));
            map.set(ticket.id, ticket);
            const merged = Array.from(map.values());
            saveQueueTickets(merged);
            return merged;
          });
          break;
        }
        default:
          break;
      }

      refreshAppointments();
      refreshAvailability();
      handleOfflineActionRemove(action.id);
      setFeedback(t('notifications.offlineSyncSuccess'));
    } catch (error) {
      if (shouldQueueOffline(error)) {
        setFeedback(t('notifications.offlineQueued'));
        return;
      }

      const message = isApiError(error)
        ? error.message
        : ((error as Error | undefined)?.message ??
          t('notifications.error', { message: 'Unknown' }));
      setErrorMessage(
        t('notifications.offlineSyncError', {
          message,
        }),
      );
    }
  };

  const bookMutation = useMutation({
    mutationFn: ({ payload }: { payload: Parameters<typeof bookAppointment>[0] }) =>
      bookAppointment(payload, locale),
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({
      appointmentId,
      payload,
    }: {
      appointmentId: string;
      payload: Parameters<typeof rescheduleAppointment>[1];
    }) => rescheduleAppointment(appointmentId, payload, locale),
  });

  const cancelMutation = useMutation({
    mutationFn: ({
      appointmentId,
      payload,
    }: {
      appointmentId: string;
      payload: Parameters<typeof cancelAppointment>[1];
    }) => cancelAppointment(appointmentId, payload, locale),
  });

  const queueMutation = useMutation({
    mutationFn: ({ payload }: { payload: Parameters<typeof createQueueTicket>[0] }) =>
      createQueueTicket(payload, locale),
  });

  const queueCancelMutation = useMutation({
    mutationFn: ({
      ticketId,
      payload,
    }: {
      ticketId: string;
      payload: Parameters<typeof updateQueueTicketStatus>[1];
    }) => updateQueueTicketStatus(ticketId, payload, locale),
  });

  const handleConfirm = async () => {
    if (!selectedService || !selectedSlot) return;

    resetFeedback();

    const basePayload = {
      serviceId: selectedService.id,
      slotId: selectedSlot.id,
      locale,
      timezone,
      notes: notes.trim() || undefined,
    } as Parameters<typeof bookAppointment>[0];

    if (mode === 'new') {
      try {
        const result = await bookMutation.mutateAsync({ payload: basePayload });
        refreshAppointments();
        refreshAvailability();
        setFeedback(t('notifications.bookingSuccess'));
        setStep('manage');
        setSelectedService(null);
        setSelectedSlot(null);
        setTargetAppointment(result.data);
        setNotes('');
      } catch (error) {
        if (shouldQueueOffline(error)) {
          handleOfflineActionAdd({
            id: generateId(),
            type: 'book',
            locale,
            data: basePayload,
            createdAt: Date.now(),
          });
          setFeedback(t('notifications.offlineQueued'));
          setStep('manage');
          return;
        }

        const message = isApiError(error)
          ? error.message
          : ((error as Error | undefined)?.message ??
            t('notifications.error', { message: 'Unknown' }));
        setErrorMessage(
          t('notifications.error', {
            message,
          }),
        );
      }
      return;
    }

    if (!targetAppointment) return;

    try {
      const payload = {
        slotId: selectedSlot.id,
        timezone,
        notes: notes.trim() || undefined,
      } as Parameters<typeof rescheduleAppointment>[1];

      await rescheduleMutation.mutateAsync({ appointmentId: targetAppointment.id, payload });
      refreshAppointments();
      refreshAvailability();
      setFeedback(t('notifications.rescheduleSuccess'));
      setStep('manage');
      setSelectedService(null);
      setSelectedSlot(null);
      setTargetAppointment(null);
      setNotes('');
    } catch (error) {
      if (shouldQueueOffline(error)) {
        handleOfflineActionAdd({
          id: generateId(),
          type: 'reschedule',
          locale,
          appointmentId: targetAppointment.id,
          data: {
            slotId: selectedSlot.id,
            timezone,
            notes: notes.trim() || undefined,
          },
          createdAt: Date.now(),
        });
        setFeedback(t('notifications.offlineQueued'));
        setStep('manage');
        return;
      }

      const message = isApiError(error)
        ? error.message
        : ((error as Error | undefined)?.message ??
          t('notifications.error', { message: 'Unknown' }));
      setErrorMessage(
        t('notifications.error', {
          message,
        }),
      );
    }
  };

  const handlePrepareReschedule = (appointment: AppointmentDetails) => {
    const service = servicesById.get(appointment.serviceId);
    if (!service) {
      setErrorMessage(t('status.missingService'));
      setStep('service');
      return;
    }

    resetFeedback();
    setMode('reschedule');
    setSelectedService(service);
    setTargetAppointment(appointment);
    setSelectedSlot(null);
    setNotes('');

    if (appointment.timezone) {
      setTimezone(appointment.timezone);
    }

    const scheduled = new Date(appointment.scheduledAt);
    if (!Number.isNaN(scheduled.getTime())) {
      const day = toISODate(scheduled);
      setDateFrom(day);
      setDateTo(day);
    }

    setStep('slots');
  };

  const handleCancelAppointment = async (appointment: AppointmentDetails) => {
    resetFeedback();

    const payload = { reason: notes.trim() || undefined } as Parameters<
      typeof cancelAppointment
    >[1];

    try {
      await cancelMutation.mutateAsync({ appointmentId: appointment.id, payload });
      refreshAppointments();
      refreshAvailability();
      setFeedback(t('notifications.cancelSuccess'));
    } catch (error) {
      if (shouldQueueOffline(error)) {
        handleOfflineActionAdd({
          id: generateId(),
          type: 'cancel',
          locale,
          appointmentId: appointment.id,
          data: payload,
          createdAt: Date.now(),
        });
        setFeedback(t('notifications.offlineQueued'));
        return;
      }

      const message = isApiError(error)
        ? error.message
        : ((error as Error | undefined)?.message ??
          t('notifications.error', { message: 'Unknown' }));
      setErrorMessage(
        t('notifications.error', {
          message,
        }),
      );
    }
  };

  const handleQueueFormChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setQueueForm((current) => ({ ...current, [name]: value }));
  };

  const handleJoinQueue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!queueForm.serviceId) {
      setErrorMessage(t('queue.empty'));
      return;
    }

    resetFeedback();

    const payload = {
      serviceId: queueForm.serviceId,
      desiredFrom: toISODateTime(queueForm.desiredFrom),
      desiredTo: toISODateTime(queueForm.desiredTo),
      timezone,
      notes: queueForm.notes.trim() || undefined,
    } as Parameters<typeof createQueueTicket>[0];

    try {
      const result = await queueMutation.mutateAsync({ payload });
      const ticket = result.data;
      setQueueTickets((prev) => {
        const map = new Map(prev.map((item) => [item.id, item]));
        map.set(ticket.id, ticket);
        const merged = Array.from(map.values());
        saveQueueTickets(merged);
        return merged;
      });
      setFeedback(t('notifications.queueSuccess'));
      setQueueForm((current) => ({ ...current, notes: '', desiredFrom: '', desiredTo: '' }));
    } catch (error) {
      if (shouldQueueOffline(error)) {
        handleOfflineActionAdd({
          id: generateId(),
          type: 'joinQueue',
          locale,
          data: payload,
          createdAt: Date.now(),
        });
        setFeedback(t('notifications.offlineQueued'));
        return;
      }

      const message = isApiError(error)
        ? error.message
        : ((error as Error | undefined)?.message ??
          t('notifications.error', { message: 'Unknown' }));
      setErrorMessage(
        t('notifications.error', {
          message,
        }),
      );
    }
  };

  const handleCancelQueueTicket = async (ticket: QueueTicket) => {
    resetFeedback();

    const payload = { status: 'CANCELLED' as QueueTicketStatus };

    try {
      const result = await queueCancelMutation.mutateAsync({ ticketId: ticket.id, payload });
      const updated = result.data;
      setQueueTickets((prev) => {
        const map = new Map(prev.map((item) => [item.id, item]));
        map.set(updated.id, updated);
        const merged = Array.from(map.values());
        saveQueueTickets(merged);
        return merged;
      });
      setFeedback(t('notifications.queueCancelSuccess'));
    } catch (error) {
      if (shouldQueueOffline(error)) {
        handleOfflineActionAdd({
          id: generateId(),
          type: 'updateQueueStatus',
          locale,
          ticketId: ticket.id,
          data: payload,
          createdAt: Date.now(),
        });
        setFeedback(t('notifications.offlineQueued'));
        return;
      }

      const message = isApiError(error)
        ? error.message
        : ((error as Error | undefined)?.message ??
          t('notifications.error', { message: 'Unknown' }));
      setErrorMessage(
        t('notifications.error', {
          message,
        }),
      );
    }
  };

  const renderStepIndicator = () => {
    const steps: { key: WizardStep; label: string }[] = [
      { key: 'service', label: t('steps.service.title') },
      { key: 'slots', label: t('steps.slots.title') },
      { key: 'confirm', label: t('steps.confirm.title') },
      { key: 'manage', label: t('steps.manage.title') },
    ];

    return (
      <ol
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 rounded-full border border-border/60 bg-background/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-foreground/60',
          isRtl && 'rtl:space-x-reverse',
        )}
      >
        {steps.map(({ key, label }) => {
          const isActive = key === step;
          return (
            <li
              key={key}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-1 text-center transition',
                isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/60',
              )}
              data-testid={`booking-step-${key}`}
            >
              <span>{label}</span>
            </li>
          );
        })}
      </ol>
    );
  };

  const renderServiceStep = () => {
    return (
      <Card data-testid="booking-step-service">
        <CardHeader>
          <CardTitle>{t('steps.service.title')}</CardTitle>
          <Text muted>{t('steps.service.description')}</Text>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="service-search">
              <span>{t('steps.service.searchLabel')}</span>
              <Input
                id="service-search"
                type="search"
                placeholder={t('steps.service.searchPlaceholder')}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                data-testid="service-search-input"
              />
            </label>
            {isOffline ? (
              <Text className="text-xs text-amber-600">{t('status.offline')}</Text>
            ) : null}
          </div>

          {servicesQuery.isLoading ? (
            <div className="flex flex-col items-center gap-3 py-12 text-sm text-foreground/60">
              <Spinner />
              <span>{t('status.loadingServices')}</span>
            </div>
          ) : null}

          {servicesQuery.isError && !servicesQuery.data ? (
            <Text className="text-sm text-red-500">{t('status.error')}</Text>
          ) : null}

          {!servicesQuery.isLoading && filteredServices.length === 0 ? (
            <Text muted>{t('status.noServices')}</Text>
          ) : null}

          <ul className="grid gap-4 sm:grid-cols-2" data-testid="service-selection-list">
            {filteredServices.map((service) => {
              const title = service.translation?.name ?? service.slug;
              const summary =
                service.translation?.summary ?? service.translation?.description ?? '';
              return (
                <li key={service.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectService(service)}
                    className={cn(
                      'flex h-full w-full flex-col gap-3 rounded-3xl border border-border/60 bg-background/80 p-5 text-left shadow-soft transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                      'rtl:text-right',
                    )}
                    data-testid={`service-card-${service.id}`}
                  >
                    <span className="text-base font-semibold text-foreground">{title}</span>
                    {summary ? (
                      <span className="text-sm text-foreground/70 line-clamp-3">{summary}</span>
                    ) : null}
                    <div className="mt-auto flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-foreground/60">
                      <span>{slotDurationLabel(service.durationMinutes)}</span>
                    </div>
                    <span className="mt-2 inline-flex w-fit items-center justify-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      {t('steps.service.action')}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    );
  };

  const renderSlotsStep = () => {
    if (!selectedService) return null;

    return (
      <Card data-testid="booking-step-slots">
        <CardHeader className="space-y-2">
          <CardTitle>{t('steps.slots.title')}</CardTitle>
          <Text muted>{t('steps.slots.description')}</Text>
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.3em] text-foreground/50 rtl:text-right">
            <span>{t('labels.selectedService')}</span>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
              {selectedService.translation?.name ?? selectedService.slug}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-medium" htmlFor={timezoneSelectId}>
              <span>{t('labels.timezone')}</span>
              <select
                id={timezoneSelectId}
                className="h-10 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground/80 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                data-testid="timezone-select"
              >
                {timezoneOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium" htmlFor={dateFromId}>
              <span>{t('labels.dateFrom')}</span>
              <input
                id={dateFromId}
                type="date"
                className="h-10 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground/80 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                data-testid="date-from-input"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium" htmlFor={dateToId}>
              <span>{t('labels.dateTo')}</span>
              <input
                id={dateToId}
                type="date"
                className="h-10 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground/80 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                value={dateTo}
                min={dateFrom}
                onChange={(event) => setDateTo(event.target.value)}
                data-testid="date-to-input"
              />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={handleBackToService}>
              {t('actions.back')}
            </Button>
            <Button variant="secondary" onClick={refreshAvailability}>
              {t('actions.retry')}
            </Button>
          </div>

          {availabilityQuery.isLoading ? (
            <div className="flex flex-col items-center gap-3 py-12 text-sm text-foreground/60">
              <Spinner />
              <span>{t('status.loadingSlots')}</span>
            </div>
          ) : null}

          {availabilityQuery.isError && !availabilityQuery.data ? (
            <Text className="text-sm text-red-500">{t('status.error')}</Text>
          ) : null}

          {!availabilityQuery.isLoading && groupedAvailability.length === 0 ? (
            <Text muted>{t('status.noSlots')}</Text>
          ) : null}

          <div className="space-y-4">
            {groupedAvailability.map((group) => (
              <div key={group.dayKey} className="space-y-3">
                <div className="flex items-center justify-between text-sm font-semibold uppercase tracking-[0.3em] text-foreground/60">
                  <span>{group.dayLabel}</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {group.items.map((slot) => {
                    const startLabel = dateTimeFormatter.format(new Date(slot.startAt));
                    const endLabel = dateTimeFormatter.format(new Date(slot.endAt));
                    const isDisabled = slot.available <= 0 || slot.status === 'FULL';

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => handleSlotSelect(slot)}
                        disabled={isDisabled}
                        className={cn(
                          'flex flex-col gap-2 rounded-2xl border border-border/60 bg-background/60 p-4 text-left transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                          isDisabled && 'cursor-not-allowed opacity-60',
                          selectedSlot?.id === slot.id && 'border-primary bg-primary/10',
                        )}
                        data-testid={`slot-option-${slot.id}`}
                      >
                        <span className="text-sm font-semibold text-foreground">{startLabel}</span>
                        <span className="text-xs text-foreground/70">{endLabel}</span>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.25em] text-foreground/60">
                          <span>{availableSpotsLabel(slot.available)}</span>
                          <span>{queueLengthLabel(slot.queueLength)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderConfirmStep = () => {
    if (!selectedService || !selectedSlot) return null;

    const serviceName = selectedService.translation?.name ?? selectedService.slug;
    const slotStart = dateTimeFormatter.format(new Date(selectedSlot.startAt));
    const slotEnd = dateTimeFormatter.format(new Date(selectedSlot.endAt));

    return (
      <Card data-testid="booking-step-confirm">
        <CardHeader className="space-y-2">
          <CardTitle>{t('steps.confirm.title')}</CardTitle>
          <Text muted>{t('steps.confirm.description')}</Text>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-background/80 p-4 text-sm text-foreground">
              <span className="text-xs uppercase tracking-[0.3em] text-foreground/60">
                {t('labels.selectedService')}
              </span>
              <span className="font-semibold">{serviceName}</span>
              <span className="text-xs text-foreground/60">
                {slotDurationLabel(selectedService.durationMinutes)}
              </span>
            </div>
            <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-background/80 p-4 text-sm text-foreground">
              <span className="text-xs uppercase tracking-[0.3em] text-foreground/60">
                {t('labels.selectedSlot')}
              </span>
              <span className="font-semibold">{slotStart}</span>
              <span className="text-xs text-foreground/60">{slotEnd}</span>
            </div>
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium" htmlFor={notesInputId}>
            <span>{t('labels.notes')}</span>
            <textarea
              id={notesInputId}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm text-foreground/80 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </label>

          {feedback ? <Text className="text-sm text-primary">{feedback}</Text> : null}
          {errorMessage ? <Text className="text-sm text-red-500">{errorMessage}</Text> : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" onClick={handleBackToSlots}>
              {t('actions.back')}
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                onClick={handleConfirm}
                disabled={bookMutation.isPending || rescheduleMutation.isPending}
                data-testid="confirm-booking-button"
              >
                {mode === 'new' ? t('actions.confirm') : t('actions.reschedule')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderOfflineActions = () => {
    if (offlineActions.length === 0) return null;

    return (
      <Card data-testid="offline-actions">
        <CardHeader>
          <CardTitle>{t('pendingActions.title')}</CardTitle>
          <Text muted>{t('pendingActions.description')}</Text>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-3">
            {offlineActions.map((action) => (
              <li
                key={action.id}
                className="flex flex-col gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/40 p-4 text-sm text-foreground/80 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">
                    {t(`pendingActions.labels.${action.type as 'book'}`)}
                  </p>
                  <p className="text-xs text-foreground/60">
                    {dateTimeFormatter.format(new Date(action.createdAt))}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleProcessOfflineAction(action)}
                  >
                    {t('pendingActions.retry')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOfflineActionRemove(action.id)}
                  >
                    {t('pendingActions.remove')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  };

  const renderAppointments = () => {
    return (
      <Card data-testid="appointments-panel">
        <CardHeader>
          <CardTitle>{t('labels.appointments')}</CardTitle>
          <Text muted>{t('steps.manage.description')}</Text>
        </CardHeader>
        <CardContent className="space-y-4">
          {appointmentsQuery.isLoading ? (
            <div className="flex flex-col items-center gap-3 py-10 text-sm text-foreground/60">
              <Spinner />
              <span>{t('status.loadingAppointments')}</span>
            </div>
          ) : null}

          {appointmentsQuery.isError && !appointmentsQuery.data ? (
            <Text className="text-sm text-red-500">{t('status.error')}</Text>
          ) : null}

          {!appointmentsQuery.isLoading && appointments.length === 0 ? (
            <Text muted>{t('appointments.empty')}</Text>
          ) : null}

          <ul className="space-y-3">
            {appointments.map((appointment) => {
              const serviceName =
                servicesById.get(appointment.serviceId)?.translation?.name ??
                appointment.service.slug;
              const scheduledLabel = dateTimeFormatter.format(new Date(appointment.scheduledAt));
              const statusLabel = t(
                `appointments.status.${appointment.status as AppointmentStatus}`,
              );

              return (
                <li
                  key={appointment.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/80 p-4 text-sm text-foreground"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-base font-semibold text-foreground">{serviceName}</span>
                    <span className="text-xs text-foreground/60">
                      {t('labels.appointmentScheduled', { date: scheduledLabel })}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                      {statusLabel}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handlePrepareReschedule(appointment)}
                      data-testid={`appointment-reschedule-${appointment.id}`}
                    >
                      {t('actions.reschedule')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelAppointment(appointment)}
                      data-testid={`appointment-cancel-${appointment.id}`}
                    >
                      {t('actions.cancel')}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    );
  };

  const renderQueue = () => {
    return (
      <Card data-testid="queue-panel">
        <CardHeader>
          <CardTitle>{t('labels.queueTickets')}</CardTitle>
          <Text muted>{t('queue.pending')}</Text>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleJoinQueue}>
            <label className="flex flex-col gap-2 text-sm font-medium">
              <span>{t('steps.service.title')}</span>
              <select
                name="serviceId"
                value={queueForm.serviceId}
                onChange={handleQueueFormChange}
                className="h-10 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground/80 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                data-testid="queue-service-select"
              >
                <option value="">{t('steps.service.placeholder')}</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.translation?.name ?? service.slug}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium" htmlFor={queueDesiredFromId}>
              <span>{t('queue.desiredFrom')}</span>
              <input
                id={queueDesiredFromId}
                type="datetime-local"
                name="desiredFrom"
                value={queueForm.desiredFrom}
                onChange={handleQueueFormChange}
                className="h-10 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground/80 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                data-testid="queue-desired-from"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium" htmlFor={queueDesiredToId}>
              <span>{t('queue.desiredTo')}</span>
              <input
                id={queueDesiredToId}
                type="datetime-local"
                name="desiredTo"
                value={queueForm.desiredTo}
                onChange={handleQueueFormChange}
                className="h-10 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground/80 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                data-testid="queue-desired-to"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium" htmlFor={queueNotesId}>
              <span>{t('labels.notes')}</span>
              <textarea
                id={queueNotesId}
                name="notes"
                value={queueForm.notes}
                onChange={handleQueueFormChange}
                rows={3}
                className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm text-foreground/80 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              />
            </label>
            <div className="flex items-end">
              <Button
                type="submit"
                variant="secondary"
                className="w-full"
                data-testid="queue-join-button"
              >
                {t('actions.joinQueue')}
              </Button>
            </div>
          </form>

          <div className="space-y-3">
            {sortedQueueTickets.length === 0 ? (
              <Text muted>{t('queue.empty')}</Text>
            ) : (
              <ul className="space-y-3">
                {sortedQueueTickets.map((ticket) => {
                  const serviceName =
                    servicesById.get(ticket.serviceId)?.translation?.name ??
                    servicesById.get(ticket.serviceId)?.slug ??
                    ticket.serviceId;

                  const fromLabel = ticket.desiredFrom
                    ? dateTimeFormatter.format(new Date(ticket.desiredFrom))
                    : null;
                  const toLabel = ticket.desiredTo
                    ? dateTimeFormatter.format(new Date(ticket.desiredTo))
                    : null;

                  const statusLabel = t(`queue.status.${ticket.status}`);

                  return (
                    <li
                      key={ticket.id}
                      className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/80 p-4 text-sm text-foreground md:flex-row md:items-center md:justify-between"
                    >
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-foreground">{serviceName}</p>
                        <p className="text-xs text-foreground/60">
                          {t('labels.queueWindow', {
                            from: fromLabel ?? '—',
                            to: toLabel ?? '—',
                          })}
                        </p>
                        <p className="text-xs uppercase tracking-[0.25em] text-primary">
                          {statusLabel}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          #{ticket.position}
                        </span>
                        {ticket.status === 'WAITING' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelQueueTicket(ticket)}
                            data-testid={`queue-cancel-${ticket.id}`}
                          >
                            {t('actions.queueCancel')}
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderManageStep = () => {
    return (
      <div className="space-y-6" data-testid="booking-step-manage">
        {feedback ? <Text className="text-sm text-primary">{feedback}</Text> : null}
        {errorMessage ? <Text className="text-sm text-red-500">{errorMessage}</Text> : null}
        {renderOfflineActions()}
        <div className="grid gap-6 lg:grid-cols-2">
          {renderAppointments()}
          {renderQueue()}
        </div>
      </div>
    );
  };

  return (
    <Section className="space-y-8">
      <div className="space-y-3 text-left rtl:text-right">
        <Heading as="h1" size="lg">
          {t('heading')}
        </Heading>
        <Text muted>{t('subheading')}</Text>
      </div>

      {renderStepIndicator()}

      {isOffline ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-800">
          {t('status.offline')}
        </div>
      ) : null}

      {step === 'service' ? renderServiceStep() : null}
      {step === 'slots' ? renderSlotsStep() : null}
      {step === 'confirm' ? renderConfirmStep() : null}
      {step === 'manage' ? renderManageStep() : null}
    </Section>
  );
}
