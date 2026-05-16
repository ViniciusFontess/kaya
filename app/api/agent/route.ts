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
  const { conversationId, message } = body ?? {}

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

  // Load agent config
  const { data: configRow } = await supabase
    .from('agent_configs')
    .select('tone, niche, knowledge_base')
    .eq('tenant_id', tenantId)
    .single()

  const agentConfig: AgentConfig = {
    tone: (configRow?.tone ?? 'descontraido') as AgentConfig['tone'],
    niche: configRow?.niche ?? 'geral',
    knowledge_base: configRow?.knowledge_base ?? '',
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

  // Save suggested_reply on the most recent user message in this conversation
  // Use service client to bypass RLS (no UPDATE policy exists for regular users)
  const service = createServiceClient()
  const { data: lastUserMsg } = await service
    .from('messages')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (lastUserMsg?.id) {
    await service
      .from('messages')
      .update({ suggested_reply: text })
      .eq('id', lastUserMsg.id)
  }

  return Response.json({ reply: text, mock })
}
