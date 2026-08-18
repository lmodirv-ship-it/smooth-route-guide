import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

async function sha256(input: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const body = await req.json().catch(() => ({}))
    const email = String(body?.email ?? '').trim().toLowerCase()
    const code = String(body?.code ?? '').trim()

    if (!email || !/^\d{6}$/.test(code)) return json({ error: 'invalid_input' }, 400)

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

    let maxAttempts = 5
    const { data: setting } = await admin
      .from('app_settings')
      .select('value')
      .eq('key', 'login_code')
      .maybeSingle()
    if (setting?.value) {
      const n = Number((setting.value as Record<string, unknown>).maxAttempts)
      if (Number.isFinite(n) && n >= 1 && n <= 20) maxAttempts = n
    }

    const { data: rows } = await admin
      .from('login_codes')
      .select('id, code, attempts, verification, validation')
      .eq('email', email)
      .eq('verification', false)
      .gt('validation', new Date().toISOString())
      .order('date', { ascending: false })
      .limit(1)

    const row = rows?.[0]
    if (!row) return json({ ok: false, reason: 'expired' })

    if (row.attempts >= maxAttempts) return json({ ok: false, reason: 'too_many_attempts' })

    const codeHash = await sha256(`${email}:${code}`)
    if (codeHash !== row.code) {
      await admin
        .from('login_codes')
        .update({ attempts: row.attempts + 1 })
        .eq('id', row.id)
      return json({ ok: false, reason: 'mismatch' })
    }

    await admin.from('login_codes').update({ verification: true }).eq('id', row.id)

    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })
    if (linkError) throw linkError

    const tokenHash = (link?.properties as Record<string, string> | undefined)?.hashed_token
    if (!tokenHash) return json({ ok: false, reason: 'session_failed' }, 500)

    return json({ ok: true, token_hash: tokenHash })
  } catch (err) {
    console.error('verify-login-code error', err)
    return json({ error: 'unexpected_error' }, 500)
  }
})
