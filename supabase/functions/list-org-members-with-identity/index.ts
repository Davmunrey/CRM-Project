import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeadersForRequest, isCorsOriginBlocked } from '../_shared/cors-allowlist.ts'

type MemberRow = {
  user_id: string
  member_role: string
  job_title: string | null
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
}

type AuthUserRow = {
  id: string
  email: string | null
  raw_user_meta_data: Record<string, unknown> | null
}

function displayNameFromMeta(email: string | null, meta: Record<string, unknown> | null): string {
  const fullName = typeof meta?.full_name === 'string' ? meta.full_name.trim() : ''
  if (fullName) return fullName
  if (email && email.includes('@')) return email.split('@')[0]
  return 'user'
}

Deno.serve(async (req) => {
  if (isCorsOriginBlocked(req)) return new Response('Forbidden', { status: 403 })
  const cors = corsHeadersForRequest(req)

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token)

  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const organizationId = user.app_metadata?.organization_id as string | undefined
  if (!organizationId) {
    return new Response(JSON.stringify({ members: [] }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const { data: membersData, error: membersError } = await admin
    .from('organization_members')
    .select('user_id, role, job_title, phone, avatar_url, is_active, created_at')
    .eq('organization_id', organizationId)

  if (membersError) {
    return new Response(JSON.stringify({ error: membersError.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const members = (membersData ?? []).map((row) => ({
    user_id: String((row as Record<string, unknown>).user_id ?? ''),
    member_role: String((row as Record<string, unknown>).role ?? 'sales_rep'),
    job_title: ((row as Record<string, unknown>).job_title as string | null) ?? null,
    phone: ((row as Record<string, unknown>).phone as string | null) ?? null,
    avatar_url: ((row as Record<string, unknown>).avatar_url as string | null) ?? null,
    is_active: Boolean((row as Record<string, unknown>).is_active ?? true),
    created_at: String((row as Record<string, unknown>).created_at ?? new Date().toISOString()),
  })) as MemberRow[]

  const userIds = members.map((m) => m.user_id).filter(Boolean)
  if (userIds.length === 0) {
    return new Response(JSON.stringify({ members: [] }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const { data: authRows, error: authRowsError } = await admin
    .schema('auth')
    .from('users')
    .select('id, email, raw_user_meta_data')
    .in('id', userIds)

  if (authRowsError) {
    return new Response(JSON.stringify({ error: authRowsError.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const byId = new Map((authRows ?? []).map((r) => {
    const row = r as unknown as AuthUserRow
    return [row.id, row]
  }))

  const hydrated = members.map((m) => {
    const authRow = byId.get(m.user_id)
    const email = authRow?.email ?? ''
    return {
      ...m,
      email,
      full_name: displayNameFromMeta(authRow?.email ?? null, authRow?.raw_user_meta_data ?? null),
    }
  })

  return new Response(JSON.stringify({ members: hydrated }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
})

