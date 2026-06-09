import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium tracking-[-0.005em] leading-tight',
  {
    variants: {
      tone: {
        neutral: 'bg-[color:var(--background-2)] text-[color:var(--ink-2)]',
        accent: 'bg-accent text-accent-foreground',
        emerald: 'bg-[color:var(--emerald-soft)] text-[color:var(--emerald)]',
        amber: 'bg-[color:var(--amber-soft)] text-[color:var(--amber-ink)]',
        rose: 'bg-[color:var(--rose-soft)] text-[color:var(--rose)]',
        ink: 'bg-foreground text-background',
        outline: 'border border-[color:var(--border-2)] text-[color:var(--ink-2)]',
      },
      variant: {
        default: '',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-[color:var(--rose)] text-white',
        success: 'bg-[color:var(--emerald)] text-white',
        warning: 'bg-[color:var(--amber)] text-white',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, tone, variant, dot, children, ...props }: BadgeProps): React.ReactElement {
  return (
    <div className={cn(badgeVariants({ tone, variant }), className)} {...props}>
      {dot && (
        <span
          className="size-1.5 rounded-full opacity-80"
          style={{ background: 'currentcolor' }}
        />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
