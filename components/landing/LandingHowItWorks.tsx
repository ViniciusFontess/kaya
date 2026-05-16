const steps = [
  {
    n: 1,
    title: 'Cola a URL do seu site',
    body: 'A IA lê tudo: serviços, preços, diferenciais, FAQ. Você escolhe o tom: formal, descontraído ou consultivo.',
    sub: (
      <div style={{
        background: 'var(--cream)', borderRadius: 10, padding: 12,
        fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-soft)',
        border: '1px dashed var(--line)',
      }}>
        ↳ https://seusite.com.br<br />
        <span style={{ color: 'var(--salmon-ink)' }}>✓ 14 serviços · 8 perguntas lidas</span>
      </div>
    ),
  },
  {
    n: 2,
    title: 'Conecta WhatsApp',
    body: 'Plug no WhatsApp Business API e calendário do Google. Fecha agenda direto na conversa, sem sair do chat.',
    sub: (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
        {['WhatsApp', 'Google Cal', 'Site chat'].map(c => (
          <span key={c} style={{
            background: 'var(--rose-soft)', color: 'var(--salmon-ink)',
            padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 500,
          }}>{c}</span>
        ))}
      </div>
    ),
  },
  {
    n: 3,
    title: 'Lead entra. Kaya resolve.',
    body: 'Qualifica, responde, contorna objeção, agenda. Se não fechar, faz follow-up em 1d, 3d, 7d.',
    sub: (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
        {[['100%', 'respondidos'], ['4.2s', 'tempo médio'], ['38%', 'viram agenda'], ['0', 'esforço seu']].map(([k, v]) => (
          <div key={k} style={{ background: 'var(--cream)', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>{k}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{v}</div>
          </div>
        ))}
      </div>
    ),
  },
]

export function LandingHowItWorks() {
  return (
    <section style={{ background: 'var(--cream)', padding: '88px 64px' }}>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--salmon-ink)',
        letterSpacing: '0.12em', textTransform: 'uppercase' as const,
      }}>
        Como funciona
      </div>
      <h2 style={{
        fontSize: 'clamp(48px, 6vw, 80px)', fontWeight: 700,
        letterSpacing: '-0.04em', lineHeight: 0.95, margin: '12px 0 0', maxWidth: 900,
      }}>
        Do site ao primeiro lead atendido em{' '}
        <span className="serif-i" style={{ fontWeight: 400, color: 'var(--salmon-deep)' }}>10 minutos</span>.
      </h2>

      <div style={{ marginTop: 56, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {steps.map(({ n, title, body, sub }) => (
          <div key={n} style={{
            background: 'var(--paper)', borderRadius: 24, padding: 32,
            border: '1px solid var(--line)', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>Passo {n}</span>
              <span className="serif-i" style={{ fontSize: 56, color: 'var(--salmon)', lineHeight: 0.9 }}>0{n}</span>
            </div>
            <h3 style={{ fontSize: 26, fontWeight: 600, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{title}</h3>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.55, marginTop: 12, marginBottom: 24 }}>{body}</p>
            <div style={{ marginTop: 'auto' }}>{sub}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
