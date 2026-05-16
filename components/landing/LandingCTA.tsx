import Link from 'next/link'
import { LogoWordmark } from '@/components/brand/Logo'

export function LandingCTA() {
  return (
    <section style={{
      background: 'var(--ink)', color: '#fff',
      padding: '88px 64px', position: 'relative', overflow: 'hidden',
      minHeight: 560, display: 'flex', alignItems: 'center',
    }}>
      {/* Salmon blobs */}
      <div style={{
        position: 'absolute', right: -180, top: -180, width: 520, height: 520,
        background: 'var(--salmon)', borderRadius: '50%', opacity: 0.9,
      }} />
      <div style={{
        position: 'absolute', right: 80, top: 260, width: 260, height: 260,
        background: 'var(--rose)', borderRadius: '50%', opacity: 0.4,
      }} />

      <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', gap: 48 }}>
        <LogoWordmark size={32} dark />

        <div>
          <h2 style={{
            fontSize: 'clamp(64px, 10vw, 128px)', fontWeight: 700,
            letterSpacing: '-0.05em', lineHeight: 0.9, margin: 0,
          }}>
            Hoje seu lead<br />
            dorme.<br />
            <span className="serif-i" style={{ fontWeight: 400, color: 'var(--salmon)' }}>Amanhã</span> ele agenda.
          </h2>

          <div style={{ display: 'flex', gap: 16, marginTop: 48, alignItems: 'center' }}>
            <Link href="/auth/signup" style={{ background: 'var(--salmon)', color: 'var(--ink)', padding: '22px 36px', borderRadius: 999, fontSize: 18, fontWeight: 700, fontFamily: 'var(--sans)', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}>
              Conectar meu site →
            </Link>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              grátis nos primeiros 14 dias · sem cartão
            </span>
          </div>
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontFamily: 'var(--mono)', fontSize: 11, color: 'rgba(255,255,255,0.35)',
          textTransform: 'uppercase' as const, letterSpacing: '0.1em',
        }}>
          <span>kaya · 2026</span>
          <span>são paulo · brasil</span>
          <span>oi@kaya.ai</span>
        </div>
      </div>
    </section>
  )
}
