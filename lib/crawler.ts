// lib/crawler.ts

export interface CrawlResult {
  text: string
  title: string
  url: string
}

function isPrivateHost(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    // Block loopback, localhost, and common private ranges
    const privatePatterns = [
      /^localhost$/i,
      /^127\./,
      /^0\.0\.0\.0$/,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,   // AWS/GCP metadata
      /^::1$/,
      /^fc[0-9a-f]{2}:/i,
      /^fd[0-9a-f]{2}:/i,
    ]
    return privatePatterns.some((re) => re.test(hostname))
  } catch {
    return true // Unparseable URL → block it
  }
}

export async function fetchAndExtract(url: string): Promise<CrawlResult> {
  // SSRF protection: block private/loopback/link-local addresses
  if (isPrivateHost(url)) {
    throw new Error('URL aponta para endereço privado ou restrito')
  }

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

  // Strip remaining tags, decode entities, collapse whitespace
  const text = cleaned
    .replace(/<[^>]+>/g, ' ')
    // Numeric decimal entities: &#8217; → String.fromCodePoint(8217)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    // Numeric hex entities: &#x2019; → same
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    // Named entities (most common set)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8_000)

  return { text, title, url }
}
