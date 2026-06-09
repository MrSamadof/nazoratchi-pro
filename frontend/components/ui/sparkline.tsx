interface SparklineProps {
  values: number[];
  color?: string;
  height?: number;
  width?: number;
  fill?: boolean;
  className?: string;
}

export function Sparkline({
  values,
  color = 'var(--primary)',
  height = 26,
  width = 90,
  fill = true,
  className,
}: SparklineProps): React.ReactElement {
  if (values.length < 2) {
    return <svg width={width} height={height} className={className} />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const norm = values.map((v) => (v - min) / range);
  const stepX = width / (values.length - 1);
  const pts = norm.map((v, i) => [i * stepX, height - v * (height - 2) - 1] as const);
  const line = pts
    .map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1))
    .join(' ');
  const area = line + ` L ${width} ${height} L 0 ${height} Z`;
  const last = pts[pts.length - 1]!;

  return (
    <svg width={width} height={height} className={className} style={{ display: 'block', overflow: 'visible' }}>
      {fill && <path d={area} fill={color} opacity="0.15" />}
      <path
        d={line}
        stroke={color}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="2.4" fill={color} />
    </svg>
  );
}
