import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { redirect } from 'next/navigation'

async function getStats(tenantId: string) {
  const supabase = await createClient()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayISO = todayStart.toISOString()

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [totalLeads, activeConversations, repliedToday, newLeadsToday] = await Promise.all([
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),

    supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', sevenDaysAgo),

    supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('role', 'assistant')
      .gte('created_at', todayISO),

    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', todayISO),
  ])

  return {
    totalLeads: totalLeads.count ?? 0,
    activeConversations: activeConversations.count ?? 0,
    repliedToday: repliedToday.count ?? 0,
    newLeadsToday: newLeadsToday.count ?? 0,
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!userData?.tenant_id) redirect('/onboarding')

  const stats = await getStats(userData.tenant_id)

  const cards = [
    { icon: '👥', label: 'Total de leads', value: stats.totalLeads },
    { icon: '💬', label: 'Conversas ativas (7 dias)', value: stats.activeConversations },
    { icon: '✅', label: 'Respondidos hoje', value: stats.repliedToday },
    { icon: '⭐', label: 'Leads novos hoje', value: stats.newLeadsToday },
  ]

  return (
    <div>
      <TopBar title="Dashboard" sub="Visão geral do seu agente" />
      <div style={{ padding: 36 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 20,
          }}
        >
          {cards.map((card) => (
            <div
              key={card.label}
              style={{
                background: 'var(--white)',
                borderRadius: 16,
                border: '1px solid var(--border)',
                padding: '28px 28px 24px',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 12 }}>{card.icon}</div>
              <div
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 40,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  lineHeight: 1,
                  marginBottom: 8,
                }}
              >
                {card.value}
              </div>
              <div
                style={{
                  fontFamily: 'var(--sans)',
                  fontSize: 13,
                  color: 'var(--muted)',
                  fontWeight: 500,
                }}
              >
                {card.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
