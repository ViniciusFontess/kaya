import { TopBar } from '@/components/layout/TopBar'

export default function DashboardPage() {
  return (
    <div>
      <TopBar title="Bom dia 👋" sub="Seu agente está ativo" />
      <div style={{ padding: 36, color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 13 }}>
        Dashboard — em breve
      </div>
    </div>
  )
}
