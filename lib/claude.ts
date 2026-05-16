export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface AgentConfig {
  tone: 'descontraido' | 'formal' | 'consultivo'
  niche: string
  knowledge_base: string
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

  const systemPrompt = [
    `Você é Kaya, assistente de vendas de um negócio de ${agentConfig.niche}.`,
    `Tom: ${TONE_DESCRIPTIONS[agentConfig.tone]}.`,
    `Sobre o negócio: ${agentConfig.knowledge_base}`,
    'Responda sempre em português, de forma concisa (máximo 3 parágrafos). Seja direto e útil.',
  ].join('\n')

  const response = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 512,
    system: systemPrompt,
    messages,
  })

  const block = response.content[0]
  const text = block.type === 'text' ? block.text : ''
  return { text, mock: false }
}
