'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogCloseButton,
} from '@/components/ui/dialog';
import {
  fetchAdminAppointments,
  fetchAdminAppointment,
  updateAdminAppointment,
  deleteAdminAppointment,
} from '@/lib/api/admin-appointments';
import { adminAppointmentKeys } from '@/lib/react-query/keys';
import { isApiError } from '@/lib/api/client';
import type { AppointmentDetails, AppointmentStatus } from '@/types/appointments';

export function AppointmentsManagementPage() {
  const locale = useLocale();
  const t = useTranslations('Admin.Appointments');
  const commonT = useTranslations('Common');
  const queryClient = useQueryClient();

  const [userFilter, setUserFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | ''>('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [page, setPage] = useState(1);
  const [viewingAppointment, setViewingAppointment] = useState<string | null>(null);
  const [updatingAppointment, setUpdatingAppointment] = useState<AppointmentDetails | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<AppointmentStatus | ''>('');
  const [updatingNotes, setUpdatingNotes] = useState('');
  const [deletingAppointment, setDeletingAppointment] = useState<AppointmentDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const limit = 25;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: adminAppointmentKeys.list({
      locale,
      userId: userFilter || undefined,
      serviceId: serviceFilter || undefined,
      status: statusFilter || undefined,
      scheduledFrom: dateFromFilter || undefined,
      scheduledTo: dateToFilter || undefined,
      page,
      limit,
    }),
    queryFn: () =>
      fetchAdminAppointments({
        locale,
        userId: userFilter || undefined,
        serviceId: serviceFilter || undefined,
        status: statusFilter || undefined,
        scheduledFrom: dateFromFilter || undefined,
        scheduledTo: dateToFilter || undefined,
        page,
        limit,
      }),
    placeholderData: keepPreviousData,
  });

  const {
    data: appointmentDetailData,
    isFetching: isFetchingDetail,
    isError: isDetailError,
    error: detailError,
  } = useQuery({
    queryKey: adminAppointmentKeys.detail(viewingAppointment || '', locale),
    queryFn: () => fetchAdminAppointment(viewingAppointment!, locale),
    enabled: !!viewingAppointment,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data: updateData,
    }: {
      id: string;
      data: { status?: AppointmentStatus; notes?: string };
    }) => updateAdminAppointment(id, updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminAppointmentKeys.all });
      setUpdatingAppointment(null);
      setUpdatingStatus('');
      setUpdatingNotes('');
      setSuccessMessage(t('messages.updateSuccess'));
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err) => {
      const message = isApiError(err) ? err.message : t('messages.error');
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminAppointmentKeys.all });
      setDeletingAppointment(null);
      setSuccessMessage(t('messages.deleteSuccess'));
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err) => {
      const message = isApiError(err) ? err.message : t('messages.error');
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  const handleUpdateSubmit = async () => {
    if (!updatingAppointment || !updatingStatus) return;
    await updateMutation.mutateAsync({
      id: updatingAppointment.id,
      data: {
        status: updatingStatus as AppointmentStatus,
        notes: updatingNotes || undefined,
      },
    });
  };

  const handleDelete = async () => {
    if (!deletingAppointment) return;
    await deleteMutation.mutateAsync(deletingAppointment.id);
  };

  const handleClearFilters = () => {
    setUserFilter('');
    setServiceFilter('');
    setStatusFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    setPage(1);
  };

  const appointments = data?.data ?? [];
  const totalPages = data?.meta ? Math.ceil(data.meta.total / data.meta.limit) : 1;

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeClasses = (status: AppointmentStatus) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800';
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getQueueStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'WAITING':
        return 'bg-yellow-100 text-yellow-800';
      case 'NOTIFIED':
        return 'bg-purple-100 text-purple-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'EXPIRED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const translateStatus = (status: AppointmentStatus) => t(`status.${status.toLowerCase()}`);

  const translateQueueStatus = (status: string) =>
    t(`queueStatus.${status.toLowerCase()}` as const);

  return (
    <Section>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="mt-2 text-foreground/70">{t('description')}</p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <Button
              variant="secondary"
              onClick={() => queryClient.invalidateQueries({ queryKey: adminAppointmentKeys.all })}
            >
              {t('actions.refresh')}
            </Button>
            <Button onClick={handleClearFilters}>{t('actions.clearFilters')}</Button>
          </div>
        </div>

        {(successMessage || errorMessage) && (
          <div
            className={`rounded-lg border p-4 ${
              successMessage
                ? 'border-green-500 bg-green-50 text-green-900'
                : 'border-red-500 bg-red-50 text-red-900'
            }`}
          >
            {successMessage || errorMessage}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label htmlFor="user-filter" className="mb-2 block text-sm font-medium">
              {t('filters.userLabel')}
            </label>
            <Input
              id="user-filter"
              type="search"
              placeholder={t('filters.userPlaceholder')}
              value={userFilter}
              onChange={(e) => {
                setUserFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="lg:col-span-2">
            <label htmlFor="service-filter" className="mb-2 block text-sm font-medium">
              {t('filters.serviceLabel')}
            </label>
            <Input
              id="service-filter"
              type="search"
              placeholder={t('filters.servicePlaceholder')}
              value={serviceFilter}
              onChange={(e) => {
                setServiceFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label htmlFor="status-filter" className="mb-2 block text-sm font-medium">
              {t('filters.statusLabel')}
            </label>
            <Select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as AppointmentStatus | '');
                setPage(1);
              }}
            >
              <option value="">{t('filters.allStatuses')}</option>
              <option value="SCHEDULED">{t('status.scheduled')}</option>
              <option value="CONFIRMED">{t('status.confirmed')}</option>
              <option value="COMPLETED">{t('status.completed')}</option>
              <option value="CANCELLED">{t('status.cancelled')}</option>
            </Select>
          </div>
          <div>
            <label htmlFor="date-from" className="mb-2 block text-sm font-medium">
              {t('filters.dateFrom')}
            </label>
            <Input
              id="date-from"
              type="date"
              value={dateFromFilter}
              onChange={(e) => {
                setDateFromFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label htmlFor="date-to" className="mb-2 block text-sm font-medium">
              {t('filters.dateTo')}
            </label>
            <Input
              id="date-to"
              type="date"
              value={dateToFilter}
              onChange={(e) => {
                setDateToFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
              <span className="ms-3 text-sm text-foreground/70">{t('table.loading')}</span>
            </div>
          ) : isError ? (
            <div className="py-12 text-center">
              <p className="text-sm text-red-600">
                {isApiError(error) ? error.message : t('messages.error')}
              </p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-foreground/60">{t('table.empty')}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{t('table.user')}</TableHeaderCell>
                    <TableHeaderCell>{t('table.service')}</TableHeaderCell>
                    <TableHeaderCell>{t('table.scheduledAt')}</TableHeaderCell>
                    <TableHeaderCell>{t('table.status')}</TableHeaderCell>
                    <TableHeaderCell>{t('table.queue')}</TableHeaderCell>
                    <TableHeaderCell align="right">{t('table.actions')}</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {appointments.map((appointment) => (
                    <TableRow key={appointment.id} hover>
                      <TableCell>
                        <div className="text-xs">
                          <code className="block text-foreground/60">{appointment.userId}</code>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="block text-sm font-medium">
                            {appointment.service.slug}
                          </span>
                          <span className="text-xs text-foreground/60">
                            {t('table.duration', {
                              count: appointment.service.durationMinutes,
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDateTime(appointment.scheduledAt)}</div>
                          <div className="text-xs text-foreground/60">{appointment.timezone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClasses(appointment.status)}`}
                        >
                          {translateStatus(appointment.status)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {appointment.queueTicket ? (
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getQueueStatusBadgeClasses(appointment.queueTicket.status)}`}
                          >
                            #{appointment.queueTicket.position}{' '}
                            {translateQueueStatus(appointment.queueTicket.status)}
                          </span>
                        ) : (
                          <span className="text-xs text-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingAppointment(appointment.id)}
                          >
                            {t('actions.view')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setUpdatingAppointment(appointment);
                              setUpdatingStatus(appointment.status);
                              setUpdatingNotes(appointment.notes ?? '');
                            }}
                          >
                            {t('actions.updateStatus')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingAppointment(appointment)}
                          >
                            {t('actions.delete')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-4 py-3">
                  <div className="text-sm text-foreground/70">
                    {commonT('pagination.page')} {page} {commonT('pagination.of')} {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      {commonT('pagination.previous')}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      {commonT('pagination.next')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Dialog open={!!viewingAppointment} onClose={() => setViewingAppointment(null)}>
        <DialogHeader>
          <DialogTitle>{t('detail.title')}</DialogTitle>
          <DialogCloseButton onClick={() => setViewingAppointment(null)}>
            {commonT('actions.close')}
          </DialogCloseButton>
        </DialogHeader>
        <DialogBody>
          {isFetchingDetail ? (
            <div className="flex items-center justify-center py-10">
              <Spinner />
            </div>
          ) : isDetailError ? (
            <p className="text-sm text-red-600">
              {isApiError(detailError) ? detailError.message : t('messages.error')}
            </p>
          ) : appointmentDetailData?.data ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-foreground/70">{t('detail.id')}</h3>
                <code className="mt-1 block text-sm">{appointmentDetailData.data.id}</code>
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground/70">{t('detail.userId')}</h3>
                <code className="mt-1 block text-sm">{appointmentDetailData.data.userId}</code>
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground/70">{t('detail.service')}</h3>
                <p className="mt-1 text-sm">{appointmentDetailData.data.service.slug}</p>
                <p className="mt-0.5 text-xs text-foreground/60">
                  {t('detail.minutes', {
                    count: appointmentDetailData.data.service.durationMinutes,
                  })}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground/70">
                  {t('detail.scheduledAt')}
                </h3>
                <p className="mt-1 text-sm">
                  {formatDateTime(appointmentDetailData.data.scheduledAt)}
                </p>
                <p className="mt-0.5 text-xs text-foreground/60">
                  {appointmentDetailData.data.timezone}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground/70">{t('detail.status')}</h3>
                <span
                  className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClasses(appointmentDetailData.data.status)}`}
                >
                  {translateStatus(appointmentDetailData.data.status)}
                </span>
              </div>
              {appointmentDetailData.data.slot && (
                <div>
                  <h3 className="text-sm font-medium text-foreground/70">{t('detail.slot')}</h3>
                  <div className="mt-1 text-sm">
                    <div>
                      {formatDateTime(appointmentDetailData.data.slot.startAt)} -{' '}
                      {formatDateTime(appointmentDetailData.data.slot.endAt)}
                    </div>
                    <div className="text-xs text-foreground/60">
                      {t('detail.capacity', {
                        count: appointmentDetailData.data.slot.capacity,
                      })}
                    </div>
                  </div>
                </div>
              )}
              {appointmentDetailData.data.queueTicket && (
                <div>
                  <h3 className="text-sm font-medium text-foreground/70">
                    {t('detail.queueTicket')}
                  </h3>
                  <div className="mt-1 space-y-2 text-sm">
                    <div>
                      <span className="text-foreground/70">{t('detail.position')}:</span>{' '}
                      {appointmentDetailData.data.queueTicket.position}
                    </div>
                    <div>
                      <span className="text-foreground/70">{t('detail.queueStatus')}:</span>{' '}
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getQueueStatusBadgeClasses(appointmentDetailData.data.queueTicket.status)}`}
                      >
                        {translateQueueStatus(appointmentDetailData.data.queueTicket.status)}
                      </span>
                    </div>
                    {appointmentDetailData.data.queueTicket.notifiedAt && (
                      <div>
                        <span className="text-foreground/70">{t('detail.notifiedAt')}:</span>{' '}
                        {formatDateTime(appointmentDetailData.data.queueTicket.notifiedAt)}
                      </div>
                    )}
                    {appointmentDetailData.data.queueTicket.expiresAt && (
                      <div>
                        <span className="text-foreground/70">{t('detail.expiresAt')}:</span>{' '}
                        {formatDateTime(appointmentDetailData.data.queueTicket.expiresAt)}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {appointmentDetailData.data.notes && (
                <div>
                  <h3 className="text-sm font-medium text-foreground/70">{t('detail.notes')}</h3>
                  <p className="mt-1 text-sm">{appointmentDetailData.data.notes}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-foreground/70">
                    {t('detail.createdAt')}
                  </h3>
                  <p className="mt-1 text-xs text-foreground/60">
                    {formatDateTime(appointmentDetailData.data.createdAt)}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground/70">
                    {t('detail.updatedAt')}
                  </h3>
                  <p className="mt-1 text-xs text-foreground/60">
                    {formatDateTime(appointmentDetailData.data.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </DialogBody>
      </Dialog>

      <Dialog open={!!updatingAppointment} onClose={() => setUpdatingAppointment(null)}>
        <DialogHeader>
          <DialogTitle>{t('update.title')}</DialogTitle>
          <DialogCloseButton onClick={() => setUpdatingAppointment(null)}>
            {commonT('actions.close')}
          </DialogCloseButton>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <p className="text-sm text-foreground/80">{t('update.message')}</p>
            {updatingAppointment && (
              <div>
                <code className="text-xs text-foreground/60">{updatingAppointment.id}</code>
                <p className="mt-2 text-sm">
                  <span className="font-medium">{t('update.currentStatus')}:</span>{' '}
                  {translateStatus(updatingAppointment.status)}
                </p>
              </div>
            )}
            <div>
              <label htmlFor="status-select" className="mb-2 block text-sm font-medium">
                {t('update.newStatus')}
              </label>
              <Select
                id="status-select"
                value={updatingStatus}
                onChange={(e) => setUpdatingStatus(e.target.value as AppointmentStatus | '')}
              >
                <option value="">{t('update.selectStatus')}</option>
                <option value="SCHEDULED">{t('status.scheduled')}</option>
                <option value="CONFIRMED">{t('status.confirmed')}</option>
                <option value="COMPLETED">{t('status.completed')}</option>
                <option value="CANCELLED">{t('status.cancelled')}</option>
              </Select>
            </div>
            <div>
              <label htmlFor="notes" className="mb-2 block text-sm font-medium">
                {t('update.notesLabel')}
              </label>
              <Textarea
                id="notes"
                value={updatingNotes}
                onChange={(e) => setUpdatingNotes(e.target.value)}
                placeholder={t('update.notesPlaceholder')}
                rows={4}
              />
              <p className="mt-1 text-xs text-foreground/60">{t('update.notesHint')}</p>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => {
              setUpdatingAppointment(null);
              setUpdatingStatus('');
              setUpdatingNotes('');
            }}
            disabled={updateMutation.isPending}
          >
            {t('update.cancel')}
          </Button>
          <Button
            onClick={handleUpdateSubmit}
            disabled={updateMutation.isPending || !updatingStatus}
          >
            {updateMutation.isPending ? commonT('actions.saving') : t('update.confirm')}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={!!deletingAppointment} onClose={() => setDeletingAppointment(null)}>
        <DialogHeader>
          <DialogTitle>{t('delete.title')}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-sm text-foreground/80">{t('delete.message')}</p>
          {deletingAppointment && (
            <div className="mt-2 space-y-1 text-sm">
              <code className="block text-xs text-foreground/60">{deletingAppointment.id}</code>
              <p>
                <span className="font-medium">{t('detail.service')}:</span>{' '}
                {deletingAppointment.service.slug}
              </p>
              <p>
                <span className="font-medium">{t('detail.scheduledAt')}:</span>{' '}
                {formatDateTime(deletingAppointment.scheduledAt)}
              </p>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => setDeletingAppointment(null)}
            disabled={deleteMutation.isPending}
          >
            {t('delete.cancel')}
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteMutation.isPending ? commonT('actions.saving') : t('delete.confirm')}
          </Button>
        </DialogFooter>
      </Dialog>
    </Section>
  );
}
