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
import { CategoryForm } from './CategoryForm';
import {
  fetchAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
} from '@/lib/api/admin-services';
import { adminCategoryKeys } from '@/lib/react-query/keys';
import { isApiError } from '@/lib/api/client';
import type { ServiceCategory } from '@/types';
import type { AdminServiceCategoryFormData } from '@/types/admin';

export function CategoriesManagementPage() {
  const locale = useLocale();
  const t = useTranslations('Admin.Categories');
  const commonT = useTranslations('Common');
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<ServiceCategory | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const limit = 25;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: adminCategoryKeys.list({ locale, search: searchTerm, page, limit }),
    queryFn: () => fetchAdminCategories({ locale, search: searchTerm, page, limit }),
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: createAdminCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCategoryKeys.all });
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
    mutationFn: ({ id, data }: { id: string; data: Partial<AdminServiceCategoryFormData> }) =>
      updateAdminCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCategoryKeys.all });
      setEditingCategory(null);
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
    mutationFn: deleteAdminCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCategoryKeys.all });
      setDeletingCategory(null);
      setSuccessMessage(t('messages.deleteSuccess'));
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err) => {
      const message = isApiError(err) ? err.message : t('messages.error');
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  const handleCreateSubmit = async (formData: AdminServiceCategoryFormData) => {
    await createMutation.mutateAsync(formData);
  };

  const handleUpdateSubmit = async (formData: AdminServiceCategoryFormData) => {
    if (!editingCategory) return;
    await updateMutation.mutateAsync({ id: editingCategory.id, data: formData });
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    await deleteMutation.mutateAsync(deletingCategory.id);
  };

  const categories = data?.data ?? [];
  const totalPages = data?.meta ? Math.ceil(data.meta.total / data.meta.limit) : 1;

  return (
    <Section>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="mt-2 text-foreground/70">{t('description')}</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>{t('actions.create')}</Button>
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

        <div className="flex items-center gap-4">
          <div className="flex-1">
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
            onClick={() => queryClient.invalidateQueries({ queryKey: adminCategoryKeys.all })}
          >
            {t('actions.refresh')}
          </Button>
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
          ) : categories.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-foreground/60">{t('table.empty')}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{t('table.name')}</TableHeaderCell>
                    <TableHeaderCell>{t('table.slug')}</TableHeaderCell>
                    <TableHeaderCell>{t('table.status')}</TableHeaderCell>
                    <TableHeaderCell align="right">{t('table.actions')}</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id} hover>
                      <TableCell>
                        <span className="font-medium">{category.translation?.name || '—'}</span>
                        {category.translation?.description && (
                          <p className="mt-0.5 text-xs text-foreground/60">
                            {category.translation.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-2 py-1 text-xs">{category.slug}</code>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            category.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {category.isActive ? t('table.active') : t('table.inactive')}
                        </span>
                      </TableCell>
                      <TableCell align="right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingCategory(category)}
                          >
                            {t('actions.edit')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingCategory(category)}
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

      <Dialog open={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>{t('form.createTitle')}</DialogTitle>
          <DialogCloseButton onClick={() => setIsCreateDialogOpen(false)}>
            {commonT('actions.close')}
          </DialogCloseButton>
        </DialogHeader>
        <DialogBody>
          <CategoryForm
            onSubmit={handleCreateSubmit}
            onCancel={() => setIsCreateDialogOpen(false)}
            isSubmitting={createMutation.isPending}
          />
        </DialogBody>
      </Dialog>

      <Dialog open={!!editingCategory} onClose={() => setEditingCategory(null)}>
        <DialogHeader>
          <DialogTitle>{t('form.editTitle')}</DialogTitle>
          <DialogCloseButton onClick={() => setEditingCategory(null)}>
            {commonT('actions.close')}
          </DialogCloseButton>
        </DialogHeader>
        <DialogBody>
          {editingCategory && (
            <CategoryForm
              initialData={editingCategory}
              onSubmit={handleUpdateSubmit}
              onCancel={() => setEditingCategory(null)}
              isSubmitting={updateMutation.isPending}
            />
          )}
        </DialogBody>
      </Dialog>

      <Dialog open={!!deletingCategory} onClose={() => setDeletingCategory(null)}>
        <DialogHeader>
          <DialogTitle>{t('delete.title')}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-sm text-foreground/80">{t('delete.message')}</p>
          {deletingCategory && (
            <p className="mt-2 font-medium">{deletingCategory.translation?.name}</p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => setDeletingCategory(null)}
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
