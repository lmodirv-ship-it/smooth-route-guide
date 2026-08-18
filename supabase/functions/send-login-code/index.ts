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
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ error: 'invalid_email' }, 400)
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

    // إعدادات الرمز من app_settings
    let minutes = 10
    let enabled = true
    const { data: setting } = await admin
      .from('app_settings')
      .select('value')
      .eq('key', 'login_code')
      .maybeSingle()
    if (setting?.value) {
      const v = setting.value as Record<string, unknown>
      if (typeof v.enabled === 'boolean') enabled = v.enabled
      const m = Number(v.expiryMinutes)
      if (Number.isFinite(m) && m >= 1 && m <= 60) minutes = m
    }
    if (!enabled) return json({ ok: true })

    // حد المعدل
    try {
      await admin.rpc('enforce_rate_limit', {
        p_route_name: 'send-login-code',
        p_key: email,
        p_max_requests: 5,
        p_window_seconds: 600,
      })
    } catch (_) {
      // تجاهل أخطاء حد المعدل حتى لا نمنع الدخول
    }

    // لا نكشف وجود البريد من عدمه
    const { data: profile } = await admin
      .from('profiles')
      .select('id, name')
      .ilike('email', email)
      .maybeSingle()

    if (!profile) return json({ ok: true })

    const code = String(Math.floor(100000 + Math.random() * 900000))
    const codeHash = await sha256(`${email}:${code}`)
    const validation = new Date(Date.now() + minutes * 60_000).toISOString()

    const { error: insertError } = await admin.from('login_codes').insert({
      email,
      code: codeHash,
      validation,
    })
    if (insertError) throw insertError

    const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      },
      body: JSON.stringify({
        templateName: 'login-code',
        recipientEmail: email,
        idempotencyKey: `login-code-${codeHash.slice(0, 24)}`,
        templateData: { code, minutes },
      }),
    })

    if (!emailRes.ok) {
      const detail = await emailRes.text()
      console.error('send-transactional-email failed', emailRes.status, detail)
      return json({ ok: false, error: 'email_failed' }, 502)
    }

    return json({ ok: true })
  } catch (err) {
    console.error('send-login-code error', err)
    return json({ error: 'unexpected_error' }, 500)
  }
})
