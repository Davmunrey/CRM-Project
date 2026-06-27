import type { AuthContext } from '../_shared/auth.ts'
import { serviceClient, toSnake } from '../_shared/auth.ts'
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno&no-check'

function requireOrg(ctx: AuthContext): string | Response {
  if (!ctx.orgId) return new Response(JSON.stringify({ error: 'No organization' }), { status: 403 })
  return ctx.orgId
}

function requireAdmin(ctx: AuthContext): Response | null {
  if (ctx.role !== 'owner' && ctx.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden: requires admin' }), { status: 403 })
  }
  return null
}

type ProfileMemberRow = {
  id: string
  email: string | null
  name: string | null
  role: string | null
  job_title: string | null
  phone: string | null
  avatar_url: string | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

/** Profile row → the camelCase member shape the client (authStore) expects. */
function toMember(p: ProfileMemberRow) {
  return {
    id: p.id,
    email: p.email ?? '',
    name: p.name ?? '',
    role: p.role ?? 'sales_rep',
    jobTitle: p.job_title ?? '',
    phone: p.phone ?? undefined,
    avatarUrl: p.avatar_url ?? undefined,
    isActive: p.is_active ?? true,
    createdAt: p.created_at ?? new Date().toISOString(),
    updatedAt: p.updated_at ?? p.created_at ?? new Date().toISOString(),
  }
}

const MEMBER_COLS = 'id, email, name, role, job_title, phone, avatar_url, is_active, created_at, updated_at'
const VALID_ROLES = ['owner', 'admin', 'manager', 'sales_rep', 'viewer']

export async function handleGmailThreadLinks(req: Request, ctx: AuthContext, path: string): Promise<Response> {
  const orgId = requireOrg(ctx)
  if (orgId instanceof Response) return orgId

  if (req.method === 'GET') {
    const { data, error } = await ctx.supabase.from('gmail_thread_links').select('*').eq('organization_id', orgId)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    return Response.json(data ?? [])
  }

  if (req.method === 'POST') {
    const body = toSnake((await req.json()) as Record<string, unknown>)
    body.organization_id = orgId
    body.user_id = ctx.userId
    const { data, error } = await ctx.supabase.from('gmail_thread_links').upsert(body).select('*').single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    return Response.json(data, { status: 201 })
  }

  const threadId = decodeURIComponent(path.replace('/gmail/thread-links/', ''))
  if (req.method === 'DELETE') {
    const { error } = await ctx.supabase
      .from('gmail_thread_links')
      .delete()
      .eq('thread_id', threadId)
      .eq('user_id', ctx.userId)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    return new Response(null, { status: 204 })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
}

export async function handleGmailThreadWorkspace(req: Request, ctx: AuthContext, threadId: string): Promise<Response> {
  const orgId = requireOrg(ctx)
  if (orgId instanceof Response) return orgId

  if (req.method === 'GET') {
    const { data } = await ctx.supabase
      .from('gmail_thread_workspace')
      .select('*')
      .eq('thread_id', threadId)
      .eq('user_id', ctx.userId)
      .maybeSingle()
    return Response.json(data ?? null)
  }

  if (req.method === 'PUT') {
    const body = toSnake((await req.json()) as Record<string, unknown>)
    const row = {
      thread_id: threadId,
      user_id: ctx.userId,
      organization_id: orgId,
      ...body,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await ctx.supabase.from('gmail_thread_workspace').upsert(row).select('*').single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    return Response.json(data)
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
}

export async function handleEmailTracking(req: Request, ctx: AuthContext, path: string): Promise<Response> {
  const orgId = requireOrg(ctx)
  if (orgId instanceof Response) return orgId

  if (path === '/email-tracking/messages' && req.method === 'POST') {
    const body = toSnake((await req.json()) as Record<string, unknown>)
    body.organization_id = orgId
    body.user_id = ctx.userId
    const { data, error } = await ctx.supabase.from('email_tracking_messages').insert(body).select('*').single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    return Response.json(data, { status: 201 })
  }

  if (path === '/email-tracking/links' && req.method === 'POST') {
    const body = toSnake((await req.json()) as Record<string, unknown>)
    const { data, error } = await ctx.supabase.from('email_tracking_links').insert(body).select('*').single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    return Response.json(data, { status: 201 })
  }

  const statsMatch = path.match(/^\/email-tracking\/stats\/([^/]+)$/)
  if (statsMatch && req.method === 'GET') {
    const messageId = statsMatch[1]
    const { data: links } = await ctx.supabase
      .from('email_tracking_links')
      .select('id')
      .eq('message_id', messageId)
    const { count: opens } = await ctx.supabase
      .from('email_tracking_events')
      .select('*', { count: 'exact', head: true })
      .eq('tracking_message_id', messageId)
      .eq('event_type', 'open')
    return Response.json({ opens: opens ?? 0, clicks: links?.length ?? 0 })
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
}

export async function handleAutomations(req: Request, ctx: AuthContext, path: string): Promise<Response> {
  const orgId = requireOrg(ctx)
  if (orgId instanceof Response) return orgId

  if (path === '/automations/executions' && req.method === 'POST') {
    const body = toSnake((await req.json()) as Record<string, unknown>)
    body.organization_id = orgId
    const { data, error } = await ctx.supabase.from('automation_executions').insert(body).select('*').single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    return Response.json(data, { status: 201 })
  }

  if (path === '/automations/trigger' && req.method === 'POST') {
    const body = (await req.json()) as { ruleId?: string; triggerType?: string; context?: Record<string, unknown> }
    if (!body.ruleId) return new Response(JSON.stringify({ error: 'ruleId required' }), { status: 400 })
    const { data: rule } = await ctx.supabase
      .from('automation_rules')
      .select('*')
      .eq('id', body.ruleId)
      .eq('organization_id', orgId)
      .maybeSingle()
    if (!rule) return new Response(JSON.stringify({ error: 'Rule not found' }), { status: 404 })

    const exec = {
      organization_id: orgId,
      rule_id: body.ruleId,
      trigger_type: body.triggerType ?? 'manual',
      status: 'success',
      context: body.context ?? {},
      result: { triggered: true },
    }
    const { data, error } = await ctx.supabase.from('automation_executions').insert(exec).select('*').single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    await ctx.supabase
      .from('automation_rules')
      .update({ execution_count: (rule.execution_count ?? 0) + 1, updated_at: new Date().toISOString() })
      .eq('id', body.ruleId)
    return Response.json(data, { status: 201 })
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
}

export async function handlePipelines(req: Request, ctx: AuthContext, path: string): Promise<Response> {
  const orgId = requireOrg(ctx)
  if (orgId instanceof Response) return orgId

  const membersMatch = path.match(/^\/pipelines\/([^/]+)\/members(?:\/([^/]+))?$/)
  if (!membersMatch) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })

  const pipelineId = membersMatch[1]
  const memberUserId = membersMatch[2]

  if (req.method === 'POST' && !memberUserId) {
    const body = (await req.json()) as { userId: string; role?: string }
    const { data, error } = await ctx.supabase
      .from('pipeline_members')
      .insert({ pipeline_id: pipelineId, user_id: body.userId, role: body.role ?? 'member', organization_id: orgId })
      .select('*')
      .single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    return Response.json(data, { status: 201 })
  }

  if (req.method === 'DELETE' && memberUserId) {
    const { error } = await ctx.supabase
      .from('pipeline_members')
      .delete()
      .eq('pipeline_id', pipelineId)
      .eq('user_id', memberUserId)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    return new Response(null, { status: 204 })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
}

export async function handleAi(req: Request, ctx: AuthContext, path: string): Promise<Response> {
  const orgId = requireOrg(ctx)
  if (orgId instanceof Response) return orgId

  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  const configured = Boolean(geminiKey || openaiKey)

  if (path === '/ai/status' && req.method === 'GET') {
    return Response.json({
      enabled: configured,
      providers: [
        ...(geminiKey ? ['gemini'] : []),
        ...(openaiKey ? ['openai'] : []),
      ],
    })
  }

  if (!configured) {
    return new Response(JSON.stringify({ error: 'AI is not configured. Set GEMINI_API_KEY or OPENAI_API_KEY.' }), {
      status: 503,
    })
  }

  const body = req.method === 'POST' ? await req.json() : {}

  if (path === '/ai/summarize' || path === '/ai/draft-reply' || path === '/ai/next-best-action') {
    const prompt =
      path === '/ai/summarize'
        ? `Summarize: ${JSON.stringify(body)}`
        : path === '/ai/draft-reply'
          ? `Draft reply: ${JSON.stringify(body)}`
          : `Next best action: ${JSON.stringify(body)}`

    const apiKey = geminiKey ?? openaiKey
    const url = geminiKey
      ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
      : 'https://api.openai.com/v1/chat/completions'

    let text = ''
    if (geminiKey) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      })
      const json = await res.json()
      text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    } else {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }] }),
      })
      const json = await res.json()
      text = json?.choices?.[0]?.message?.content ?? ''
    }

    await ctx.supabase.from('ai_usage_log').insert({
      organization_id: orgId,
      user_id: ctx.userId,
      route: path,
      output_tokens: text.length,
    })

    return Response.json({ text })
  }

  if (path === '/ai/agent' && req.method === 'POST') {
    return Response.json({
      reply: 'Propel AI agent is available. Configure provider keys for full agentic tooling.',
      toolsUsed: [],
    })
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
}

export async function handleSequences(req: Request, ctx: AuthContext, path: string): Promise<Response> {
  const orgId = requireOrg(ctx)
  if (orgId instanceof Response) return orgId

  if (path === '/sequences/enrollments' && req.method === 'POST') {
    const body = toSnake((await req.json()) as Record<string, unknown>)
    body.organization_id = orgId
    const { data, error } = await ctx.supabase.from('sequence_enrollments').insert(body).select('*').single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    return Response.json(data, { status: 201 })
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
}

function getStripe(): Stripe | null {
  const key = Deno.env.get('STRIPE_SECRET_KEY')
  if (!key) return null
  return new Stripe(key, { apiVersion: '2025-03-31.basil', httpClient: Stripe.createFetchHttpClient() })
}

function appOrigin(req: Request): string {
  return req.headers.get('origin') || Deno.env.get('SITE_URL') || 'https://crm-project.vercel.app'
}

/**
 * Billing endpoints backed by Stripe.
 *  GET  /billing/status   → current plan + subscription (any org member)
 *  POST /billing/checkout → Stripe Checkout session for a plan (admins)
 *  POST /billing/portal   → Stripe billing portal session (admins)
 */
export async function handleBilling(req: Request, ctx: AuthContext, path: string): Promise<Response> {
  const orgId = requireOrg(ctx)
  if (orgId instanceof Response) return orgId
  const db = serviceClient()

  if (path === '/billing/status' && req.method === 'GET') {
    const { data: sub } = await db
      .from('subscriptions')
      .select('status, current_period_end, trial_ends_at, stripe_customer_id, plan:plans(slug, name, price_monthly, price_yearly)')
      .eq('organization_id', orgId)
      .maybeSingle()
    const { data: org } = await db.from('organizations').select('plan').eq('id', orgId).single()
    return Response.json({
      plan: org?.plan ?? 'free',
      status: sub?.status ?? 'active',
      subscription: sub ?? null,
      hasBilling: Boolean(Deno.env.get('STRIPE_SECRET_KEY')),
    })
  }

  const stripe = getStripe()
  if (!stripe) {
    return new Response(JSON.stringify({ error: 'Billing not configured (missing STRIPE_SECRET_KEY)' }), { status: 503 })
  }

  if (path === '/billing/checkout' && req.method === 'POST') {
    const adminErr = requireAdmin(ctx)
    if (adminErr) return adminErr
    const body = await req.json().catch(() => ({}))
    const interval = body.interval === 'yearly' ? 'yearly' : 'monthly'
    const { data: plan } = await db
      .from('plans')
      .select('id, slug, name, stripe_price_id_monthly, stripe_price_id_yearly')
      .or(`id.eq.${body.planId ?? '00000000-0000-0000-0000-000000000000'},slug.eq.${body.planSlug ?? '__none__'}`)
      .maybeSingle()
    const priceId = interval === 'yearly' ? plan?.stripe_price_id_yearly : plan?.stripe_price_id_monthly
    if (!plan || !priceId) {
      return new Response(JSON.stringify({ error: 'Plan or Stripe price not configured' }), { status: 400 })
    }

    // Reuse the org's Stripe customer if we already have one.
    const { data: existing } = await db
      .from('subscriptions').select('stripe_customer_id').eq('organization_id', orgId).maybeSingle()
    let customerId = existing?.stripe_customer_id as string | undefined
    if (!customerId) {
      const customer = await stripe.customers.create({ metadata: { organization_id: orgId } })
      customerId = customer.id
    }

    const origin = appOrigin(req)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/settings?billing=success`,
      cancel_url: `${origin}/settings?billing=cancelled`,
      subscription_data: { metadata: { organization_id: orgId, plan_id: plan.id } },
      metadata: { organization_id: orgId, plan_id: plan.id },
    })
    return Response.json({ url: session.url })
  }

  if (path === '/billing/portal' && req.method === 'POST') {
    const adminErr = requireAdmin(ctx)
    if (adminErr) return adminErr
    const { data: sub } = await db
      .from('subscriptions').select('stripe_customer_id').eq('organization_id', orgId).maybeSingle()
    if (!sub?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'No Stripe customer for this organization' }), { status: 400 })
    }
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id as string,
      return_url: `${appOrigin(req)}/settings`,
    })
    return Response.json({ url: portal.url })
  }

  return new Response(JSON.stringify({ error: 'Billing endpoint not implemented' }), { status: 501 })
}

export async function handleWebhooks(req: Request, ctx: AuthContext, path: string): Promise<Response> {
  const orgId = requireOrg(ctx)
  if (orgId instanceof Response) return orgId

  if (path === '/webhook-subscriptions' && req.method === 'GET') {
    const { data, error } = await ctx.supabase.from('webhook_subscriptions').select('*').eq('organization_id', orgId)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    return Response.json(data ?? [])
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
}

// ─── Team members ─────────────────────────────────────────────────────────────
// Routes: /orgs/me/members            GET (list) · POST (create)
//         /orgs/me/members/:id/role   PATCH
//         /orgs/me/members/:id/status PATCH
// Listing is allowed for any org member; mutations require admin/owner. Creating
// a member needs the service-role admin API (the only way to mint an auth user),
// so it runs through serviceClient(); the JWT custom claims hook + handle_new_user
// trigger then populate the profile from user_metadata.
export async function handleMembers(req: Request, ctx: AuthContext, path: string): Promise<Response> {
  const orgId = requireOrg(ctx)
  if (orgId instanceof Response) return orgId

  if (path === '/orgs/me/members' && req.method === 'GET') {
    const { data, error } = await ctx.supabase
      .from('profiles')
      .select(MEMBER_COLS)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true })
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    return Response.json({ data: ((data ?? []) as ProfileMemberRow[]).map(toMember) })
  }

  // All mutations below are admin/owner only.
  const forbidden = requireAdmin(ctx)
  if (forbidden) return forbidden

  if (path === '/orgs/me/members' && req.method === 'POST') {
    const body = (await req.json()) as {
      email?: string
      name?: string
      password?: string
      role?: string
      jobTitle?: string
      phone?: string
    }
    if (!body.email || !body.name || !body.password) {
      return new Response(JSON.stringify({ error: 'email, name and password are required' }), { status: 400 })
    }
    const role = VALID_ROLES.includes(body.role ?? '') ? body.role! : 'sales_rep'
    const admin = serviceClient()

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { name: body.name, role, organization_id: orgId },
    })
    if (createErr || !created?.user) {
      return new Response(JSON.stringify({ error: createErr?.message ?? 'Failed to create user' }), { status: 400 })
    }

    // The handle_new_user trigger creates the profile from metadata; upsert to
    // enforce org/role/job_title deterministically and return the final row.
    const { data: profile, error: upsertErr } = await admin
      .from('profiles')
      .upsert(
        {
          id: created.user.id,
          email: body.email,
          name: body.name,
          role,
          organization_id: orgId,
          job_title: body.jobTitle ?? null,
          phone: body.phone ?? null,
          is_active: true,
        },
        { onConflict: 'id' },
      )
      .select(MEMBER_COLS)
      .single()
    if (upsertErr) return new Response(JSON.stringify({ error: upsertErr.message }), { status: 400 })
    return Response.json(toMember(profile as ProfileMemberRow), { status: 201 })
  }

  const match = path.match(/^\/orgs\/me\/members\/([^/]+)\/(role|status)$/)
  if (match && req.method === 'PATCH') {
    const memberId = match[1]
    const action = match[2]

    // Target must belong to the caller's org.
    const { data: target } = await ctx.supabase
      .from('profiles')
      .select('id, organization_id, role')
      .eq('id', memberId)
      .maybeSingle()
    if (!target || (target as { organization_id: string }).organization_id !== orgId) {
      return new Response(JSON.stringify({ error: 'Member not found' }), { status: 404 })
    }
    const body = (await req.json()) as { role?: string; isActive?: boolean }

    if (action === 'role') {
      if (!VALID_ROLES.includes(body.role ?? '')) {
        return new Response(JSON.stringify({ error: 'Invalid role' }), { status: 400 })
      }
      // Last-owner safety: never leave the org without an owner.
      if ((target as { role: string }).role === 'owner' && body.role !== 'owner') {
        const { count } = await ctx.supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('role', 'owner')
        if ((count ?? 0) <= 1) {
          return new Response(JSON.stringify({ error: 'Cannot demote the last owner' }), { status: 409 })
        }
      }
      const { data, error } = await serviceClient()
        .from('profiles')
        .update({ role: body.role, updated_at: new Date().toISOString() })
        .eq('id', memberId)
        .eq('organization_id', orgId)
        .select(MEMBER_COLS)
        .single()
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
      return Response.json(toMember(data as ProfileMemberRow))
    }

    // action === 'status'
    if (typeof body.isActive !== 'boolean') {
      return new Response(JSON.stringify({ error: 'isActive boolean required' }), { status: 400 })
    }
    if (body.isActive === false && (target as { role: string }).role === 'owner') {
      const { count } = await ctx.supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('role', 'owner')
        .eq('is_active', true)
      if ((count ?? 0) <= 1) {
        return new Response(JSON.stringify({ error: 'Cannot deactivate the last owner' }), { status: 409 })
      }
    }
    const { data, error } = await serviceClient()
      .from('profiles')
      .update({ is_active: body.isActive, updated_at: new Date().toISOString() })
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .select(MEMBER_COLS)
      .single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    return Response.json(toMember(data as ProfileMemberRow))
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
}

// ─── Account (self + admin password) ──────────────────────────────────────────
// Routes: /auth/me                  PATCH  (self profile)
//         /auth/password            PATCH  (self change, re-verifies current)
//         /auth/admin/reset-password POST  (admin resets a member, service-role)
export async function handleAccount(req: Request, ctx: AuthContext, path: string): Promise<Response> {
  if (path === '/auth/me' && req.method === 'PATCH') {
    const body = toSnake((await req.json()) as Record<string, unknown>)
    // Only self-mutable profile fields.
    const allowed: Record<string, unknown> = {}
    for (const k of ['name', 'job_title', 'phone', 'avatar', 'avatar_url'] as const) {
      if (body[k] !== undefined) allowed[k === 'avatar' ? 'avatar_url' : k] = body[k]
    }
    allowed.updated_at = new Date().toISOString()
    const { data, error } = await ctx.supabase
      .from('profiles')
      .update(allowed)
      .eq('id', ctx.userId)
      .select(MEMBER_COLS)
      .single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    return Response.json(toMember(data as ProfileMemberRow))
  }

  if (path === '/auth/password' && req.method === 'PATCH') {
    const { currentPassword, newPassword } = (await req.json()) as {
      currentPassword?: string
      newPassword?: string
    }
    if (!currentPassword || !newPassword) {
      return new Response(JSON.stringify({ error: 'currentPassword and newPassword required' }), { status: 400 })
    }
    // Re-verify the current password before allowing the change.
    const { data: me } = await ctx.supabase.auth.getUser()
    const email = me.user?.email
    if (!email) return new Response(JSON.stringify({ error: 'No email on account' }), { status: 400 })
    const verifier = serviceClient()
    const { error: signErr } = await verifier.auth.signInWithPassword({ email, password: currentPassword })
    if (signErr) return new Response(JSON.stringify({ error: 'Current password is incorrect' }), { status: 400 })
    const { error } = await serviceClient().auth.admin.updateUserById(ctx.userId, { password: newPassword })
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    return Response.json({ ok: true })
  }

  if (path === '/auth/admin/reset-password' && req.method === 'POST') {
    const forbidden = requireAdmin(ctx)
    if (forbidden) return forbidden
    const orgId = requireOrg(ctx)
    if (orgId instanceof Response) return orgId
    const { userId, newPassword } = (await req.json()) as { userId?: string; newPassword?: string }
    if (!userId || !newPassword) {
      return new Response(JSON.stringify({ error: 'userId and newPassword required' }), { status: 400 })
    }
    // Confirm the target is in the caller's org before resetting.
    const { data: target } = await ctx.supabase
      .from('profiles')
      .select('id, organization_id')
      .eq('id', userId)
      .maybeSingle()
    if (!target || (target as { organization_id: string }).organization_id !== orgId) {
      return new Response(JSON.stringify({ error: 'Member not found' }), { status: 404 })
    }
    const { error } = await serviceClient().auth.admin.updateUserById(userId, { password: newPassword })
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    return Response.json({ ok: true })
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
}
