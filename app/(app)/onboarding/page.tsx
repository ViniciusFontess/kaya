// app/(app)/onboarding/page.tsx
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TopBar } from '@/components/layout/TopBar'

type Tone = 'descontraido' | 'formal' | 'consultivo'

interface WizardState {
  url: string
  knowledgeBase: string
  siteTitle: string
  tone: Tone
  niche: string
}

const TONES: { id: Tone; label: string; desc: string }[] = [
  { id: 'descontraido', label: 'Descontraído', desc: 'Como um atendente simpático de WhatsApp' },
  { id: 'formal', label: 'Formal', desc: 'Profissional e direto ao ponto' },
  { id: 'consultivo', label: 'Consultivo', desc: 'Especialista que educa antes de vender' },
]

const NICHES = ['Saúde/Clínica', 'Academia/Fitness', 'Imobiliária', 'Educação', 'Outro']

export default function OnboardingPage() {
  const router = useRouter()
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [state, setState] = useState<WizardState>({
    url: '',
    knowledgeBase: '',
    siteTitle: '',
    tone: 'descontraido',
    niche: 'Outro',
  })

  async function crawlSite() {
    if (!state.url.startsWith('http')) {
      setError('Insira uma URL válida começando com http:// ou https://')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/onboarding/crawl?url=${encodeURIComponent(state.url)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')
      setState((s) => ({ ...s, knowledgeBase: data.text, siteTitle: data.title }))
      setStep(2)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao acessar o site')
    } finally {
      setLoading(false)
    }
  }

  async function activate() {
    setLoading(true)
    setError('')
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!userData?.tenant_id) throw new Error('Tenant não encontrado')

      const { error: upsertError } = await supabase.from('agent_configs').upsert(
        {
          tenant_id: userData.tenant_id,
          tone: state.tone,
          niche: state.niche,
          knowledge_base: state.knowledgeBase,
          calendar_url: null,
          payment_link: null,
        },
        { onConflict: 'tenant_id' }
      )

      if (upsertError) throw new Error(upsertError.message)
      setStep(4)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao ativar agente')
    } finally {
      setLoading(false)
    }
  }

  const card: React.CSSProperties = {
    background: 'var(--white)',
    borderRadius: 16,
    border: '1px solid var(--border)',
    padding: '32px 36px',
    maxWidth: 560,
  }

  const label: React.CSSProperties = {
    display: 'block',
    fontFamily: 'var(--sans)',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--ink)',
    marginBottom: 8,
  }

  const input: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid var(--border)',
    borderRadius: 10,
    fontSize: 14,
    fontFamily: 'var(--sans)',
    color: 'var(--ink)',
    background: 'var(--paper)',
    boxSizing: 'border-box' as const,
  }

  const btn: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 22px',
    background: 'var(--rose)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'var(--sans)',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
    marginTop: 24,
  }

  const btnSecondary: React.CSSProperties = {
    ...btn,
    background: 'transparent',
    color: 'var(--rose)',
    border: '1px solid var(--rose)',
    marginLeft: 12,
  }

  const errorBox: React.CSSProperties = {
    marginTop: 12,
    padding: '10px 14px',
    background: '#fef2f2',
    borderRadius: 8,
    color: '#b91c1c',
    fontSize: 13,
    fontFamily: 'var(--sans)',
  }

  const h2: React.CSSProperties = {
    fontFamily: 'var(--serif)',
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--ink)',
    marginBottom: 6,
    marginTop: 0,
  }

  const sub: React.CSSProperties = {
    fontFamily: 'var(--sans)',
    fontSize: 14,
    color: 'var(--muted)',
    marginBottom: 24,
    marginTop: 0,
  }

  return (
    <div>
      <TopBar title="Configurar seu agente" sub={`Passo ${step} de 4`} />
      <div style={{ padding: '36px 36px' }}>

        {/* Step 1 — URL */}
        {step === 1 && (
          <div style={card}>
            <h2 style={h2}>Qual é o site do seu negócio?</h2>
            <p style={sub}>
              A Kaya vai ler seu site e aprender sobre o seu negócio automaticamente.
            </p>
            <label style={label}>URL do site</label>
            <input
              style={input}
              type="url"
              placeholder="https://seunegocio.com.br"
              value={state.url}
              onChange={(e) => setState((s) => ({ ...s, url: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && !loading && crawlSite()}
            />
            {error && <div style={errorBox}>{error}</div>}
            <div>
              <button style={btn} disabled={loading} onClick={crawlSite}>
                {loading ? 'Lendo seu site…' : 'Ler meu site →'}
              </button>
              <button
                style={btnSecondary}
                disabled={loading}
                onClick={() => {
                  setError('')
                  setState((s) => ({ ...s, knowledgeBase: '', siteTitle: '' }))
                  setStep(2)
                }}
              >
                Pular
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Review content */}
        {step === 2 && (
          <div style={card}>
            <h2 style={h2}>Revise o conteúdo</h2>
            <p style={sub}>
              Esse é o conteúdo que a Kaya vai usar para responder seus leads. Edite se quiser.
            </p>
            <label style={label}>Conteúdo do negócio</label>
            <textarea
              style={{ ...input, minHeight: 220, resize: 'vertical' as const }}
              value={state.knowledgeBase}
              placeholder="Descreva seu negócio, serviços, diferenciais, horários de atendimento, localização…"
              onChange={(e) => setState((s) => ({ ...s, knowledgeBase: e.target.value }))}
            />
            {error && <div style={errorBox}>{error}</div>}
            <div>
              <button style={btn} onClick={() => { setError(''); setStep(3) }}>
                Continuar →
              </button>
              <button style={btnSecondary} onClick={() => { setError(''); setStep(1) }}>
                Voltar
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Tone + Niche */}
        {step === 3 && (
          <div style={card}>
            <h2 style={h2}>Personalidade do agente</h2>
            <p style={sub}>Como você quer que a Kaya se comunique?</p>

            <label style={label}>Tom de voz</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {TONES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setState((s) => ({ ...s, tone: t.id }))}
                  style={{
                    textAlign: 'left' as const,
                    padding: '14px 18px',
                    border: `2px solid ${state.tone === t.id ? 'var(--rose)' : 'var(--border)'}`,
                    borderRadius: 12,
                    background: state.tone === t.id ? 'var(--rose-soft)' : 'var(--white)',
                    cursor: 'pointer',
                    fontFamily: 'var(--sans)',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 2 }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>{t.desc}</div>
                </button>
              ))}
            </div>

            <label style={label}>Nicho do negócio</label>
            <select
              style={{ ...input, cursor: 'pointer' }}
              value={state.niche}
              onChange={(e) => setState((s) => ({ ...s, niche: e.target.value }))}
            >
              {NICHES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            {error && <div style={errorBox}>{error}</div>}
            <div>
              <button style={btn} disabled={loading} onClick={activate}>
                {loading ? 'Ativando…' : 'Ativar agente →'}
              </button>
              <button style={btnSecondary} disabled={loading} onClick={() => { setError(''); setStep(2) }}>
                Voltar
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Done */}
        {step === 4 && (
          <div style={{ ...card, textAlign: 'center' as const }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h2 style={{ ...h2, textAlign: 'center' as const }}>Sua Kaya está pronta!</h2>
            <p style={{ ...sub, textAlign: 'center' as const }}>
              O agente está configurado e pronto para responder seus leads.
            </p>
            <div
              style={{
                background: 'var(--paper)',
                borderRadius: 12,
                padding: '16px 20px',
                textAlign: 'left' as const,
                marginBottom: 24,
                fontFamily: 'var(--sans)',
                fontSize: 13,
                color: 'var(--ink)',
                lineHeight: 1.8,
              }}
            >
              <div>
                <strong>Site lido:</strong> {state.siteTitle || state.url || '—'}
              </div>
              <div>
                <strong>Tom:</strong> {TONES.find((t) => t.id === state.tone)?.label}
              </div>
              <div>
                <strong>Nicho:</strong> {state.niche}
              </div>
            </div>
            <button
              style={{ ...btn, marginTop: 0 }}
              onClick={() => router.push('/inbox')}
            >
              Ver minhas conversas →
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
