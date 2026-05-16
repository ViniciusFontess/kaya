import { TopBar } from '@/components/layout/TopBar'

export default function LeadsPage() {
  return (
    <div>
      <TopBar title="Leads" />
      <div style={{ padding: 36, color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 13 }}>
        Leads — em breve
      </div>
    </div>
  )
}
