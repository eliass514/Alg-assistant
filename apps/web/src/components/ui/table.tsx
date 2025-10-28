import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type TableElement<T> = T & {
  className?: string;
};

type TableSectionProps = TableElement<HTMLAttributes<HTMLTableSectionElement>>;

type TableCellProps = TableElement<HTMLAttributes<HTMLTableCellElement>> & {
  align?: 'left' | 'center' | 'right';
};

type TableRowProps = TableElement<HTMLAttributes<HTMLTableRowElement>> & {
  hover?: boolean;
};

type TableProps = TableElement<HTMLAttributes<HTMLTableElement>> & {
  children: ReactNode;
};

export function Table({ className, children, ...props }: TableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn(
          'w-full border-separate border-spacing-0 text-sm text-foreground/90',
          className,
        )}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHead({ className, ...props }: TableSectionProps) {
  return (
    <thead
      className={cn('bg-muted/40 text-left text-xs uppercase text-foreground/70', className)}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: TableSectionProps) {
  return <tbody className={cn('divide-y divide-border/70', className)} {...props} />;
}

export function TableRow({ className, hover = false, ...props }: TableRowProps) {
  return (
    <tr
      className={cn('bg-background transition-colors', hover && 'hover:bg-muted/40', className)}
      {...props}
    />
  );
}

export function TableHeaderCell({ className, align = 'left', ...props }: TableCellProps) {
  return (
    <th
      className={cn('border-b border-border/70 px-4 py-3 font-semibold text-foreground', className)}
      scope="col"
      style={{ textAlign: align }}
      {...props}
    />
  );
}

export function TableCell({ className, align = 'left', ...props }: TableCellProps) {
  return (
    <td
      className={cn('px-4 py-3 align-middle text-foreground/80', className)}
      style={{ textAlign: align }}
      {...props}
    />
  );
}
