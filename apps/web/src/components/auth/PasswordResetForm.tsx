'use client';

import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next-intl/navigation';
import { useMutation } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { requestPasswordReset, resetPassword } from '@/lib/api/auth';
import { isApiError } from '@/lib/api/client';

interface PasswordResetFormProps {
  token?: string | null;
}

export function PasswordResetForm({ token }: PasswordResetFormProps) {
  const t = useTranslations('Auth.PasswordReset');
  const messages = useTranslations('Auth.Messages');
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const requestMutation = useMutation({
    mutationFn: requestPasswordReset,
  });

  const resetMutation = useMutation({
    mutationFn: resetPassword,
  });

  const isRequestFlow = !token;
  const isPending = requestMutation.isPending || resetMutation.isPending;

  const handleRequestChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (isRequestFlow) {
      const trimmedEmail = email.trim();

      if (!trimmedEmail) {
        setError(t('errors.missingEmail'));
        return;
      }

      try {
        await requestMutation.mutateAsync({ email: trimmedEmail, locale });
        setSuccessMessage(t('success.requested'));
      } catch (cause) {
        if (isApiError(cause)) {
          setError(cause.message);
          return;
        }

        setError(t('errors.generic'));
      }

      return;
    }

    if (!password || password.length < 8) {
      setError(t('errors.passwordLength'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('errors.passwordMismatch'));
      return;
    }

    try {
      await resetMutation.mutateAsync({ token: token ?? '', password, confirmPassword });
      setSuccessMessage(t('success.updated'));
      setPassword('');
      setConfirmPassword('');
    } catch (cause) {
      if (isApiError(cause)) {
        setError(cause.message);
        return;
      }

      setError(t('errors.generic'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {isRequestFlow ? (
        <div className="space-y-2 text-sm">
          <label className="block font-medium text-foreground" htmlFor="email">
            {t('fields.email')}
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t('placeholders.email')}
            value={email}
            onChange={handleRequestChange}
            disabled={isPending}
            required
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
          <div className="space-y-2 text-sm">
            <label className="block font-medium text-foreground" htmlFor="password">
              {t('fields.password')}
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder={t('placeholders.password')}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isPending}
              required
            />
          </div>
          <div className="space-y-2 text-sm">
            <label className="block font-medium text-foreground" htmlFor="confirmPassword">
              {t('fields.confirmPassword')}
            </label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder={t('placeholders.confirmPassword')}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={isPending}
              required
            />
          </div>
        </div>
      )}
      {error ? <p className="text-sm font-medium text-red-500">{error}</p> : null}
      {successMessage ? <p className="text-sm font-medium text-primary">{successMessage}</p> : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner size="sm" />
            {messages('processing')}
          </span>
        ) : isRequestFlow ? (
          t('submit.request')
        ) : (
          t('submit.reset')
        )}
      </Button>
      {!isRequestFlow && successMessage ? (
        <div className="text-sm text-foreground/70 rtl:text-right">
          <button
            type="button"
            className="text-primary underline-offset-4 hover:underline"
            onClick={() => router.replace('/login')}
          >
            {t('actions.backToLogin')}
          </button>
        </div>
      ) : null}
    </form>
  );
}
