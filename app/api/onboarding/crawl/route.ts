// app/api/onboarding/crawl/route.ts
import { NextRequest } from 'next/server'
import { fetchAndExtract } from '@/lib/crawler'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url') ?? ''

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return Response.json(
      { error: 'URL inválida. Use http:// ou https://' },
      { status: 400 }
    )
  }

  try {
    const result = await fetchAndExtract(url)
    return Response.json(result)
  } catch (error) {
    const isTimeout =
      error instanceof Error && error.name === 'AbortError'
    const message = isTimeout
      ? 'O site demorou muito para responder. Tente novamente ou insira o conteúdo manualmente.'
      : 'Não conseguimos acessar este site. Insira o conteúdo manualmente.'
    return Response.json({ error: message }, { status: 422 })
  }
}
