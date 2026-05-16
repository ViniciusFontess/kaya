const testimonials = [
  {
    who: 'Marina · Clínica Dermo SP',
    txt: 'Fechei 14 agendas num final de semana sem nem abrir o WhatsApp. A Kaya respondeu tudo no tom da clínica.',
    color: 'var(--salmon)',
  },
  {
    who: 'Rodrigo · Academia Forma+',
    txt: 'Lead que chegava à meia-noite sumia. Agora 60% deles vira matrícula. Não preciso mais responder do celular no jantar.',
    color: 'var(--ink)',
  },
  {
    who: 'Beatriz · Imobiliária Norte',
    txt: 'Coloquei o link de um imóvel e a Kaya já filtra orçamento, bairro e prazo antes do corretor ligar.',
    color: 'var(--salmon-deep)',
  },
]

export function LandingProof() {
  return (
    <section style={{ background: 'var(--rose-soft)', padding: '88px 64px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 64, alignItems: 'center' }}>
        <div>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--salmon-ink)',
            letterSpacing: '0.12em', textTransform: 'uppercase' as const,
          }}>
            Quem já usa
          </div>
          <h2 style={{
            fontSize: 'clamp(48px, 6vw, 80px)', fontWeight: 700,
            letterSpacing: '-0.04em', lineHeight: 0.95, margin: '12px 0 0',
          }}>
            Clínicas, academias<br />e{' '}
            <span className="serif-i" style={{ fontWeight: 400, color: 'var(--salmon-deep)' }}>imobiliárias</span>.
          </h2>
          <p style={{ fontSize: 18, color: 'var(--ink-soft)', lineHeight: 1.5, marginTop: 24, maxWidth: 480 }}>
            Negócios de serviço que vivem de lead no WhatsApp. Se você responde no celular todo dia, a Kaya é pra você.
          </p>
          <div style={{ marginTop: 36, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 420 }}>
            {[['73', 'negócios'], ['+38%', 'conversão'], ['4.2s', 'tempo médio']].map(([k, v]) => (
              <div key={k} style={{ background: 'var(--paper)', padding: 16, borderRadius: 14 }}>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em' }}>{k}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {testimonials.map((q, i) => (
            <div key={i} style={{
              background: 'var(--paper)', borderRadius: 20, padding: 24, display: 'flex', gap: 16,
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 999, background: q.color, flex: '0 0 44px' }} />
              <div>
                <div className="serif-i" style={{ fontSize: 18, lineHeight: 1.4, color: 'var(--ink)' }}>"{q.txt}"</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10 }}>{q.who}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
