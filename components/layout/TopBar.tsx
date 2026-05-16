interface TopBarProps {
  title: string
  sub?: string
}

export function TopBar({ title, sub }: TopBarProps) {
  return (
    <div style={{
      padding: '24px 36px', borderBottom: '1px solid var(--line)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'var(--paper)',
    }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>{title}</h1>
        {sub && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
      </div>
      <div style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--salmon)' }} />
    </div>
  )
}
