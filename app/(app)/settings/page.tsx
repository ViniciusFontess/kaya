'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TopBar } from '@/components/layout/TopBar'
import Link from 'next/link'

type Tone = 'descontraido' | 'formal' | 'consultivo'

interface Config {
  tone: Tone
  niche: string
  knowledge_base: string
}

const TONES: { id: Tone; label: string; desc: string }[] = [
  { id: 'descontraido', label: 'Descontraído', desc: 'Como um atendente simpático de WhatsApp' },
  { id: 'formal', label: 'Formal', desc: 'Profissional e direto ao ponto' },
  { id: 'consultivo', label: 'Consultivo', desc: 'Especialista que educa antes de vender' },
]

const NICHES = ['Saúde/Clínica', 'Academia/Fitness', 'Imobiliária', 'Educação', 'Outro']

export default function SettingsPage() {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [hasConfig, setHasConfig] = useState(false)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [config, setConfig] = useState<Config>({
    tone: 'descontraido',
    niche: 'Outro',
    knowledge_base: '',
  })

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      const tid = userData?.tenant_id
      if (!tid) {
        setLoading(false)
        return
      }
      setTenantId(tid)

      const { data: cfg } = await supabase
        .from('agent_configs')
        .select('tone, niche, knowledge_base')
        .eq('tenant_id', tid)
        .maybeSingle()

      if (cfg) {
        setHasConfig(true)
        setConfig({
          tone: (cfg.tone ?? 'descontraido') as Tone,
          niche: cfg.niche ?? 'Outro',
          knowledge_base: cfg.knowledge_base ?? '',
        })
      }
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function save() {
    if (!tenantId) return
    setSaving(true)
    setError('')
    setSaved(false)

    const { error: err } = await supabase.from('agent_configs').upsert(
      {
        tenant_id: tenantId,
        tone: config.tone,
        niche: config.niche,
        knowledge_base: config.knowledge_base,
      },
      { onConflict: 'tenant_id' }
    )

    if (err) {
      setError(err.message)
    } else {
      setHasConfig(true)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  // ─── Styles ───────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: 'var(--white)',
    borderRadius: 16,
    border: '1px solid var(--border)',
    padding: '32px 36px',
    maxWidth: 580,
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontFamily: 'var(--sans)',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--ink)',
    marginBottom: 8,
  }

  const inputStyle: React.CSSProperties = {
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

  if (loading) {
    return (
      <div>
        <TopBar title="Ajustes" />
        <div style={{ padding: 36, color: 'var(--muted)', fontFamily: 'var(--sans)', fontSize: 14 }}>
          Carregando…
        </div>
      </div>
    )
  }

  if (!hasConfig) {
    return (
      <div>
        <TopBar title="Ajustes" />
        <div style={{ padding: 36 }}>
          <div style={card}>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--muted)', marginBottom: 20 }}>
              Seu agente ainda não foi configurado.
            </p>
            <Link
              href="/onboarding"
              style={{
                display: 'inline-block',
                padding: '10px 22px',
                background: 'var(--rose)',
                color: '#fff',
                borderRadius: 10,
                textDecoration: 'none',
                fontFamily: 'var(--sans)',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Completar onboarding →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <TopBar title="Ajustes" sub="Configurações do agente" />
      <div style={{ padding: 36 }}>
        <div style={card}>

          {/* Tone */}
          <div style={{ marginBottom: 28 }}>
            <span style={labelStyle}>Tom de voz</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {TONES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setConfig((c) => ({ ...c, tone: t.id }))}
                  style={{
                    textAlign: 'left' as const,
                    padding: '14px 18px',
                    border: `2px solid ${config.tone === t.id ? 'var(--rose)' : 'var(--border)'}`,
                    borderRadius: 12,
                    background: config.tone === t.id ? 'var(--rose-soft)' : 'var(--white)',
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
          </div>

          {/* Niche */}
          <div style={{ marginBottom: 28 }}>
            <span style={labelStyle}>Nicho do negócio</span>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={config.niche}
              onChange={(e) => setConfig((c) => ({ ...c, niche: e.target.value }))}
            >
              {NICHES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {/* Knowledge base */}
          <div style={{ marginBottom: 28 }}>
            <span style={labelStyle}>Conteúdo do negócio (knowledge base)</span>
            <textarea
              style={{ ...inputStyle, minHeight: 200, resize: 'vertical' as const }}
              value={config.knowledge_base}
              placeholder="Descreva seu negócio, serviços, diferenciais, horários…"
              onChange={(e) => setConfig((c) => ({ ...c, knowledge_base: e.target.value }))}
            />
          </div>

          {/* Feedback */}
          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: '10px 14px',
                background: '#fef2f2',
                borderRadius: 8,
                color: '#b91c1c',
                fontSize: 13,
                fontFamily: 'var(--sans)',
              }}
            >
              {error}
            </div>
          )}
          {saved && (
            <div
              style={{
                marginBottom: 16,
                padding: '10px 14px',
                background: '#f0fdf4',
                borderRadius: 8,
                color: '#16a34a',
                fontSize: 13,
                fontFamily: 'var(--sans)',
                fontWeight: 600,
              }}
            >
              ✅ Alterações salvas!
            </div>
          )}

          <button
            onClick={save}
            disabled={saving}
            style={{
              padding: '10px 24px',
              background: 'var(--rose)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'var(--sans)',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Salvando…' : 'Salvar alterações'}
          </button>

        </div>
      </div>
    </div>
  )
}
