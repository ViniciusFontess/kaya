'use client'

import { useEffect, useState, useRef } from 'react'
import { TopBar } from '@/components/layout/TopBar'

type ConnectionState = 'unconfigured' | 'close' | 'connecting' | 'open'

export default function ChannelsPage() {
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<ConnectionState>('unconfigured')
  const [qrBase64, setQrBase64] = useState<string | null>(null)
  const [configured, setConfigured] = useState(false)
  const [editing, setEditing] = useState(false)

  // Config form state
  const [apiUrl, setApiUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [instanceName, setInstanceName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchStatus(): Promise<ConnectionState> {
    try {
      const res = await fetch('/api/channels?action=status')
      const data = await res.json() as { state?: string }
      return (data.state ?? 'close') as ConnectionState
    } catch {
      return 'close'
    }
  }

  async function fetchQr() {
    try {
      const res = await fetch('/api/channels?action=qrcode')
      const data = await res.json() as { base64?: string | null }
      setQrBase64(data.base64 ?? null)
    } catch {
      setQrBase64(null)
    }
  }

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  function startPolling() {
    stopPolling()
    pollingRef.current = setInterval(async () => {
      const s = await fetchStatus()
      setState(s)
      if (s === 'open') {
        stopPolling()
        setQrBase64(null)
      } else {
        await fetchQr()
      }
    }, 5_000)
  }

  // Initial load
  useEffect(() => {
    async function init() {
      const s = await fetchStatus()
      setState(s)
      setLoading(false)

      if (s !== 'unconfigured') {
        setConfigured(true)
        if (s !== 'open') {
          await fetchQr()
          startPolling()
        }
      }
    }
    init()

    return () => stopPolling()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveConfig() {
    if (!apiUrl.trim() || !apiKey.trim() || !instanceName.trim()) {
      setSaveError('Todos os campos são obrigatórios')
      return
    }
    setSaving(true)
    setSaveError('')

    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evolution_api_url: apiUrl.trim(),
          evolution_api_key: apiKey.trim(),
          evolution_instance_name: instanceName.trim(),
        }),
      })

      const data = await res.json() as { error?: string }

      if (!res.ok) {
        setSaveError(data.error ?? 'Erro ao salvar')
        return
      }

      setConfigured(true)
      setEditing(false)

      const s = await fetchStatus()
      setState(s)

      if (s !== 'open') {
        await fetchQr()
        startPolling()
      }
    } catch {
      setSaveError('Erro de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function disconnect() {
    stopPolling()
    try {
      await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' }),
      })
    } catch {
      // Proceed with local state reset even on network error
    }
    setState('unconfigured')
    setConfigured(false)
    setEditing(false)
    setQrBase64(null)
    setApiUrl('')
    setApiKey('')
    setInstanceName('')
    setSaveError('')
  }

  // ─── Styles ───────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: 'var(--paper)',
    borderRadius: 16,
    border: '1px solid var(--line)',
    padding: '32px 36px',
    maxWidth: 500,
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--ink)',
    marginBottom: 6,
    fontFamily: 'var(--sans)',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid var(--line)',
    borderRadius: 10,
    fontSize: 14,
    fontFamily: 'var(--sans)',
    color: 'var(--ink)',
    background: 'var(--paper)',
    boxSizing: 'border-box',
  }

  const btnPrimary: React.CSSProperties = {
    padding: '10px 24px',
    background: 'var(--ink)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'var(--sans)',
    cursor: 'pointer',
  }

  const btnSecondary: React.CSSProperties = {
    padding: '10px 18px',
    border: '1px solid var(--line)',
    borderRadius: 10,
    background: 'var(--paper)',
    cursor: 'pointer',
    fontFamily: 'var(--sans)',
    fontSize: 14,
    color: 'var(--ink)',
  }

  const btnDanger: React.CSSProperties = {
    padding: '10px 18px',
    border: '1px solid #fca5a5',
    borderRadius: 10,
    background: '#fef2f2',
    color: '#b91c1c',
    cursor: 'pointer',
    fontFamily: 'var(--sans)',
    fontSize: 14,
  }

  if (loading) {
    return (
      <div>
        <TopBar title="Canais" />
        <div
          style={{
            padding: 36,
            color: 'var(--muted)',
            fontFamily: 'var(--sans)',
            fontSize: 14,
          }}
        >
          Carregando…
        </div>
      </div>
    )
  }

  return (
    <div>
      <TopBar title="Canais" sub="Configuração do WhatsApp" />
      <div style={{ padding: 36 }}>
        <div style={card}>

          {/* ── Connected ── */}
          {configured && !editing && state === 'open' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: '#16a34a',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                  WhatsApp conectado
                </span>
              </div>
              <p
                style={{
                  fontSize: 14,
                  color: 'var(--muted)',
                  margin: 0,
                  lineHeight: 1.6,
                  fontFamily: 'var(--sans)',
                }}
              >
                Mensagens recebidas serão processadas automaticamente pela Kaya.
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button style={btnSecondary} onClick={() => setEditing(true)}>
                  Editar configuração
                </button>
                <button style={btnDanger} onClick={disconnect}>
                  Desconectar
                </button>
              </div>
            </div>
          )}

          {/* ── QR code / awaiting scan ── */}
          {configured && !editing && state !== 'open' && state !== 'unconfigured' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: '#f59e0b',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                  Aguardando conexão
                </span>
              </div>

              {qrBase64 ? (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <img
                    src={
                      qrBase64.startsWith('data:')
                        ? qrBase64
                        : `data:image/png;base64,${qrBase64}`
                    }
                    alt="QR Code WhatsApp"
                    style={{
                      width: 200,
                      height: 200,
                      borderRadius: 12,
                      border: '2px solid var(--line)',
                    }}
                  />
                  <p
                    style={{
                      fontSize: 13,
                      color: 'var(--muted)',
                      marginTop: 12,
                      fontFamily: 'var(--sans)',
                      lineHeight: 1.5,
                    }}
                  >
                    Escaneie com o WhatsApp do número que vai atender seus leads.
                  </p>
                </div>
              ) : (
                <p
                  style={{
                    fontSize: 14,
                    color: 'var(--muted)',
                    fontFamily: 'var(--sans)',
                    lineHeight: 1.6,
                  }}
                >
                  Aguardando QR code… Verifique se a instância está ativa no painel do
                  Evolution API.
                </p>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  style={btnSecondary}
                  onClick={async () => {
                    const s = await fetchStatus()
                    setState(s)
                    if (s !== 'open') await fetchQr()
                  }}
                >
                  🔄 Atualizar QR
                </button>
                <button style={btnDanger} onClick={disconnect}>
                  Desconectar
                </button>
              </div>
            </div>
          )}

          {/* ── Config form (unconfigured or editing) ── */}
          {(!configured || editing) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  fontFamily: 'var(--sans)',
                }}
              >
                {editing ? 'Editar configuração' : 'Conectar WhatsApp via Evolution API'}
              </h2>

              <div>
                <label style={labelStyle}>URL da instância *</label>
                <input
                  type="url"
                  style={inputStyle}
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://minha-evolution.com"
                />
              </div>

              <div>
                <label style={labelStyle}>API Key *</label>
                <input
                  type="password"
                  style={inputStyle}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="evo_sk_..."
                />
              </div>

              <div>
                <label style={labelStyle}>Nome da instância *</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  placeholder="minha-kaya"
                />
              </div>

              {saveError && (
                <div
                  style={{
                    padding: '8px 12px',
                    background: '#fef2f2',
                    borderRadius: 8,
                    color: '#b91c1c',
                    fontSize: 13,
                    fontFamily: 'var(--sans)',
                  }}
                >
                  {saveError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                {editing && (
                  <button
                    style={btnSecondary}
                    onClick={() => {
                      setEditing(false)
                      setSaveError('')
                    }}
                  >
                    Cancelar
                  </button>
                )}
                <button
                  style={{
                    ...btnPrimary,
                    flex: 1,
                    opacity: saving ? 0.7 : 1,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                  onClick={saveConfig}
                  disabled={saving}
                >
                  {saving ? 'Salvando…' : 'Salvar e conectar →'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
