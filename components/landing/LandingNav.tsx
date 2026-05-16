import Link from 'next/link'
import { LogoWordmark } from '@/components/brand/Logo'

export function LandingNav() {
  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '24px 64px', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5,
    }}>
      <LogoWordmark size={28} />
      <div style={{ display: 'flex', gap: 36, fontSize: 14, fontWeight: 500, color: 'var(--muted)' }}>
        {['Como funciona', 'Para quem', 'Preço'].map(item => (
          <Link key={item} href="#" style={{ color: 'inherit', textDecoration: 'none' }}>
            {item}
          </Link>
        ))}
        <Link href="/auth/login" style={{ color: 'inherit', textDecoration: 'none' }}>
          Login
        </Link>
      </div>
      <Link href="/auth/signup">
        <button style={{
          background: 'var(--ink)', color: '#fff', border: 0,
          padding: '12px 22px', borderRadius: 999, fontSize: 14, fontWeight: 600,
          fontFamily: 'inherit', cursor: 'pointer',
        }}>
          Conectar meu site →
        </button>
      </Link>
    </nav>
  )
}
