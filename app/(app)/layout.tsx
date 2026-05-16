import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id, tenants(name)')
    .eq('id', user.id)
    .single()

  const tenants = userData?.tenants as { name: string }[] | undefined
  const tenantName = tenants?.[0]?.name ?? 'Meu Negócio'

  return (
    <div style={{ display: 'flex', background: 'var(--paper)', minHeight: '100vh' }}>
      <Sidebar tenantName={tenantName} />
      <main style={{ flex: 1, background: 'var(--paper)', overflow: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
