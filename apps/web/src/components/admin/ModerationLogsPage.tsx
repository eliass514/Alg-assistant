'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { localeLabels, supportedLocales } from '@/i18n/config';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from '@/components/ui/table';
import {
  fetchAdminConversationLogs,
  fetchAdminDocumentVerificationLogs,
} from '@/lib/api/admin-logs';
import { adminLogKeys } from '@/lib/react-query/keys';
import { isApiError } from '@/lib/api/client';
import type {
  AdminConversationLogEntry,
  AdminDocumentVerificationLogEntry,
  ConversationParticipant,
} from '@/types/admin';

type LogType = 'conversations' | 'document-verifications';

export function ModerationLogsPage() {
  const t = useTranslations('Admin.Logs');
  const commonT = useTranslations('Common');

  const [activeTab, setActiveTab] = useState<LogType>('conversations');
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [userId, setUserId] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [participant, setParticipant] = useState<ConversationParticipant | ''>('');
  const [logType, setLogType] = useState<'status' | 'validation' | ''>('');
  const [uploadId, setUploadId] = useState('');
  const [localeFilter, setLocaleFilter] = useState('');

  const limit = 25;

  const conversationParams = {
    userId: userId || undefined,
    createdFrom: createdFrom || undefined,
    createdTo: createdTo || undefined,
    locale: localeFilter || undefined,
    search: searchTerm.trim() ? searchTerm.trim() : undefined,
    participant: participant || undefined,
    page,
    limit,
  };

  const documentVerificationParams = {
    userId: userId || undefined,
    uploadId: uploadId || undefined,
    createdFrom: createdFrom || undefined,
    createdTo: createdTo || undefined,
    logType: logType || undefined,
    page,
    limit,
  };

  const {
    data: conversationData,
    isLoading: isLoadingConversations,
    isError: isConversationError,
    error: conversationError,
  } = useQuery({
    queryKey: adminLogKeys.conversations(conversationParams),
    queryFn: () => fetchAdminConversationLogs(conversationParams),
    placeholderData: keepPreviousData,
    enabled: activeTab === 'conversations',
  });

  const {
    data: documentVerificationData,
    isLoading: isLoadingDocuments,
    isError: isDocumentError,
    error: documentError,
  } = useQuery({
    queryKey: adminLogKeys.documentVerifications(documentVerificationParams),
    queryFn: () => fetchAdminDocumentVerificationLogs(documentVerificationParams),
    placeholderData: keepPreviousData,
    enabled: activeTab === 'document-verifications',
  });

  const handleTabChange = (tab: LogType) => {
    setActiveTab(tab);
    setPage(1);
    setSearchTerm('');
    setUserId('');
    setCreatedFrom('');
    setCreatedTo('');
    setParticipant('');
    setLogType('');
    setUploadId('');
    setLocaleFilter('');
  };

  const handleReset = () => {
    setPage(1);
    setSearchTerm('');
    setUserId('');
    setCreatedFrom('');
    setCreatedTo('');
    setParticipant('');
    setLogType('');
    setUploadId('');
    setLocaleFilter('');
  };

  const isLoading = activeTab === 'conversations' ? isLoadingConversations : isLoadingDocuments;
  const isError = activeTab === 'conversations' ? isConversationError : isDocumentError;
  const error = activeTab === 'conversations' ? conversationError : documentError;

  const conversationLogs = conversationData?.data ?? [];
  const documentLogs = documentVerificationData?.data ?? [];
  const activeData = activeTab === 'conversations' ? conversationData : documentVerificationData;
  const activeLogs = activeTab === 'conversations' ? conversationLogs : documentLogs;
  const meta = activeData?.meta;
  const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{t('title')}</h1>
        <p className="mt-2 text-foreground/70">{t('description')}</p>
      </div>

      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => handleTabChange('conversations')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'conversations'
              ? 'border-b-2 border-primary text-primary'
              : 'text-foreground/70 hover:text-foreground'
          }`}
        >
          {t('tabs.conversations')}
        </button>
        <button
          onClick={() => handleTabChange('document-verifications')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'document-verifications'
              ? 'border-b-2 border-primary text-primary'
              : 'text-foreground/70 hover:text-foreground'
          }`}
        >
          {t('tabs.documentVerifications')}
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeTab === 'conversations' && (
            <>
              <div>
                <label htmlFor="search" className="mb-2 block text-sm font-medium">
                  {t('filters.search')}
                </label>
                <Input
                  id="search"
                  type="search"
                  placeholder={t('filters.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div>
                <label htmlFor="participant" className="mb-2 block text-sm font-medium">
                  {t('filters.participant')}
                </label>
                <Select
                  id="participant"
                  value={participant}
                  onChange={(e) => {
                    setParticipant(e.target.value as ConversationParticipant | '');
                    setPage(1);
                  }}
                >
                  <option value="">{t('filters.allParticipants')}</option>
                  <option value="CLIENT">{t('filters.participants.client')}</option>
                  <option value="SPECIALIST">{t('filters.participants.specialist')}</option>
                  <option value="SYSTEM">{t('filters.participants.system')}</option>
                  <option value="AI_ASSISTANT">{t('filters.participants.aiAssistant')}</option>
                </Select>
              </div>
              <div>
                <label htmlFor="localeFilter" className="mb-2 block text-sm font-medium">
                  {t('filters.locale')}
                </label>
                <Select
                  id="localeFilter"
                  value={localeFilter}
                  onChange={(e) => {
                    setLocaleFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">{t('filters.allLocales')}</option>
                  {supportedLocales.map((loc) => (
                    <option key={loc} value={loc}>
                      {localeLabels[loc].native}
                    </option>
                  ))}
                </Select>
              </div>
            </>
          )}
          {activeTab === 'document-verifications' && (
            <>
              <div>
                <label htmlFor="uploadId" className="mb-2 block text-sm font-medium">
                  {t('filters.uploadId')}
                </label>
                <Input
                  id="uploadId"
                  type="text"
                  placeholder={t('filters.uploadIdPlaceholder')}
                  value={uploadId}
                  onChange={(e) => {
                    setUploadId(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div>
                <label htmlFor="logType" className="mb-2 block text-sm font-medium">
                  {t('filters.logType')}
                </label>
                <Select
                  id="logType"
                  value={logType}
                  onChange={(e) => {
                    setLogType(e.target.value as 'status' | 'validation' | '');
                    setPage(1);
                  }}
                >
                  <option value="">{t('filters.allTypes')}</option>
                  <option value="status">{t('filters.logTypes.status')}</option>
                  <option value="validation">{t('filters.logTypes.validation')}</option>
                </Select>
              </div>
            </>
          )}
          <div>
            <label htmlFor="userId" className="mb-2 block text-sm font-medium">
              {t('filters.userId')}
            </label>
            <Input
              id="userId"
              type="text"
              placeholder={t('filters.userIdPlaceholder')}
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label htmlFor="createdFrom" className="mb-2 block text-sm font-medium">
              {t('filters.createdFrom')}
            </label>
            <Input
              id="createdFrom"
              type="date"
              value={createdFrom}
              onChange={(e) => {
                setCreatedFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label htmlFor="createdTo" className="mb-2 block text-sm font-medium">
              {t('filters.createdTo')}
            </label>
            <Input
              id="createdTo"
              type="date"
              value={createdTo}
              onChange={(e) => {
                setCreatedTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={handleReset}>
            {t('actions.reset')}
          </Button>
        </div>
      </div>

      {isError && (
        <div className="rounded-lg border border-red-500 bg-red-50 p-4 text-red-900">
          {isApiError(error) ? error.message : t('errors.loadError')}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <>
          {activeLogs.length > 0 ? (
            activeTab === 'conversations' ? (
              <ConversationLogsTable logs={conversationLogs} t={t} />
            ) : (
              <DocumentVerificationLogsTable logs={documentLogs} t={t} />
            )
          ) : (
            <div className="rounded-lg border border-border bg-card p-12 text-center">
              <p className="text-foreground/60">{t('noResults')}</p>
            </div>
          )}

          {meta && meta.total > 0 && (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <p className="text-sm text-foreground/70">
                {t('pagination.showing', {
                  start: (page - 1) * limit + 1,
                  end: Math.min(page * limit, meta.total),
                  total: meta.total,
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {commonT('pagination.previous')}
                </Button>
                <Button
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {commonT('pagination.next')}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface ConversationLogsTableProps {
  logs: AdminConversationLogEntry[];
  t: (key: string, values?: Record<string, unknown>) => string;
}

function ConversationLogsTable({ logs, t }: ConversationLogsTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t('table.conversations.timestamp')}</TableHeaderCell>
              <TableHeaderCell>{t('table.conversations.participant')}</TableHeaderCell>
              <TableHeaderCell>{t('table.conversations.message')}</TableHeaderCell>
              <TableHeaderCell>{t('table.conversations.userId')}</TableHeaderCell>
              <TableHeaderCell>{t('table.conversations.appointmentId')}</TableHeaderCell>
              <TableHeaderCell>{t('table.conversations.locale')}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => {
              const participantKey = getParticipantTranslationKey(log.participant);

              return (
                <TableRow key={log.id} hover>
                  <TableCell>
                    <div className="min-w-[140px] text-xs">{formatTimestamp(log.createdAt)}</div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getParticipantColor(log.participant)}`}
                    >
                      {t(`filters.participants.${participantKey}`)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="min-w-[240px] max-w-md truncate text-sm" title={log.message}>
                      {log.message}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div
                      className="min-w-[180px] text-xs font-mono text-foreground/60"
                      title={log.userId ?? undefined}
                    >
                      {formatIdentifier(log.userId)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div
                      className="min-w-[180px] text-xs font-mono text-foreground/60"
                      title={log.appointmentId ?? undefined}
                    >
                      {formatIdentifier(log.appointmentId)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="min-w-[100px] text-xs uppercase text-foreground/60">
                      {log.locale}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

interface DocumentVerificationLogsTableProps {
  logs: AdminDocumentVerificationLogEntry[];
  t: (key: string, values?: Record<string, unknown>) => string;
}

function DocumentVerificationLogsTable({ logs, t }: DocumentVerificationLogsTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t('table.documentVerifications.timestamp')}</TableHeaderCell>
              <TableHeaderCell>{t('table.documentVerifications.type')}</TableHeaderCell>
              <TableHeaderCell>{t('table.documentVerifications.details')}</TableHeaderCell>
              <TableHeaderCell>{t('table.documentVerifications.uploadId')}</TableHeaderCell>
              <TableHeaderCell>{t('table.documentVerifications.userId')}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => {
              const timestamp = log.type === 'status' ? log.createdAt : log.executedAt;

              return (
                <TableRow key={log.id} hover>
                  <TableCell>
                    <div className="min-w-[140px] text-xs">{formatTimestamp(timestamp)}</div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${log.type === 'status' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}
                    >
                      {t(`filters.logTypes.${log.type}`)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="min-w-[240px] max-w-md space-y-1 text-sm">
                      {log.type === 'status' ? (
                        <>
                          <div>
                            <span className="text-foreground/60">
                              {log.fromStatus || t('table.documentVerifications.initial')}
                            </span>
                            {' → '}
                            <span className="font-medium">{log.toStatus}</span>
                          </div>
                          {log.reason && (
                            <div className="text-xs text-foreground/60" title={log.reason}>
                              {log.reason}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div>
                            <span className="font-medium">{log.status}</span>
                          </div>
                          {log.message && (
                            <div className="text-xs text-foreground/60" title={log.message}>
                              {log.message}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div
                      className="min-w-[180px] text-xs font-mono text-foreground/60"
                      title={log.uploadId}
                    >
                      {formatIdentifier(log.uploadId)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div
                      className="min-w-[180px] text-xs font-mono text-foreground/60"
                      title={log.userId ?? undefined}
                    >
                      {formatIdentifier(log.userId)}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatIdentifier(id?: string | null): string {
  if (!id) {
    return '—';
  }

  if (id.length <= 12) {
    return id;
  }

  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

function getParticipantTranslationKey(participant: ConversationParticipant): string {
  switch (participant) {
    case 'CLIENT':
      return 'client';
    case 'SPECIALIST':
      return 'specialist';
    case 'SYSTEM':
      return 'system';
    case 'AI_ASSISTANT':
      return 'aiAssistant';
    default:
      return 'system';
  }
}

function getParticipantColor(participant: ConversationParticipant): string {
  switch (participant) {
    case 'CLIENT':
      return 'bg-green-100 text-green-800';
    case 'SPECIALIST':
      return 'bg-blue-100 text-blue-800';
    case 'SYSTEM':
      return 'bg-gray-100 text-gray-800';
    case 'AI_ASSISTANT':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
