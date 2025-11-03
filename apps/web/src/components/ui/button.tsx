import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const variantStyles = {
  primary:
    'bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 focus-visible:ring-primary/70',
  secondary:
    'border border-border bg-transparent text-foreground hover:bg-muted focus-visible:ring-muted-foreground/60',
  ghost: 'bg-transparent text-foreground hover:bg-muted focus-visible:ring-primary/30',
  destructive: 'bg-red-600 text-white shadow-soft hover:bg-red-700 focus-visible:ring-red-600/70',
  outline:
    'border border-border bg-transparent text-foreground hover:bg-foreground/5 focus-visible:ring-primary/30',
} as const;

const sizeStyles = {
  default: 'h-11 px-6 text-sm font-medium',
  sm: 'h-9 px-4 text-sm',
  lg: 'h-12 px-7 text-base',
} as const;

type Variant = keyof typeof variantStyles;
type Size = keyof typeof sizeStyles;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  isActive?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'default', isActive = false, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      data-active={isActive ? 'true' : undefined}
      aria-pressed={isActive ? true : undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background rtl:space-x-reverse disabled:pointer-events-none disabled:opacity-50',
        sizeStyles[size],
        variantStyles[variant],
        isActive && 'ring-2 ring-primary/60 ring-offset-2',
        className,
      )}
      {...props}
    />
  );
});
