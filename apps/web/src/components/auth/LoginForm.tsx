'use client';

import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next-intl/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/lib/api/auth';
import { isApiError } from '@/lib/api/client';
import { authKeys } from '@/lib/react-query/keys';
import type { LoginPayload } from '@/types';

export function LoginForm() {
  const t = useTranslations('Auth.Login');
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formValues, setFormValues] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const user = await login(payload);
      const keyLocale = payload.locale ?? locale;
      queryClient.setQueryData([...authKeys.user(), keyLocale], user);
      return user;
    },
  });

  const handleChange = (field: 'email' | 'password') => (event: ChangeEvent<HTMLInputElement>) => {
    setFormValues((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const email = formValues.email.trim();
    const password = formValues.password.trim();

    if (!email || !password) {
      setError(t('errors.missingFields'));
      return;
    }

    try {
      await loginMutation.mutateAsync({ email, password, locale });
      router.replace('/profile');
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
          value={formValues.email}
          onChange={handleChange('email')}
          disabled={loginMutation.isPending}
          required
        />
      </div>
      <div className="space-y-2 text-sm">
        <label className="block font-medium text-foreground" htmlFor="password">
          {t('fields.password')}
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder={t('placeholders.password')}
          value={formValues.password}
          onChange={handleChange('password')}
          disabled={loginMutation.isPending}
          required
        />
      </div>
      {error ? <p className="text-sm font-medium text-red-500">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
        {loginMutation.isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner size="sm" />
            {t('submit.pending')}
          </span>
        ) : (
          t('submit.idle')
        )}
      </Button>
      <div className="text-sm text-foreground/70 rtl:text-right">
        <button
          type="button"
          className="text-primary underline-offset-4 hover:underline"
          onClick={() => router.push('/password-reset')}
          disabled={loginMutation.isPending}
        >
          {t('actions.forgotPassword')}
        </button>
      </div>
    </form>
  );
}
