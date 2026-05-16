// app/api/webhook/route.ts
// Evolution API v2 webhook stub.
// Without EVOLUTION_API_KEY: saves everything to Supabase, skips sending reply.
// Without EVOLUTION_WEBHOOK_SECRET: skips auth check (dev mode).

import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateResponse } from '@/lib/claude'
import type { AgentConfig } from '@/lib/claude'

interface EvolutionMessage {
  key?: { remoteJid?: string }
  pushName?: string
  message?: { conversation?: string; extendedTextMessage?: { text?: string } }
}

function extractText(msg: EvolutionMessage): string {
  return (
    msg.message?.conversation ??
    msg.message?.extendedTextMessage?.text ??
    ''
  )
}

function extractPhone(msg: EvolutionMessage): string {
  // remoteJid format: "5511999999999@s.whatsapp.net"
  return (msg.key?.remoteJid ?? '').replace('@s.whatsapp.net', '').replace('@c.us', '')
}

export async function POST(request: NextRequest) {
  // Optional webhook secret check
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET
  if (secret) {
    const authHeader = request.headers.get('authorization') ?? ''
    if (authHeader !== `Bearer ${secret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let payload: { data?: EvolutionMessage; tenantId?: string }
  try {
    payload = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const msg = payload.data
  if (!msg) return Response.json({ received: true })

  const phone = extractPhone(msg)
  const text = extractText(msg)
  const pushName = msg.pushName ?? phone

  if (!phone || !text) return Response.json({ received: true })

  // tenantId must be embedded in the webhook URL or payload for multi-tenant
  // For MVP, read from payload or env fallback
  const tenantId: string =
    payload.tenantId ?? process.env.DEFAULT_TENANT_ID ?? ''

  if (!tenantId) {
    console.warn('[webhook] No tenantId — skipping')
    return Response.json({ received: true })
  }

  const service = createServiceClient()

  // Upsert lead
  // Note: upsert resets status to 'open' on every inbound message.
  // Future: use INSERT ... ON CONFLICT DO UPDATE SET name = EXCLUDED.name, last_message_at = EXCLUDED.last_message_at
  // to preserve manually-set status. Acceptable for MVP.
  const { data: lead } = await service
    .from('leads')
    .upsert(
      { tenant_id: tenantId, phone, name: pushName, channel: 'whatsapp', status: 'open' },
      { onConflict: 'phone,tenant_id' }
    )
    .select('id')
    .single()

  if (!lead?.id) return Response.json({ received: true })

  // Upsert conversation
  // Note: upsert resets mode to 'auto' on every inbound message.
  // Future: use INSERT ... ON CONFLICT DO UPDATE SET ... to preserve manually-set mode. Acceptable for MVP.
  const { data: conversation } = await service
    .from('conversations')
    .upsert(
      { tenant_id: tenantId, lead_id: lead.id, channel: 'whatsapp', mode: 'auto' },
      { onConflict: 'lead_id' }
    )
    .select('id')
    .single()

  if (!conversation?.id) return Response.json({ received: true })

  // Insert inbound message
  const { data: insertedMsg, error: msgError } = await service
    .from('messages')
    .insert({
      tenant_id: tenantId,
      conversation_id: conversation.id,
      role: 'user',
      content: text,
    })
    .select('id')
    .single()

  if (msgError || !insertedMsg?.id) {
    console.error('[webhook] Failed to insert message:', msgError?.message)
    return Response.json({ received: true })
  }

  // Update lead.last_message_at
  await service
    .from('leads')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', lead.id)

  // Generate suggested reply
  const { data: configRow } = await service
    .from('agent_configs')
    .select('tone, niche, knowledge_base')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const agentConfig: AgentConfig = {
    tone: (configRow?.tone ?? 'descontraido') as AgentConfig['tone'],
    niche: configRow?.niche ?? 'geral',
    knowledge_base: configRow?.knowledge_base ?? '',
  }

  let replyText: string
  try {
    const result = await generateResponse(
      [{ role: 'user', content: text }],
      agentConfig
    )
    replyText = result.text
  } catch (e) {
    console.error('[webhook] generateResponse failed:', e)
    replyText = ''
  }

  // Save suggested reply on the message we just inserted (skip if generateResponse failed)
  if (replyText && insertedMsg?.id) {
    await service
      .from('messages')
      .update({ suggested_reply: replyText })
      .eq('id', insertedMsg.id)
  }

  // Send reply via Evolution API (only if key is configured and reply generated)
  if (replyText && process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_API_URL) {
    const instance = process.env.EVOLUTION_INSTANCE ?? 'default'
    await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: phone,
        textMessage: { text: replyText },
      }),
    }).catch((e) => console.error('[webhook] Evolution send failed:', e))
  }

  return Response.json({ received: true })
}
