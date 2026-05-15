// components/brand/Logo.tsx
interface LogoMarkProps {
  size?: number
  color?: string
  ink?: string
}

export function LogoMark({ size = 32, color = '#FF91A4', ink = '#141414' }: LogoMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <circle cx="22" cy="32" r="20" fill={color} />
      <circle cx="42" cy="32" r="16" fill={ink} opacity="0.85" />
    </svg>
  )
}

interface LogoWordmarkProps {
  size?: number
  dark?: boolean
}

export function LogoWordmark({ size = 28, dark = false }: LogoWordmarkProps) {
  const inkColor = dark ? '#FAF6F2' : '#141414'
  return (
    <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: size * 0.18, lineHeight: 1 }}>
      <LogoMark size={size} ink={inkColor} />
      <span style={{
        fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
        fontSize: size * 1.05,
        fontWeight: 700,
        letterSpacing: '-0.04em',
        color: inkColor,
        lineHeight: 1,
      }}>
        Ka<span style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontWeight: 400 }}>y</span>a
      </span>
    </div>
  )
}
