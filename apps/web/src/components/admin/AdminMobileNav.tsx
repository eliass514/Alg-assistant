'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

export function AdminMobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations('Admin.Layout');

  const toggleLabel = isOpen ? t('closeMenu') : t('openMenu');

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center rounded-md p-2 text-foreground/80 transition hover:bg-accent hover:text-foreground"
        aria-label={toggleLabel}
        aria-expanded={isOpen}
      >
        <svg
          className="h-6 w-6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 end-0 z-50 w-full max-w-xs bg-background shadow-lg">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-border px-4 py-4">
                <span className="text-lg font-semibold">{t('brand')}</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-md p-2 text-foreground/80 transition hover:bg-accent hover:text-foreground"
                  aria-label={t('closeMenu')}
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
                <Link
                  href="/admin/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="block rounded-md px-4 py-3 text-sm font-medium text-foreground/80 transition hover:bg-accent hover:text-foreground"
                >
                  {t('dashboardLink')}
                </Link>
                <Link
                  href="/admin/users"
                  onClick={() => setIsOpen(false)}
                  className="block rounded-md px-4 py-3 text-sm font-medium text-foreground/80 transition hover:bg-accent hover:text-foreground"
                >
                  {t('usersLink')}
                </Link>
                <Link
                  href="/admin/services"
                  onClick={() => setIsOpen(false)}
                  className="block rounded-md px-4 py-3 text-sm font-medium text-foreground/80 transition hover:bg-accent hover:text-foreground"
                >
                  {t('servicesLink')}
                </Link>
                <Link
                  href="/admin/categories"
                  onClick={() => setIsOpen(false)}
                  className="block rounded-md px-4 py-3 text-sm font-medium text-foreground/80 transition hover:bg-accent hover:text-foreground"
                >
                  {t('categoriesLink')}
                </Link>
                <Link
                  href="/admin/appointments"
                  onClick={() => setIsOpen(false)}
                  className="block rounded-md px-4 py-3 text-sm font-medium text-foreground/80 transition hover:bg-accent hover:text-foreground"
                >
                  {t('appointmentsLink')}
                </Link>
                <Link
                  href="/admin/document-templates"
                  onClick={() => setIsOpen(false)}
                  className="block rounded-md px-4 py-3 text-sm font-medium text-foreground/80 transition hover:bg-accent hover:text-foreground"
                >
                  {t('documentTemplatesLink')}
                </Link>
                <Link
                  href="/admin/logs"
                  onClick={() => setIsOpen(false)}
                  className="block rounded-md px-4 py-3 text-sm font-medium text-foreground/80 transition hover:bg-accent hover:text-foreground"
                >
                  {t('logsLink')}
                </Link>
                <Link
                  href="/admin/settings"
                  onClick={() => setIsOpen(false)}
                  className="block rounded-md px-4 py-3 text-sm font-medium text-foreground/80 transition hover:bg-accent hover:text-foreground"
                >
                  {t('settingsLink')}
                </Link>
                <div className="border-t border-border pt-4">
                  <Link
                    href="/"
                    onClick={() => setIsOpen(false)}
                    className="block rounded-md px-4 py-3 text-sm font-medium text-foreground/80 transition hover:bg-accent hover:text-foreground"
                  >
                    {t('exitAdmin')}
                  </Link>
                </div>
              </nav>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
