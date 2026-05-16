import Link from 'next/link'

export function LandingHero() {
  return (
    <section style={{ background: 'var(--cream)', position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <div style={{
        padding: '140px 64px 80px',
        display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 56,
        alignItems: 'center', width: '100%',
      }}>
        {/* Copy */}
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--rose-soft)', color: 'var(--salmon-ink)',
            padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 500, marginBottom: 28,
          }}>
            <span style={{ width: 6, height: 6, background: 'var(--salmon)', borderRadius: 999, display: 'inline-block' }} />
            Beta aberto · 73 clínicas já conectadas
          </div>

          <h1 style={{
            fontSize: 'clamp(72px, 9vw, 108px)', fontWeight: 700,
            letterSpacing: '-0.045em', lineHeight: 0.92, margin: 0,
          }}>
            Atende.<br />
            Agenda.<br />
            <span className="serif-i" style={{ fontWeight: 400, color: 'var(--salmon-deep)' }}>Acabou.</span>
          </h1>

          <p style={{ fontSize: 20, lineHeight: 1.5, color: 'var(--muted)', maxWidth: 520, marginTop: 28 }}>
            Kaya lê seu site, monta um agente de WhatsApp do seu jeito, e responde lead em segundos —
            <span className="serif-i" style={{ color: 'var(--salmon-ink)' }}> mesmo às 23h47</span>.
          </p>

          <div style={{ display: 'flex', gap: 14, marginTop: 36 }}>
            <Link href="/auth/signup" style={{ background: 'var(--ink)', color: '#fff', padding: '18px 28px', borderRadius: 999, fontSize: 16, fontWeight: 600, fontFamily: 'var(--sans)', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}>
              Conectar meu site →
            </Link>
            <button style={{
              background: 'transparent', color: 'var(--ink)',
              border: '1.5px solid var(--ink)', padding: '18px 28px', borderRadius: 999,
              fontSize: 16, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
            }}>
              Ver demo de 2 min
            </button>
          </div>

          <div style={{
            marginTop: 40, display: 'flex', gap: 24,
            fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)',
            letterSpacing: '0.04em', textTransform: 'uppercase' as const,
          }}>
            <span>10 min pra ativar</span>
            <span>·</span>
            <span>sem prompt</span>
            <span>·</span>
            <span>sem dev</span>
          </div>
        </div>

        {/* Phone mockup */}
        <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
          <div style={{
            width: 320, background: 'var(--paper)', borderRadius: 44,
            boxShadow: '0 40px 80px -20px rgba(255,145,164,0.4), 0 0 0 8px var(--ink)',
            padding: 16, overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              background: 'var(--rose-soft)', borderRadius: 28, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 999, background: 'var(--salmon)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#fff',
              }}>K</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Kaya · seu negócio</div>
                <div style={{ fontSize: 11, color: 'var(--salmon-ink)' }}>● online · responde em segundos</div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, padding: '0 4px' }}>
              {[
                { side: 'right', text: 'Quero saber sobre limpeza de pele', bg: 'var(--rose-soft)' },
                { side: 'left', text: 'Oi! Fazemos limpeza profunda, R$ 180, ~1h. Posso te encaixar essa semana?', bg: 'var(--line-soft)', byKaya: true },
                { side: 'right', text: 'Tem sábado?', bg: 'var(--rose-soft)' },
                { side: 'left', text: 'Sábado tenho 10h e 14h. Qual prefere?', bg: 'var(--line-soft)', byKaya: true },
                { side: 'right', text: '10h, fechado', bg: 'var(--rose-soft)' },
              ].map((msg, i) => (
                <div key={i} style={{ alignSelf: msg.side === 'right' ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
                  {msg.byKaya && (
                    <div style={{
                      fontSize: 9, color: 'var(--salmon-ink)', fontFamily: 'var(--mono)',
                      textTransform: 'uppercase' as const, marginBottom: 2,
                    }}>Kaya</div>
                  )}
                  <div style={{
                    background: msg.bg, padding: '9px 12px', lineHeight: 1.4,
                    borderRadius: msg.side === 'right' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  }}>{msg.text}</div>
                </div>
              ))}
              <div style={{ alignSelf: 'flex-start', maxWidth: '88%' }}>
                <div style={{
                  background: 'var(--salmon)', color: '#fff', padding: '12px 14px',
                  borderRadius: '16px 16px 16px 4px', lineHeight: 1.4, fontSize: 13,
                }}>
                  ✓ Agendado · sábado 10h<br />
                  <span style={{ fontSize: 11, opacity: 0.85 }}>vou te lembrar 1 dia antes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Floating annotation */}
          <div style={{
            position: 'absolute', top: 40, right: -20,
            background: 'var(--ink)', color: '#fff',
            padding: '12px 16px', borderRadius: 14,
            fontFamily: 'var(--serif)', fontStyle: 'italic',
            fontSize: 16, transform: 'rotate(3deg)', maxWidth: 180,
          }}>
            100% IA<br />
            <span style={{ fontSize: 11, fontStyle: 'normal', fontFamily: 'var(--mono)', color: 'var(--salmon)' }}>
              tempo médio: 4.2s
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
