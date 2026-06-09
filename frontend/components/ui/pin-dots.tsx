import { cn } from '@/lib/utils';

interface Props {
  filled: number;
  total?: number;
  className?: string;
}

export function PinDots({ filled, total = 4, className }: Props): React.ReactElement {
  return (
    <div className={cn('flex items-center justify-center gap-2.5', className)} aria-label="PIN">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'size-3.5 rounded-full border-2 transition-colors',
            i < filled
              ? 'bg-primary border-primary'
              : 'bg-transparent border-[color:var(--border-2)]',
          )}
        />
      ))}
    </div>
  );
}
