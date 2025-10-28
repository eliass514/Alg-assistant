import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  error?: boolean;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, error = false, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        'block w-full appearance-none rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50',
        error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});
