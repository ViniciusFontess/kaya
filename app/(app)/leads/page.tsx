'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TopBar } from '@/components/layout/TopBar'
import { useRouter } from 'next/navigation'

interface Lead {
  id: string
  name: string | null
  phone: string | null
  channel: string | null
  status: string
  tags: string[] | null
  created_at: string
}

type LeadStatus = 'novo' | 'em_conversa' | 'qualificado' | 'fechado'

const COLUMNS: { id: LeadStatus; label: string; dot: string }[] = [
  { id: 'novo', label: 'Novo', dot: '#94a3b8' },
  { id: 'em_conversa', label: 'Em conversa', dot: '#2563eb' },
  { id: 'qualificado', label: 'Qualificado', dot: '#16a34a' },
  { id: 'fechado', label: 'Fechado', dot: '#64748b' },
]

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export default function LeadsPage() {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const router = useRouter()

  const [tenantId, setTenantId] = useState<string | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [dragOverCol, setDragOverCol] = useState<LeadStatus | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newChannel, setNewChannel] = useState<'whatsapp' | 'manual'>('manual')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Load tenant + leads on mount
  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .maybeSingle()

      if (!userData?.tenant_id) return
      setTenantId(userData.tenant_id)

      const { data } = await supabase
        .from('leads')
        .select('id, name, phone, channel, status, tags, created_at')
        .order('created_at', { ascending: false })

      setLeads(data ?? [])
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Realtime subscription
  useEffect(() => {
    if (!tenantId) return

    const channel = supabase
      .channel(`leads-rt-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLeads((prev) => [payload.new as Lead, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Lead
            setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
            setSelectedLead((prev) => (prev?.id === updated.id ? updated : prev))
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string }
            setLeads((prev) => prev.filter((l) => l.id !== deleted.id))
            setSelectedLead((prev) => (prev?.id === deleted.id ? null : prev))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId, supabase])

  async function handleDrop(e: React.DragEvent, targetStatus: LeadStatus) {
    e.preventDefault()
    setDragOverCol(null)
    const leadId = e.dataTransfer.getData('leadId')
    if (!leadId) return

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: targetStatus } : l))
    )

    const { error } = await supabase
      .from('leads')
      .update({ status: targetStatus })
      .eq('id', leadId)

    if (error) {
      // Revert on failure
      const { data } = await supabase
        .from('leads')
        .select('id, name, phone, channel, status, tags, created_at')
        .order('created_at', { ascending: false })
      setLeads(data ?? [])
    }
  }

  async function createLead() {
    if (!tenantId || !newPhone.trim()) {
      setCreateError('Telefone é obrigatório')
      return
    }
    setCreating(true)
    setCreateError('')

    const { error } = await supabase.from('leads').insert({
      tenant_id: tenantId,
      name: newName.trim() || null,
      phone: newPhone.trim(),
      channel: newChannel,
      status: 'novo',
    })

    setCreating(false)

    if (error) {
      setCreateError(error.message)
      return
    }

    setShowModal(false)
    setNewName('')
    setNewPhone('')
    setNewChannel('manual')
    setCreateError('')
  }

  // ─── Styles ───────────────────────────────────────────────────────────────
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TopBar title="Leads" sub="Gestão de contatos" />

      {/* Action bar */}
      <div
        style={{
          padding: '12px 36px',
          display: 'flex',
          justifyContent: 'flex-end',
          borderBottom: '1px solid var(--line)',
          background: 'var(--paper)',
        }}
      >
        <button
          onClick={() => { setShowModal(true); setCreateError('') }}
          style={{
            padding: '8px 20px',
            background: 'var(--ink)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'var(--sans)',
            cursor: 'pointer',
          }}
        >
          + Novo lead
        </button>
      </div>

      {/* Kanban board */}
      <div style={{ flex: 1, overflowX: 'auto', padding: '24px 36px', background: 'var(--cream)' }}>
        <div style={{ display: 'flex', gap: 16, minWidth: 800, height: '100%', minHeight: 400 }}>
          {COLUMNS.map((col) => {
            const colLeads = leads.filter((l) => l.status === col.id)
            const isOver = dragOverCol === col.id

            return (
              <div
                key={col.id}
                style={{
                  flex: '1 1 0',
                  minWidth: 200,
                  background: isOver ? 'var(--rose-soft)' : 'var(--paper)',
                  borderRadius: 16,
                  border: `2px solid ${isOver ? 'var(--salmon)' : 'var(--line)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id) }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverCol(null)
                  }
                }}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                {/* Column header */}
                <div
                  style={{
                    padding: '16px 16px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    borderBottom: '1px solid var(--line-soft)',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: col.dot,
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: 'var(--sans)',
                      color: 'var(--ink)',
                    }}
                  >
                    {col.label}
                  </span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: 'var(--mono)',
                      color: 'var(--muted)',
                      background: 'var(--line)',
                      borderRadius: 99,
                      padding: '1px 7px',
                    }}
                  >
                    {colLeads.length}
                  </span>
                </div>

                {/* Cards */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '12px 12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  {colLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('leadId', lead.id)
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      onClick={() => setSelectedLead(lead)}
                      style={{
                        background: 'var(--paper)',
                        border: '1px solid var(--line)',
                        borderRadius: 12,
                        padding: '12px 14px',
                        cursor: 'grab',
                        userSelect: 'none',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          fontFamily: 'var(--sans)',
                          color: 'var(--ink)',
                          marginBottom: 6,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {lead.name ?? lead.phone ?? 'Lead sem nome'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {lead.channel && (
                          <span
                            style={{
                              fontSize: 11,
                              fontFamily: 'var(--mono)',
                              color: 'var(--muted)',
                              background: 'var(--line-soft)',
                              borderRadius: 6,
                              padding: '2px 7px',
                            }}
                          >
                            {lead.channel === 'whatsapp' ? '📱 WhatsApp' : '✋ Manual'}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: 11,
                            color: 'var(--muted)',
                            fontFamily: 'var(--sans)',
                            marginLeft: 'auto',
                          }}
                        >
                          {timeAgo(lead.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {colLeads.length === 0 && (
                    <div
                      style={{
                        textAlign: 'center',
                        color: 'var(--muted)',
                        fontSize: 12,
                        fontFamily: 'var(--sans)',
                        paddingTop: 32,
                        opacity: 0.6,
                      }}
                    >
                      Nenhum lead
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Lead detail drawer */}
      {selectedLead && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setSelectedLead(null)}
        >
          <div
            style={{
              width: 320,
              height: '100%',
              background: 'var(--paper)',
              borderLeft: '1px solid var(--line)',
              padding: 28,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
                {selectedLead.name ?? selectedLead.phone ?? 'Lead'}
              </h2>
              <button
                onClick={() => setSelectedLead(null)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: 22,
                  color: 'var(--muted)',
                  lineHeight: 1,
                  padding: 0,
                  marginLeft: 8,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {selectedLead.phone && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 3, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Telefone</div>
                  <div style={{ fontSize: 14, color: 'var(--ink)' }}>{selectedLead.phone}</div>
                </div>
              )}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 3, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Canal</div>
                <div style={{ fontSize: 14, color: 'var(--ink)' }}>
                  {selectedLead.channel === 'whatsapp' ? '📱 WhatsApp' : '✋ Manual'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 3, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Status</div>
                <div style={{ fontSize: 14, color: 'var(--ink)' }}>
                  {COLUMNS.find((c) => c.id === selectedLead.status)?.label ?? selectedLead.status}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 3, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Criado em</div>
                <div style={{ fontSize: 14, color: 'var(--ink)' }}>
                  {new Date(selectedLead.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>

              {selectedLead.tags && selectedLead.tags.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Tags</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selectedLead.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 11,
                          background: 'var(--rose-soft)',
                          color: 'var(--salmon-deep)',
                          padding: '3px 9px',
                          borderRadius: 99,
                          fontFamily: 'var(--sans)',
                          fontWeight: 500,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => { router.push('/inbox'); setSelectedLead(null) }}
              style={{
                marginTop: 'auto',
                padding: '10px 20px',
                background: 'var(--ink)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'var(--sans)',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              Ver no Inbox →
            </button>
          </div>
        </div>
      )}

      {/* Create lead modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(20,20,20,0.5)',
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => { setShowModal(false); setCreateError('') }}
        >
          <div
            style={{
              background: 'var(--paper)',
              borderRadius: 20,
              padding: 32,
              width: 420,
              maxWidth: '90vw',
              boxShadow: '0 24px 48px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
              Novo lead
            </h2>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6, fontFamily: 'var(--sans)' }}>
                Nome (opcional)
              </label>
              <input style={inputStyle} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="João Silva" />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6, fontFamily: 'var(--sans)' }}>
                Telefone *
              </label>
              <input style={inputStyle} value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+5511999999999" />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6, fontFamily: 'var(--sans)' }}>
                Canal
              </label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value as 'whatsapp' | 'manual')}
              >
                <option value="manual">Manual</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>

            {createError && (
              <div style={{ marginBottom: 16, padding: '8px 12px', background: '#fef2f2', borderRadius: 8, color: '#b91c1c', fontSize: 13, fontFamily: 'var(--sans)' }}>
                {createError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => { setShowModal(false); setCreateError('') }}
                style={{ flex: 1, padding: '10px 0', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--paper)', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--ink)' }}
              >
                Cancelar
              </button>
              <button
                onClick={createLead}
                disabled={creating}
                style={{ flex: 1, padding: '10px 0', background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 10, cursor: creating ? 'not-allowed' : 'pointer', fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 600, opacity: creating ? 0.7 : 1 }}
              >
                {creating ? 'Criando…' : 'Criar lead →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
