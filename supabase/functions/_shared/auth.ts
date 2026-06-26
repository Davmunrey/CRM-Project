import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type AuthContext = {
  userId: string
  orgId: string | null
  role: string
  supabase: ReturnType<typeof createClient>
}

export async function getAuthContext(req: Request): Promise<AuthContext | Response> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  )

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle()

  return {
    userId: user.id,
    orgId: profile?.organization_id ?? null,
    role: profile?.role ?? 'viewer',
    supabase,
  }
}

export function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )
}

export function toSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue
    out[k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)] = v
  }
  return out
}

function requireOrg(ctx: AuthContext): string | Response {
  if (!ctx.orgId) return new Response(JSON.stringify({ error: 'No organization' }), { status: 403 })
  return ctx.orgId
}

export type { AuthContext as HandlerContext }
