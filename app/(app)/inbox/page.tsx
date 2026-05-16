// app/(app)/inbox/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TopBar } from '@/components/layout/TopBar'

interface Lead {
  id: string
  name: string | null
  phone: string | null
  channel: string | null
  status: string | null
  tags: string[] | null
}

interface Conversation {
  id: string
  mode: string | null
  lead: Lead | null
  last_message_at: string | null
}

interface Message {
  id: string
  role: string
  content: string
  suggested_reply: string | null
  created_at: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export default function InboxPage() {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const [tenantId, setTenantId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [replyText, setReplyText] = useState('')
  const [loadingReply, setLoadingReply] = useState(false)
  const [sendingMsg, setSendingMsg] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const selectedConv = conversations.find((c) => c.id === selectedId) ?? null

  // Load tenant + conversations on mount
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
        .single()

      const tid = userData?.tenant_id
      if (!tid) return
      setTenantId(tid)
      await fetchConversations(tid)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchConversations(tid: string) {
    const { data } = await supabase
      .from('conversations')
      .select(`
        id,
        mode,
        last_message_at,
        leads!lead_id (
          id, name, phone, channel, status, tags
        )
      `)
      .eq('tenant_id', tid)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!data) return

    const convs: Conversation[] = (data as unknown as Array<{
      id: string
      mode: string | null
      last_message_at: string | null
      leads: Lead | Lead[] | null
    }>).map((c) => {
      const lead = Array.isArray(c.leads) ? c.leads[0] : c.leads
      return {
        id: c.id,
        mode: c.mode,
        lead: lead as Lead | null,
        last_message_at: c.last_message_at ?? null,
      }
    })

    setConversations(convs)
  }

  // Load messages when conversation is selected
  useEffect(() => {
    if (!selectedId) return
    setMessages([])

    async function loadMessages() {
      const { data } = await supabase
        .from('messages')
        .select('id, role, content, suggested_reply, created_at')
        .eq('conversation_id', selectedId)
        .order('created_at', { ascending: true })

      setMessages(data ?? [])
    }

    loadMessages()

    // Realtime: new messages in this conversation
    const channel = supabase
      .channel(`messages:${selectedId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === payload.new.id ? (payload.new as Message) : m))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  // Realtime: conversation list updates
  useEffect(() => {
    if (!tenantId) return

    const channel = supabase
      .channel(`conversations:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => fetchConversations(tenantId)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!replyText.trim() || !selectedId || !tenantId) return
    setSendingMsg(true)
    const content = replyText.trim()
    setReplyText('')
    const { error } = await supabase.from('messages').insert({
      conversation_id: selectedId,
      tenant_id: tenantId,
      role: 'assistant',
      content,
    })
    if (error) {
      console.error('[inbox] Failed to send message:', error.message)
      setReplyText(content) // restore on failure
    }
    setSendingMsg(false)
  }

  async function requestAiSuggestion() {
    if (!selectedId) return
    setLoadingReply(true)
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
    if (!lastUserMsg) {
      setLoadingReply(false)
      return
    }

    await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: selectedId,
        message: lastUserMsg.content,
        messageId: lastUserMsg.id,
      }),
    })
    // Realtime UPDATE on messages will reflect the suggested_reply in state
    setLoadingReply(false)
  }

  async function useAiSuggestion(text: string) {
    if (!selectedId || !tenantId) return
    await supabase.from('messages').insert({
      conversation_id: selectedId,
      tenant_id: tenantId,
      role: 'assistant',
      content: text,
    })
  }

  async function toggleMode() {
    if (!selectedId || !selectedConv) return
    const newMode = selectedConv.mode === 'copilot' ? 'auto' : 'copilot'
    await supabase
      .from('conversations')
      .update({ mode: newMode })
      .eq('id', selectedId)
    setConversations((prev) =>
      prev.map((c) => (c.id === selectedId ? { ...c, mode: newMode } : c))
    )
  }

  // ─── Styles ───────────────────────────────────────────────────────────────
  const colStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid var(--border)',
    height: 'calc(100vh - 65px)',
    overflow: 'hidden',
  }

  const emptyState: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--muted)',
    fontFamily: 'var(--sans)',
    fontSize: 14,
  }

  return (
    <div>
      <TopBar title="Conversas" sub="Todas as mensagens" />
      <div style={{ display: 'flex', height: 'calc(100vh - 65px)' }}>

        {/* ── Column 1: Conversation list ── */}
        <div style={{ ...colStyle, width: 280, minWidth: 280 }}>
          <div
            style={{
              padding: '12px 16px',
              fontFamily: 'var(--sans)',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--muted)',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.08em',
              borderBottom: '1px solid var(--border)',
            }}
          >
            Leads
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {conversations.length === 0 && (
              <div style={{ padding: 24, color: 'var(--muted)', fontFamily: 'var(--sans)', fontSize: 13 }}>
                Nenhuma conversa ainda
              </div>
            )}
            {conversations.map((c) => {
              const name = c.lead?.name ?? c.lead?.phone ?? 'Lead'
              const isSelected = c.id === selectedId
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    width: '100%',
                    textAlign: 'left' as const,
                    background: isSelected ? 'var(--rose-soft)' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'var(--rose)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--sans)',
                      fontWeight: 700,
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: 'var(--sans)',
                        fontWeight: 600,
                        fontSize: 13,
                        color: 'var(--ink)',
                        whiteSpace: 'nowrap' as const,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {name}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--sans)',
                        fontSize: 12,
                        color: 'var(--muted)',
                        whiteSpace: 'nowrap' as const,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {c.lead?.channel ?? 'whatsapp'}
                    </div>
                  </div>
                  {c.last_message_at && (
                    <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>
                      {timeAgo(c.last_message_at)}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Column 2: Message thread ── */}
        <div style={{ ...colStyle, flex: 1 }}>
          {!selectedId ? (
            <div style={emptyState}>Selecione uma conversa</div>
          ) : (
            <>
              <div
                style={{
                  overflowY: 'auto',
                  flex: 1,
                  padding: '20px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {messages.map((m) => (
                  <div key={m.id}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: m.role === 'user' ? 'flex-start' : 'flex-end',
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '72%',
                          padding: '10px 14px',
                          borderRadius: m.role === 'user' ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                          background: m.role === 'user' ? 'var(--rose-soft)' : 'var(--white)',
                          border: '1px solid var(--border)',
                          fontFamily: 'var(--sans)',
                          fontSize: 14,
                          color: 'var(--ink)',
                          lineHeight: 1.5,
                        }}
                      >
                        {m.content}
                      </div>
                    </div>
                    {m.role === 'user' && m.suggested_reply && (
                      <div
                        style={{
                          margin: '8px 0 0 0',
                          padding: '12px 16px',
                          background: '#fefce8',
                          border: '1px solid #fde047',
                          borderRadius: 12,
                          fontFamily: 'var(--sans)',
                          fontSize: 13,
                          color: '#78350f',
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Sugestão da IA:</div>
                        <div style={{ marginBottom: 10 }}>{m.suggested_reply}</div>
                        <button
                          onClick={() => useAiSuggestion(m.suggested_reply!)}
                          style={{
                            padding: '6px 14px',
                            background: '#f59e0b',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'var(--sans)',
                          }}
                        >
                          Usar esta resposta
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div
                style={{
                  borderTop: '1px solid var(--border)',
                  padding: '16px 24px',
                  background: 'var(--white)',
                }}
              >
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder="Digite sua resposta… (Enter para enviar)"
                  style={{
                    width: '100%',
                    minHeight: 72,
                    padding: '10px 14px',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    fontFamily: 'var(--sans)',
                    fontSize: 14,
                    resize: 'none' as const,
                    boxSizing: 'border-box' as const,
                    color: 'var(--ink)',
                    background: 'var(--paper)',
                  }}
                />
                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <button
                    onClick={sendMessage}
                    disabled={sendingMsg || !replyText.trim()}
                    style={{
                      padding: '8px 18px',
                      background: 'var(--rose)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'var(--sans)',
                      opacity: sendingMsg || !replyText.trim() ? 0.6 : 1,
                    }}
                  >
                    Enviar
                  </button>
                  <button
                    onClick={requestAiSuggestion}
                    disabled={loadingReply}
                    style={{
                      padding: '8px 18px',
                      background: 'transparent',
                      color: 'var(--rose)',
                      border: '1px solid var(--rose)',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'var(--sans)',
                      opacity: loadingReply ? 0.6 : 1,
                    }}
                  >
                    {loadingReply ? 'Gerando…' : '✨ Pedir sugestão da IA'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Column 3: Lead panel ── */}
        <div style={{ ...colStyle, width: 260, minWidth: 260, borderRight: 'none' }}>
          {!selectedConv ? (
            <div style={emptyState}>—</div>
          ) : (
            <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
              <div
                style={{
                  fontFamily: 'var(--sans)',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--muted)',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.08em',
                  marginBottom: 16,
                }}
              >
                Lead
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(
                  [
                    { label: 'Nome', value: selectedConv.lead?.name },
                    { label: 'Telefone', value: selectedConv.lead?.phone },
                    { label: 'Canal', value: selectedConv.lead?.channel },
                    { label: 'Status', value: selectedConv.lead?.status },
                  ] as { label: string; value: string | null | undefined }[]
                ).map(({ label, value }) => (
                  <div key={label}>
                    <div
                      style={{
                        fontFamily: 'var(--sans)',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--muted)',
                        marginBottom: 2,
                      }}
                    >
                      {label}
                    </div>
                    <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink)' }}>
                      {value ?? '—'}
                    </div>
                  </div>
                ))}

                {selectedConv.lead?.tags && selectedConv.lead.tags.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--sans)',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--muted)',
                        marginBottom: 6,
                      }}
                    >
                      Tags
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                      {selectedConv.lead.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            padding: '3px 10px',
                            background: 'var(--rose-soft)',
                            borderRadius: 20,
                            fontFamily: 'var(--sans)',
                            fontSize: 12,
                            color: 'var(--rose)',
                            fontWeight: 600,
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={toggleMode}
                  style={{
                    marginTop: 16,
                    padding: '10px 14px',
                    background: selectedConv.mode === 'copilot' ? '#f0fdf4' : 'var(--rose-soft)',
                    color: selectedConv.mode === 'copilot' ? '#16a34a' : 'var(--rose)',
                    border: `1px solid ${selectedConv.mode === 'copilot' ? '#86efac' : 'var(--rose)'}`,
                    borderRadius: 10,
                    fontFamily: 'var(--sans)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {selectedConv.mode === 'copilot' ? '✅ Modo copiloto ativo' : 'Assumir conversa'}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
