import { createElement } from 'react';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type HeadingSize = 'xl' | 'lg' | 'md' | 'sm';

const headingSizes: Record<HeadingSize, string> = {
  xl: 'text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl',
  lg: 'text-3xl font-semibold leading-tight sm:text-4xl',
  md: 'text-2xl font-semibold sm:text-3xl',
  sm: 'text-xl font-semibold',
};

interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4';
  size?: HeadingSize;
}

export function Heading({ as = 'h2', size = 'lg', className, ...props }: HeadingProps) {
  return createElement(as, {
    className: cn('font-display tracking-tight text-balance', headingSizes[size], className),
    ...props,
  });
}

interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
  muted?: boolean;
}

export function Text({ className, muted = false, ...props }: TextProps) {
  return (
    <p
      className={cn(
        'text-base leading-relaxed text-balance text-foreground/90 sm:text-lg',
        muted && 'text-foreground/70',
        className,
      )}
      {...props}
    />
  );
}
