'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
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
import { DocumentTemplateForm } from './DocumentTemplateForm';
import {
  fetchAdminDocumentTemplates,
  createAdminDocumentTemplate,
  updateAdminDocumentTemplate,
  deleteAdminDocumentTemplate,
  uploadDocumentTemplateFile,
} from '@/lib/api/admin-document-templates';
import { fetchAdminServices } from '@/lib/api/admin-services';
import { adminDocumentTemplateKeys, adminServiceKeys } from '@/lib/react-query/keys';
import { isApiError } from '@/lib/api/client';
import type { DocumentTemplate } from '@/types/admin';
import type { AdminDocumentTemplateFormData } from '@/types/admin';

export function DocumentTemplatesManagementPage() {
  const locale = useLocale();
  const t = useTranslations('Admin.DocumentTemplates');
  const commonT = useTranslations('Common');
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<DocumentTemplate | null>(null);
  const [uploadingTemplate, setUploadingTemplate] = useState<DocumentTemplate | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const limit = 25;

  const {
    data: templatesData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: adminDocumentTemplateKeys.list({ locale, search: searchTerm, page, limit }),
    queryFn: () => fetchAdminDocumentTemplates({ locale, search: searchTerm, page, limit }),
    placeholderData: keepPreviousData,
  });

  const { data: servicesData } = useQuery({
    queryKey: adminServiceKeys.list({ locale, limit: 100 }),
    queryFn: () => fetchAdminServices({ locale, limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: createAdminDocumentTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminDocumentTemplateKeys.all });
      setIsCreateDialogOpen(false);
      setSuccessMessage(t('messages.createSuccess'));
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err) => {
      const message = isApiError(err) ? err.message : t('messages.error');
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AdminDocumentTemplateFormData> }) =>
      updateAdminDocumentTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminDocumentTemplateKeys.all });
      setEditingTemplate(null);
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
    mutationFn: deleteAdminDocumentTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminDocumentTemplateKeys.all });
      setDeletingTemplate(null);
      setSuccessMessage(t('messages.deleteSuccess'));
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err) => {
      const message = isApiError(err) ? err.message : t('messages.error');
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadDocumentTemplateFile(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminDocumentTemplateKeys.all });
      setUploadingTemplate(null);
      setSelectedFile(null);
      setSuccessMessage(t('messages.uploadSuccess'));
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err) => {
      const message = isApiError(err) ? err.message : t('messages.error');
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  const handleCreateSubmit = async (formData: AdminDocumentTemplateFormData) => {
    await createMutation.mutateAsync(formData);
  };

  const handleUpdateSubmit = async (formData: AdminDocumentTemplateFormData) => {
    if (!editingTemplate) return;
    await updateMutation.mutateAsync({ id: editingTemplate.id, data: formData });
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    await deleteMutation.mutateAsync(deletingTemplate.id);
  };

  const handleUpload = async () => {
    if (!uploadingTemplate || !selectedFile) return;
    await uploadMutation.mutateAsync({ id: uploadingTemplate.id, file: selectedFile });
  };

  const templates = templatesData?.data ?? [];
  const services = servicesData?.data ?? [];
  const totalPages = templatesData?.meta
    ? Math.ceil(templatesData.meta.total / templatesData.meta.limit)
    : 1;

  return (
    <Section>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{t('title')}</h1>
            <p className="mt-2 text-foreground/70">{t('description')}</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="self-start">
            {t('actions.create')}
          </Button>
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

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="sm:flex-1">
            <Input
              type="search"
              placeholder={t('actions.search')}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: adminDocumentTemplateKeys.all })
            }
            className="w-full sm:w-auto"
          >
            {t('actions.refresh')}
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-card">
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
          ) : templates.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-foreground/60">{t('table.empty')}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>{t('table.name')}</TableHeaderCell>
                      <TableHeaderCell>{t('table.services')}</TableHeaderCell>
                      <TableHeaderCell>{t('table.versions')}</TableHeaderCell>
                      <TableHeaderCell>{t('table.status')}</TableHeaderCell>
                      <TableHeaderCell align="right">{t('table.actions')}</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id} hover>
                        <TableCell>
                          <div className="min-w-[200px]">
                            <span className="font-medium">{template.name}</span>
                            {template.description && (
                              <p className="mt-0.5 text-xs text-foreground/60">
                                {template.description}
                              </p>
                            )}
                          </div>
                          <code className="mt-1 block text-xs text-foreground/50">
                            {template.slug}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-[150px]">
                            {template.services && template.services.length > 0 ? (
                              <div className="space-y-1">
                                {template.services.slice(0, 2).map((service) => (
                                  <div key={service.id} className="text-xs">
                                    {service.service.translations[0]?.name || service.service.slug}
                                  </div>
                                ))}
                                {template.services.length > 2 && (
                                  <div className="text-xs text-foreground/60">
                                    +{template.services.length - 2} {t('table.more')}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-foreground/50">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-[100px]">
                            {template.versions && template.versions.length > 0 ? (
                              <div className="text-sm">
                                {template.versions.length} {t('table.versionsCount')}
                              </div>
                            ) : (
                              <span className="text-sm text-foreground/50">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              template.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {template.isActive ? t('table.active') : t('table.inactive')}
                          </span>
                        </TableCell>
                        <TableCell align="right">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setUploadingTemplate(template)}
                            >
                              {t('actions.upload')}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingTemplate(template)}
                            >
                              {t('actions.edit')}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingTemplate(template)}
                            >
                              {t('actions.delete')}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

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

      <Dialog open={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>{t('form.createTitle')}</DialogTitle>
          <DialogCloseButton onClick={() => setIsCreateDialogOpen(false)}>
            {commonT('actions.close')}
          </DialogCloseButton>
        </DialogHeader>
        <DialogBody>
          <DocumentTemplateForm
            services={services}
            onSubmit={handleCreateSubmit}
            onCancel={() => setIsCreateDialogOpen(false)}
            isSubmitting={createMutation.isPending}
          />
        </DialogBody>
      </Dialog>

      <Dialog open={!!editingTemplate} onClose={() => setEditingTemplate(null)}>
        <DialogHeader>
          <DialogTitle>{t('form.editTitle')}</DialogTitle>
          <DialogCloseButton onClick={() => setEditingTemplate(null)}>
            {commonT('actions.close')}
          </DialogCloseButton>
        </DialogHeader>
        <DialogBody>
          {editingTemplate && (
            <DocumentTemplateForm
              services={services}
              initialData={editingTemplate}
              onSubmit={handleUpdateSubmit}
              onCancel={() => setEditingTemplate(null)}
              isSubmitting={updateMutation.isPending}
            />
          )}
        </DialogBody>
      </Dialog>

      <Dialog open={!!deletingTemplate} onClose={() => setDeletingTemplate(null)}>
        <DialogHeader>
          <DialogTitle>{t('delete.title')}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-sm text-foreground/80">{t('delete.message')}</p>
          {deletingTemplate && <p className="mt-2 font-medium">{deletingTemplate.name}</p>}
        </DialogBody>
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => setDeletingTemplate(null)}
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

      <Dialog open={!!uploadingTemplate} onClose={() => setUploadingTemplate(null)}>
        <DialogHeader>
          <DialogTitle>{t('upload.title')}</DialogTitle>
          <DialogCloseButton onClick={() => setUploadingTemplate(null)}>
            {commonT('actions.close')}
          </DialogCloseButton>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            {uploadingTemplate && (
              <div>
                <p className="text-sm font-medium">{uploadingTemplate.name}</p>
                <p className="text-xs text-foreground/60">{uploadingTemplate.slug}</p>
              </div>
            )}
            <div>
              <label
                htmlFor="file-upload"
                className="block text-sm font-medium text-foreground mb-2"
              >
                {t('upload.fileLabel')}
              </label>
              <input
                id="file-upload"
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                disabled={uploadMutation.isPending}
                className="block w-full text-sm text-foreground/70 file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-primary/90"
              />
              <p className="mt-1 text-xs text-foreground/60">{t('upload.fileHint')}</p>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => {
              setUploadingTemplate(null);
              setSelectedFile(null);
            }}
            disabled={uploadMutation.isPending}
          >
            {commonT('actions.cancel')}
          </Button>
          <Button onClick={handleUpload} disabled={uploadMutation.isPending || !selectedFile}>
            {uploadMutation.isPending ? commonT('actions.saving') : t('upload.confirm')}
          </Button>
        </DialogFooter>
      </Dialog>
    </Section>
  );
}
