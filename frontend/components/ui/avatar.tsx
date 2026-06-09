interface Props {
  name: string;
  size?: number;
  className?: string;
}

const TINTS: [string, string][] = [
  ['oklch(0.93 0.06 268)', 'oklch(0.36 0.14 268)'],
  ['oklch(0.93 0.06 162)', 'oklch(0.36 0.12 162)'],
  ['oklch(0.93 0.06 78)',  'oklch(0.40 0.10 78)'],
  ['oklch(0.93 0.06 22)',  'oklch(0.40 0.12 22)'],
  ['oklch(0.93 0.04 305)', 'oklch(0.38 0.12 305)'],
];

export function Avatar({ name, size = 32, className }: Props): React.ReactElement {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [bg, fg] = TINTS[h % TINTS.length]!;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold shrink-0 ${className ?? ''}`}
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        fontSize: size * 0.38,
        letterSpacing: '-0.01em',
      }}
    >
      {initials}
    </span>
  );
}
