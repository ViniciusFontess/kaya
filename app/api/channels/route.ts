// app/api/channels/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

interface EvolutionConfig {
  evolution_api_url: string
  evolution_api_key: string
  evolution_instance_name: string
}

async function getEvolutionConfig(tenantId: string): Promise<EvolutionConfig | null> {
  const service = createServiceClient()
  const { data } = await service
    .from('tenants')
    .select('evolution_api_url, evolution_api_key, evolution_instance_name')
    .eq('id', tenantId)
    .single()

  if (
    !data?.evolution_api_url ||
    !data?.evolution_api_key ||
    !data?.evolution_instance_name
  ) {
    return null
  }

  return {
    evolution_api_url: data.evolution_api_url,
    evolution_api_key: data.evolution_api_key,
    evolution_instance_name: data.evolution_instance_name,
  }
}

async function resolveUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { user: null, tenantId: null }

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .maybeSingle()

  return { user, tenantId: userData?.tenant_id ?? null }
}

export async function GET(request: NextRequest) {
  const { user, tenantId } = await resolveUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!tenantId) return Response.json({ error: 'Tenant not found' }, { status: 404 })

  const action = request.nextUrl.searchParams.get('action')
  const config = await getEvolutionConfig(tenantId)

  if (!config) {
    if (action === 'status') return Response.json({ state: 'unconfigured' })
    if (action === 'qrcode') return Response.json({ base64: null })
    return Response.json({ error: 'Evolution API not configured' }, { status: 400 })
  }

  const {
    evolution_api_url: apiUrl,
    evolution_api_key: apiKey,
    evolution_instance_name: instance,
  } = config

  if (action === 'status') {
    try {
      const res = await fetch(
        `${apiUrl}/instance/connectionState/${instance}`,
        {
          headers: { apikey: apiKey },
          signal: AbortSignal.timeout(5_000),
        }
      )
      if (!res.ok) return Response.json({ state: 'close' })
      const data = await res.json() as Record<string, unknown>
      // Evolution API v2: { instance: { state: 'open'|'connecting'|'close' } }
      const instanceData = data?.instance as Record<string, unknown> | undefined
      const state = (instanceData?.state ?? data?.state ?? 'close') as string
      return Response.json({ state })
    } catch {
      return Response.json({ state: 'close' })
    }
  }

  if (action === 'qrcode') {
    try {
      // Evolution API v2: GET /instance/connect/{instance} returns { base64, code }
      const res = await fetch(
        `${apiUrl}/instance/connect/${instance}`,
        {
          headers: { apikey: apiKey },
          signal: AbortSignal.timeout(10_000),
        }
      )
      if (!res.ok) return Response.json({ base64: null })
      const data = await res.json() as Record<string, unknown>
      const base64 = (data?.base64 ?? null) as string | null
      return Response.json({ base64 })
    } catch {
      return Response.json({ base64: null })
    }
  }

  return Response.json(
    { error: 'Unknown action. Use ?action=status or ?action=qrcode' },
    { status: 400 }
  )
}

export async function POST(request: NextRequest) {
  const { user, tenantId } = await resolveUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!tenantId) return Response.json({ error: 'Tenant not found' }, { status: 404 })

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const action = body?.action as string | undefined

  // Disconnect: clear Evolution API config
  if (action === 'disconnect') {
    const service = createServiceClient()
    const { error } = await service
      .from('tenants')
      .update({
        evolution_api_url: null,
        evolution_api_key: null,
        evolution_instance_name: null,
      })
      .eq('id', tenantId)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  }

  // Save config
  const evolution_api_url = (body?.evolution_api_url as string | undefined)?.trim() ?? ''
  const evolution_api_key = (body?.evolution_api_key as string | undefined)?.trim() ?? ''
  const evolution_instance_name =
    (body?.evolution_instance_name as string | undefined)?.trim() ?? ''

  if (!evolution_api_url || !evolution_api_key || !evolution_instance_name) {
    return Response.json({ error: 'All fields are required' }, { status: 400 })
  }

  // Strip trailing slash from URL
  const cleanUrl = evolution_api_url.replace(/\/$/, '')

  const service = createServiceClient()
  const { error } = await service
    .from('tenants')
    .update({
      evolution_api_url: cleanUrl,
      evolution_api_key,
      evolution_instance_name,
    })
    .eq('id', tenantId)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
