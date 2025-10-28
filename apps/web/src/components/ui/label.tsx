import type { LabelHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  required?: boolean;
};

export function Label({ className, required, children, ...props }: LabelProps) {
  return (
    <label
      className={cn('mb-1.5 block text-sm font-medium text-foreground/90', className)}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ms-1">*</span>}
    </label>
  );
}
