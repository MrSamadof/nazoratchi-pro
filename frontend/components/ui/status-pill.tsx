import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const pillVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11.5px] font-medium leading-tight whitespace-nowrap',
  {
    variants: {
      tone: {
        emerald: 'bg-[color:var(--emerald-soft)] text-[color:var(--emerald)]',
        amber: 'bg-[color:var(--amber-soft)] text-[color:var(--amber-ink)]',
        rose: 'bg-[color:var(--rose-soft)] text-[color:var(--rose)]',
        accent: 'bg-accent text-accent-foreground',
        neutral: 'bg-[color:var(--background-2)] text-[color:var(--ink-2)]',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

const dotColor: Record<NonNullable<VariantProps<typeof pillVariants>['tone']>, string> = {
  emerald: 'var(--emerald)',
  amber: 'var(--amber)',
  rose: 'var(--rose)',
  accent: 'var(--primary)',
  neutral: 'var(--ink-3)',
};

export interface StatusPillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof pillVariants> {}

export function StatusPill({ tone, className, children, ...rest }: StatusPillProps): React.ReactElement {
  return (
    <span className={cn(pillVariants({ tone }), className)} {...rest}>
      <span
        className="size-1.5 rounded-full shrink-0"
        style={{ background: dotColor[tone ?? 'neutral'] }}
      />
      {children}
    </span>
  );
}
