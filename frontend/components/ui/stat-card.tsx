import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Tone = 'emerald' | 'amber' | 'rose' | 'accent' | undefined;

interface Props {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  foot?: React.ReactNode;
  tone?: Tone;
  icon?: React.ReactNode;
  className?: string;
}

const toneColor: Record<Exclude<Tone, undefined>, string> = {
  emerald: 'var(--emerald)',
  amber: 'var(--amber-ink)',
  rose: 'var(--rose)',
  accent: 'var(--primary)',
};

const toneBg: Record<Exclude<Tone, undefined>, string> = {
  emerald: 'color-mix(in oklch, var(--emerald) 12%, transparent)',
  amber: 'color-mix(in oklch, var(--amber) 14%, transparent)',
  rose: 'color-mix(in oklch, var(--rose) 12%, transparent)',
  accent: 'color-mix(in oklch, var(--primary) 12%, transparent)',
};

export function StatCard({ label, value, unit, delta, foot, tone, icon, className }: Props): React.ReactElement {
  const color = tone ? toneColor[tone] : 'var(--foreground)';
  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-start justify-between">
        <div className="text-[12.5px] font-medium text-[color:var(--ink-2)]">{label}</div>
        {icon && (
          <span
            className="inline-grid place-items-center size-7 rounded-lg [&_svg]:size-3.5"
            style={{
              background: tone ? toneBg[tone] : 'var(--background-2)',
              color: tone ? toneColor[tone] : 'var(--ink-2)',
            }}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2.5 flex items-baseline gap-1.5">
        <span
          className="text-[28px] font-semibold tracking-[-0.025em] tabular"
          style={{ color }}
        >
          {value}
        </span>
        {unit && (
          <span className="text-[12.5px] font-medium text-[color:var(--ink-3)]">{unit}</span>
        )}
      </div>
      {(delta || foot) && (
        <div className="mt-2 text-[11.5px] text-[color:var(--ink-3)] flex items-center gap-1.5">
          {delta && (
            <Badge tone={delta.startsWith('+') ? 'emerald' : 'rose'}>{delta}</Badge>
          )}
          {foot}
        </div>
      )}
    </Card>
  );
}
