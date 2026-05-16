export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface AgentConfig {
  tone: 'descontraido' | 'formal' | 'consultivo'
  niche: string
  knowledge_base: string
  calendar_url?: string
}

const TONE_DESCRIPTIONS: Record<AgentConfig['tone'], string> = {
  descontraido: 'amigável e descontraído, como um atendente simpático de WhatsApp',
  formal: 'profissional e direto ao ponto',
  consultivo: 'consultivo e educativo, como um especialista que educa o cliente antes de vender',
}

export async function generateResponse(
  messages: Message[],
  agentConfig: AgentConfig
): Promise<{ text: string; mock: boolean }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      text: '[Demo] Resposta simulada — adicione ANTHROPIC_API_KEY para ativar o agente real.',
      mock: true,
    }
  }

  // Dynamic import so the module doesn't throw at build time when key is absent
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // Fix 3: Truncate knowledge_base to 6000 chars
  const kb = (agentConfig.knowledge_base ?? '').slice(0, 6_000)

  const lines = [
    `Você é Kaya, assistente de vendas de um negócio de ${agentConfig.niche}.`,
    `Tom: ${TONE_DESCRIPTIONS[agentConfig.tone]}.`,
    `Sobre o negócio: ${kb}`,
    'Responda sempre em português, de forma concisa (máximo 3 parágrafos). Seja direto e útil.',
  ]
  if (agentConfig.calendar_url) {
    lines.push(
      `Quando o lead demonstrar interesse em agendar uma consulta, visita ou demonstração, mencione que pode agendar diretamente aqui: ${agentConfig.calendar_url}`
    )
  }
  const systemPrompt = lines.join('\n')

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 512,
      system: systemPrompt,
      messages,
    })

    // Fix 2: Scan all content blocks for the first text block
    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      console.warn('[claude] No text block in response')
      return { text: '', mock: false }
    }

    if (response.stop_reason === 'max_tokens') {
      console.warn('[claude] Response truncated at max_tokens (512)')
    }

    const text = textBlock.text
    return { text, mock: false }
  } catch (error) {
    // Fix 1: Wrap API call in try/catch with user-facing error
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[claude] API error:', msg)
    return {
      text: `[Erro] Não foi possível gerar resposta: ${msg}`,
      mock: true,
    }
  }
}
