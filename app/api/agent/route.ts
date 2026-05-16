import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateResponse } from '@/lib/claude'
import type { Message, AgentConfig } from '@/lib/claude'

export async function POST(request: NextRequest) {
  // Authenticate via session cookie (user-scoped client)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const { conversationId, message, messageId } = body ?? {}

  if (!conversationId || !message) {
    return Response.json(
      { error: 'conversationId and message are required' },
      { status: 400 }
    )
  }

  // Resolve tenant
  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!userData?.tenant_id) {
    return Response.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const tenantId: string = userData.tenant_id

  // Verify conversation belongs to this tenant (RLS-enforced check)
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('tenant_id', tenantId)
    .single()

  if (!conversation) {
    return Response.json({ error: 'Conversation not found' }, { status: 404 })
  }

  // Load agent config
  const { data: configRow } = await supabase
    .from('agent_configs')
    .select('tone, niche, knowledge_base, calendar_url')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const agentConfig: AgentConfig = {
    tone: (configRow?.tone ?? 'descontraido') as AgentConfig['tone'],
    niche: configRow?.niche ?? 'geral',
    knowledge_base: configRow?.knowledge_base ?? '',
    calendar_url: configRow?.calendar_url ?? undefined,
  }

  // Fetch last 10 messages for context
  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(10)

  const messages: Message[] = [
    ...(history ?? []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ]

  const { text, mock } = await generateResponse(messages, agentConfig)

  // Save suggested_reply on the specified or most recent user message in this conversation
  // Use service client to bypass RLS (no UPDATE policy exists for regular users)
  const service = createServiceClient()

  let targetMessageId: string | null = messageId ?? null

  if (!targetMessageId) {
    // Fallback: find the most recent user message in this conversation
    const { data: lastUserMsg } = await service
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('tenant_id', tenantId)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    targetMessageId = lastUserMsg?.id ?? null
  }

  if (targetMessageId) {
    await service
      .from('messages')
      .update({ suggested_reply: text })
      .eq('id', targetMessageId)
  }

  return Response.json({ reply: text, mock })
}
