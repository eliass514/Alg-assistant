import { cn } from '@/lib/utils';

const sizeVariants = {
  sm: 'h-4 w-4 border-[2px]',
  md: 'h-5 w-5 border-[2.5px]',
  lg: 'h-7 w-7 border-[3px]',
} as const;

export type SpinnerSize = keyof typeof sizeVariants;

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <span role="status" aria-live="polite" className={cn('inline-flex items-center', className)}>
      <span
        className={cn(
          'inline-flex animate-spin rounded-full border-current border-t-transparent text-primary',
          sizeVariants[size],
        )}
      />
    </span>
  );
}
