'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoWordmark } from '@/components/brand/Logo'

const navItems = [
  { id: 'dashboard', label: 'Resumo', href: '/dashboard', icon: '◐' },
  { id: 'inbox', label: 'Conversas', href: '/inbox', icon: '◯' },
  { id: 'leads', label: 'Leads', href: '/leads', icon: '◑' },
  { id: 'channels', label: 'Canais', href: '/channels', icon: '◎' },
  { id: 'settings', label: 'Ajustes', href: '/settings', icon: '◕' },
]

interface SidebarProps {
  tenantName?: string
}

export function Sidebar({ tenantName = 'Meu Negócio' }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div style={{
      width: 240, background: 'var(--cream)', borderRight: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column', padding: 20,
      flex: '0 0 240px', height: '100vh', position: 'sticky', top: 0, overflowY: 'auto',
    }}>
      <div style={{ padding: '8px 8px 24px' }}>
        <LogoWordmark size={22} />
      </div>

      <div style={{ background: 'var(--paper)', borderRadius: 12, padding: 12, border: '1px solid var(--line)', marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Negócio
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{tenantName}</div>
        <div style={{ fontSize: 11, color: 'var(--salmon-ink)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, background: 'var(--salmon)', borderRadius: 999, display: 'inline-block' }} />
          IA ativa
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map(({ id, label, href, icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={id} href={href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 10,
                background: active ? 'var(--ink)' : 'transparent',
                color: active ? '#fff' : 'var(--ink-soft)',
                fontSize: 14, fontWeight: 500,
              }}>
                <span style={{ fontSize: 14, color: active ? 'var(--salmon)' : 'var(--muted)' }}>{icon}</span>
                {label}
              </div>
            </Link>
          )
        })}
      </nav>

      <div style={{ marginTop: 'auto', padding: 12, background: 'var(--rose-soft)', borderRadius: 12 }}>
        <div className="serif-i" style={{ fontSize: 15, color: 'var(--salmon-ink)' }}>Plano Grátis</div>
        <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>14 dias de trial</div>
      </div>
    </div>
  )
}
