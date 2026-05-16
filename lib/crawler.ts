// lib/crawler.ts

export interface CrawlResult {
  text: string
  title: string
  url: string
}

export async function fetchAndExtract(url: string): Promise<CrawlResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  let html: string
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'KayaBot/1.0 (site reader for AI agent setup)' },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    html = await response.text()
  } finally {
    clearTimeout(timeout)
  }

  // Extract page title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : url

  // Remove noisy sections before stripping tags
  const cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
    .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, '')

  // Strip remaining tags, decode common entities, collapse whitespace
  const text = cleaned
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8_000)

  return { text, title, url }
}
