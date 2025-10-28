'use client';

import type { ReactNode } from 'react';

import { AdminGuard } from '@/components/auth/AdminGuard';

interface AdminTemplateProps {
  children: ReactNode;
}

export default function AdminTemplate({ children }: AdminTemplateProps) {
  return <AdminGuard fallbackPath="/">{children}</AdminGuard>;
}
