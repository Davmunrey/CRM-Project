import type { AuthContext } from '../_shared/auth.ts'
import { toSnake } from '../_shared/auth.ts'

function requireOrg(ctx: AuthContext): string | Response {
  if (!ctx.orgId) return new Response(JSON.stringify({ error: 'No organization' }), { status: 403 })
  return ctx.orgId
}

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

export async function handleBilling(req: Request, ctx: AuthContext, path: string): Promise<Response> {
  if (path === '/billing/status' && req.method === 'GET') {
    const orgId = requireOrg(ctx)
    if (orgId instanceof Response) return orgId
    const { data: org } = await ctx.supabase.from('organizations').select('plan, settings').eq('id', orgId).single()
    return Response.json({ plan: org?.plan ?? 'free', status: 'active' })
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
