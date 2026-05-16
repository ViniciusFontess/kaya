import { TopBar } from '@/components/layout/TopBar'

export default function InboxPage() {
  return (
    <div>
      <TopBar title="Conversas" sub="Todas as mensagens" />
      <div style={{ padding: 36, color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 13 }}>
        Inbox — em breve
      </div>
    </div>
  )
}
