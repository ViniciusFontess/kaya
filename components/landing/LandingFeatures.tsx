const features = [
  { t: 'Atende às 23h47', d: 'Lead manda mensagem fora do expediente? Kaya responde em segundos. Toda noite, todo domingo, todo feriado.' },
  { t: 'Agenda direto no Calendar', d: 'Não trava na pergunta "qual horário?". Lê sua agenda em tempo real e fecha consulta dentro da conversa.' },
  { t: 'Tom da sua marca', d: 'Lê o site, herda o jeito de falar. Você escolhe entre 3 personalidades. Sem prompt manual.' },
  { t: 'Follow-up que volta', d: 'Lead frio entra em sequência automática: 1 dia, 3 dias, 7 dias. Mensagem certa, hora certa.' },
  { t: 'Contorna objeção', d: '"Tá caro" vira "deixa eu te explicar o que está incluso". Treinada com 50 mil conversas reais.' },
  { t: 'Você toma o volante', d: 'Quer entrar na conversa? Toca em "assumir" e pronto. Kaya recua sem perder contexto.' },
]

export function LandingFeatures() {
  return (
    <section style={{ background: 'var(--paper)', padding: '88px 64px' }}>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--salmon-ink)',
        letterSpacing: '0.12em', textTransform: 'uppercase' as const,
      }}>
        O que a Kaya faz
      </div>
      <h2 style={{
        fontSize: 'clamp(48px, 6vw, 80px)', fontWeight: 700,
        letterSpacing: '-0.04em', lineHeight: 0.95, margin: '12px 0 0',
      }}>
        Tudo o que um vendedor faria.<br />
        <span className="serif-i" style={{ fontWeight: 400, color: 'var(--salmon-deep)' }}>Sem nunca cansar.</span>
      </h2>

      <div style={{
        marginTop: 64,
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(2, 1fr)',
        borderTop: '1px solid var(--line)', borderLeft: '1px solid var(--line)',
      }}>
        {features.map((f, i) => (
          <div key={i} style={{
            padding: 36, borderRight: '1px solid var(--line)', borderBottom: '1px solid var(--line)',
            display: 'flex', flexDirection: 'column', gap: 16, minHeight: 240,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 10, height: 10, background: 'var(--salmon)', borderRadius: 999, display: 'inline-block' }} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0 }}>{f.t}</h3>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--muted)', margin: 0 }}>{f.d}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
