import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const SIGNAL_TYPES = new Set(['domain_change', 'route_change', 'status', 'announcement', 'asset'])
const encoder = new TextEncoder()

async function hmacSign(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Missing service configuration')
  return createClient(url, key)
}

async function isAuthorized(req: Request, secret: string | null, body: Record<string, unknown> | null): Promise<boolean> {
  // Path 1: HMAC signature from a trusted group site
  const signature = req.headers.get('x-manara-signature')
  if (secret && signature && body) {
    const message = `${body.source_site ?? ''}.${body.signal_type ?? ''}.${body.signal_key ?? ''}.${body.new_value ?? ''}.${body.nonce ?? ''}`
    const expected = await hmacSign(secret, message)
    if (signature === expected) return true
  }
  // Path 2: authenticated admin JWT
  const authHeader = req.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const client = getServiceClient()
      const { data } = await client.auth.getUser(authHeader.slice(7))
      if (!data.user) return false
      const { data: roles } = await client.from('user_roles').select('role').eq('user_id', data.user.id)
      return (roles ?? []).some((r: { role: string }) => r.role === 'admin')
    } catch {
      return false
    }
  }
  return false
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const secret = Deno.env.get('MANARA_HMAC_SECRET') ?? null
  const url = new URL(req.url)
  const action = url.searchParams.get('action') ?? (req.method === 'GET' ? 'pull' : 'publish')

  let supabase
  try {
    supabase = getServiceClient()
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }

  try {
    if (req.method === 'POST' && action === 'publish') {
      let body: Record<string, unknown>
      try {
        body = await req.json()
      } catch {
        return json({ error: 'Invalid JSON body' }, 400)
      }

      const sourceSite = String(body.source_site ?? '').trim().slice(0, 120)
      const signalType = String(body.signal_type ?? 'status').trim()
      const signalKey = String(body.signal_key ?? '').trim().slice(0, 200)
      if (!sourceSite || !signalKey) return json({ error: 'source_site and signal_key are required' }, 400)
      if (!SIGNAL_TYPES.has(signalType)) return json({ error: `signal_type must be one of: ${[...SIGNAL_TYPES].join(', ')}` }, 400)

      if (!(await isAuthorized(req, secret, body))) {
        return json({ error: 'Unauthorized: provide an admin token or a valid HMAC signature' }, 401)
      }

      const targetSites: string[] = Array.isArray(body.target_sites)
        ? (body.target_sites as unknown[]).filter((s): s is string => typeof s === 'string').map((s) => s.slice(0, 120)).slice(0, 50)
        : []

      const { data: exported, error: exportError } = await supabase
        .from('manara_exports')
        .insert({
          source_site: sourceSite,
          signal_type: signalType,
          signal_key: signalKey,
          old_value: body.old_value != null ? String(body.old_value).slice(0, 500) : null,
          new_value: body.new_value != null ? String(body.new_value).slice(0, 500) : null,
          payload: typeof body.payload === 'object' && body.payload !== null ? body.payload : {},
          target_sites: targetSites,
          signature: req.headers.get('x-manara-signature'),
          status: 'delivered',
        })
        .select('id')
        .single()

      if (exportError) return json({ error: exportError.message }, 500)

      // Fan out to recipients as imports
      const recipients = targetSites.length > 0 ? targetSites : [null]
      const rows = recipients.map((site) => ({
        export_id: exported.id,
        sender_site: sourceSite,
        recipient_site: site,
        signal_type: signalType,
        signal_key: signalKey,
        signal_value: body.new_value != null ? String(body.new_value).slice(0, 500) : null,
        payload: typeof body.payload === 'object' && body.payload !== null ? body.payload : {},
        process_status: 'received',
      }))
      const { error: importError } = await supabase.from('manara_imports').insert(rows)
      if (importError) return json({ error: importError.message, export_id: exported.id }, 500)

      return json({ ok: true, export_id: exported.id, delivered_to: recipients.filter(Boolean) })
    }

    if (req.method === 'GET' && action === 'pull') {
      const site = (url.searchParams.get('site') ?? '').trim().slice(0, 120)
      if (!site) return json({ error: 'site query param is required' }, 400)
      const limit = Math.min(Number(url.searchParams.get('limit') ?? 50) || 50, 200)

      const { data, error } = await supabase
        .from('manara_imports')
        .select('id, sender_site, signal_type, signal_key, signal_value, payload, process_status, created_at')
        .or(`recipient_site.eq.${site},recipient_site.is.null`)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) return json({ error: error.message }, 500)
      return json({ ok: true, site, signals: data ?? [] })
    }

    if (req.method === 'POST' && action === 'ack') {
      let body: Record<string, unknown>
      try {
        body = await req.json()
      } catch {
        return json({ error: 'Invalid JSON body' }, 400)
      }
      const ids = Array.isArray(body.import_ids) ? body.import_ids.filter((i): i is string => typeof i === 'string').slice(0, 200) : []
      if (ids.length === 0) return json({ error: 'import_ids array is required' }, 400)

      const { error } = await supabase
        .from('manara_imports')
        .update({ process_status: 'applied', updated_at: new Date().toISOString() })
        .in('id', ids)
        .eq('process_status', 'received')

      if (error) return json({ error: error.message }, 500)
      return json({ ok: true, applied: ids.length })
    }

    return json({ error: 'Unknown action. Use publish, pull, or ack.' }, 400)
  } catch (e) {
    return json({ error: (e as Error).message ?? 'Unexpected error' }, 500)
  }
})
