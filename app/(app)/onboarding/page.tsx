import { TopBar } from '@/components/layout/TopBar'

export default function OnboardingPage() {
  return (
    <div>
      <TopBar title="Configurar seu agente" sub="Isso leva 10 minutos" />
      <div style={{ padding: 36, color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 13 }}>
        Onboarding — em breve
      </div>
    </div>
  )
}
