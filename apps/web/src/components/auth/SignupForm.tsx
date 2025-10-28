'use client';

import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next-intl/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { signup } from '@/lib/api/auth';
import { isApiError } from '@/lib/api/client';
import { authKeys } from '@/lib/react-query/keys';
import type { SignupPayload } from '@/types';

interface SignupFormState {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
}

const INITIAL_STATE: SignupFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  password: '',
  confirmPassword: '',
};

export function SignupForm() {
  const t = useTranslations('Auth.Signup');
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formValues, setFormValues] = useState<SignupFormState>(INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);

  const signupMutation = useMutation({
    mutationFn: async (payload: SignupPayload) => {
      const user = await signup(payload);
      const keyLocale = payload.locale ?? locale;
      queryClient.setQueryData([...authKeys.user(), keyLocale], user);
      return user;
    },
  });

  const handleChange = (field: keyof SignupFormState) => (event: ChangeEvent<HTMLInputElement>) => {
    setFormValues((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const { firstName, lastName, email, phoneNumber, password, confirmPassword } = formValues;

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError(t('errors.missingFields'));
      return;
    }

    if (password.length < 8) {
      setError(t('errors.passwordLength'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('errors.passwordMismatch'));
      return;
    }

    try {
      await signupMutation.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        password,
        confirmPassword,
        locale,
      });

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
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
        <div className="space-y-2 text-sm">
          <label className="block font-medium text-foreground" htmlFor="firstName">
            {t('fields.firstName')}
          </label>
          <Input
            id="firstName"
            name="firstName"
            autoComplete="given-name"
            placeholder={t('placeholders.firstName')}
            value={formValues.firstName}
            onChange={handleChange('firstName')}
            disabled={signupMutation.isPending}
            required
          />
        </div>
        <div className="space-y-2 text-sm">
          <label className="block font-medium text-foreground" htmlFor="lastName">
            {t('fields.lastName')}
          </label>
          <Input
            id="lastName"
            name="lastName"
            autoComplete="family-name"
            placeholder={t('placeholders.lastName')}
            value={formValues.lastName}
            onChange={handleChange('lastName')}
            disabled={signupMutation.isPending}
            required
          />
        </div>
      </div>
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
          disabled={signupMutation.isPending}
          required
        />
      </div>
      <div className="space-y-2 text-sm">
        <label className="block font-medium text-foreground" htmlFor="phoneNumber">
          {t('fields.phoneNumber')}
        </label>
        <Input
          id="phoneNumber"
          name="phoneNumber"
          type="tel"
          autoComplete="tel"
          placeholder={t('placeholders.phoneNumber')}
          value={formValues.phoneNumber}
          onChange={handleChange('phoneNumber')}
          disabled={signupMutation.isPending}
        />
      </div>
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
            value={formValues.password}
            onChange={handleChange('password')}
            disabled={signupMutation.isPending}
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
            value={formValues.confirmPassword}
            onChange={handleChange('confirmPassword')}
            disabled={signupMutation.isPending}
            required
          />
        </div>
      </div>
      {error ? <p className="text-sm font-medium text-red-500">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={signupMutation.isPending}>
        {signupMutation.isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner size="sm" />
            {t('submit.pending')}
          </span>
        ) : (
          t('submit.idle')
        )}
      </Button>
    </form>
  );
}
