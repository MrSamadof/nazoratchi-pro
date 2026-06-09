interface Props {
  size?: number;
  showText?: boolean;
  className?: string;
  accent?: string;
  textColor?: string;
}

export function NPMark({ size = 28, accent = 'var(--primary)', className }: Props): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden
    >
      <rect x="2" y="2" width="28" height="28" rx="9" fill={accent} />
      <path
        d="M9 22V10l8 12V10"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="22.5" cy="22.5" r="2" fill="#fff" />
    </svg>
  );
}

export function NPLogo({
  size = 28,
  showText = true,
  accent = 'var(--primary)',
  textColor = 'var(--foreground)',
  className,
}: Props): React.ReactElement {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <NPMark size={size} accent={accent} />
      {showText && (
        <span
          style={{
            fontWeight: 600,
            color: textColor,
            fontSize: size * 0.55,
            letterSpacing: '-0.02em',
          }}
        >
          Nazoratchi
          <span style={{ color: accent, fontWeight: 600 }}> AI</span>
        </span>
      )}
    </span>
  );
}
