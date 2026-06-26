'use client'

import { createClient } from '@/lib/supabase/client'
import { getOrgId } from '@/lib/supabaseHelpers'

/** Convert camelCase keys to snake_case for PostgREST payloads. */
export function toSnakeKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue
    const snake = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
    out[snake] = value
  }
  return out
}

type RouteSpec = {
  table: string
  listShape?: 'array' | 'data-wrapper'
  order?: { column: string; ascending?: boolean }
}

const ROUTES: Record<string, RouteSpec> = {
  '/contacts': { table: 'contacts', listShape: 'data-wrapper', order: { column: 'created_at', ascending: false } },
  '/companies': { table: 'companies', listShape: 'data-wrapper', order: { column: 'name', ascending: true } },
  '/deals': { table: 'deals', listShape: 'data-wrapper', order: { column: 'created_at', ascending: false } },
  '/activities': { table: 'activities', listShape: 'array', order: { column: 'created_at', ascending: false } },
  '/leads': { table: 'leads', listShape: 'array', order: { column: 'created_at', ascending: false } },
  '/tickets': { table: 'tickets', listShape: 'data-wrapper', order: { column: 'created_at', ascending: false } },
  '/notifications': { table: 'notifications', listShape: 'array', order: { column: 'created_at', ascending: false } },
  '/products': { table: 'products', listShape: 'array', order: { column: 'name', ascending: true } },
  '/goals': { table: 'sales_goals', listShape: 'array', order: { column: 'created_at', ascending: false } },
  '/templates': { table: 'email_templates', listShape: 'array', order: { column: 'created_at', ascending: false } },
  '/templates/quick-replies': { table: 'quick_replies', listShape: 'array', order: { column: 'created_at', ascending: false } },
  '/pipelines': { table: 'pipelines', listShape: 'data-wrapper', order: { column: 'created_at', ascending: false } },
  '/sequences': { table: 'email_sequences', listShape: 'array', order: { column: 'created_at', ascending: false } },
  '/sequences/enrollments': { table: 'sequence_enrollments', listShape: 'array', order: { column: 'created_at', ascending: false } },
  '/automations': { table: 'automation_rules', listShape: 'array', order: { column: 'created_at', ascending: false } },
  '/automations/executions': { table: 'automation_executions', listShape: 'array', order: { column: 'created_at', ascending: false } },
  '/audit': { table: 'audit_log', listShape: 'array', order: { column: 'created_at', ascending: false } },
  '/custom-fields': { table: 'custom_field_definitions', listShape: 'array', order: { column: 'order', ascending: true } },
  '/custom-fields/values': { table: 'custom_field_values', listShape: 'array' },
  '/custom-fields/i18n': { table: 'custom_field_definition_i18n', listShape: 'array' },
  '/distribution-lists': { table: 'distribution_lists', listShape: 'data-wrapper', order: { column: 'created_at', ascending: false } },
  '/views': { table: 'smart_views', listShape: 'data-wrapper', order: { column: 'created_at', ascending: false } },
  '/views/inbox': { table: 'inbox_views', listShape: 'data-wrapper', order: { column: 'created_at', ascending: false } },
  '/leads/scoring-rules': { table: 'lead_scoring_rules', listShape: 'array', order: { column: 'created_at', ascending: false } },
}

function parsePath(path: string): { base: string; id?: string; sub?: string; subId?: string } {
  const clean = path.split('?')[0]
  const parts = clean.split('/').filter(Boolean)
  if (parts.length === 0) return { base: '/' }

  if (parts[0] === 'leads' && parts.length >= 3) {
    const [, id, sub, subId] = parts
    return { base: `/leads/${id}/${sub}`, id, sub, subId }
  }
  if (parts[0] === 'templates' && parts[1] === 'quick-replies') {
    return parts.length >= 3
      ? { base: '/templates/quick-replies', id: parts[2] }
      : { base: '/templates/quick-replies' }
  }
  if (parts[0] === 'views' && parts[1] === 'inbox') {
    return parts.length >= 3 ? { base: '/views/inbox', id: parts[2] } : { base: '/views/inbox' }
  }
  if (parts[0] === 'sequences' && parts[1] === 'enrollments') {
    return parts.length >= 3 ? { base: '/sequences/enrollments', id: parts[2] } : { base: '/sequences/enrollments' }
  }
  if (parts[0] === 'automations' && parts[1] === 'executions') {
    return { base: '/automations/executions' }
  }
  if (parts[0] === 'custom-fields') {
    if (parts[1] === 'values') {
      return parts.length >= 3 ? { base: '/custom-fields/values', id: parts[2] } : { base: '/custom-fields/values' }
    }
    if (parts[1] === 'i18n') return { base: '/custom-fields/i18n' }
  }
  if (parts[0] === 'leads' && parts[1] === 'scoring-rules') {
    return parts.length >= 3 ? { base: '/leads/scoring-rules', id: parts[2] } : { base: '/leads/scoring-rules' }
  }

  const base = `/${parts[0]}`
  return parts.length >= 2 ? { base, id: parts[1] } : { base }
}

function wrapList(data: unknown[], shape?: RouteSpec['listShape']) {
  if (shape === 'data-wrapper') return { data }
  return data
}

function throwSupabaseError(error: { message: string; code?: string }, status = 400): never {
  const e = new Error(error.message) as Error & { status?: number }
  e.status = status
  throw e
}

export async function crmPostgrestRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T | undefined> {
  const supabase = createClient()
  const orgId = getOrgId()
  const parsed = parsePath(path)
  const query = path.includes('?') ? new URLSearchParams(path.split('?')[1]) : null

  // ── Preferences (user_preferences) ──────────────────────────────────────
  if (path.startsWith('/preferences/me')) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throwSupabaseError({ message: 'Not authenticated' }, 401)

    if (method === 'GET') {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) throwSupabaseError(error)
      return {
        navigation: data?.navigation ?? {},
        onboarding: data?.onboarding ?? {},
        dashboard: data?.dashboard ?? {},
      } as T
    }

    if (method === 'PATCH') {
      const patch = (body ?? {}) as Record<string, unknown>
      const column =
        path.includes('/navigation') ? 'navigation' : path.includes('/onboarding') ? 'onboarding' : path.includes('/dashboard') ? 'dashboard' : null
      if (!column) throwSupabaseError({ message: 'Unknown preferences path' })

      const { data: existing } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      const nextRow = {
        user_id: user.id,
        organization_id: orgId,
        navigation: existing?.navigation ?? {},
        onboarding: existing?.onboarding ?? {},
        dashboard: existing?.dashboard ?? {},
        [column]: column === 'onboarding' && Object.keys(patch).length === 0 ? {} : { ...(existing?.[column] as object ?? {}), ...patch },
      }

      const { error } = await supabase.from('user_preferences').upsert(nextRow, { onConflict: 'user_id' })
      if (error) throwSupabaseError(error)
      return undefined
    }
  }

  // ── Lead nested routes ────────────────────────────────────────────────────
  if (parsed.id && parsed.sub === 'events') {
    const leadId = parsed.id
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('lead_events')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
      if (error) throwSupabaseError(error)
      return (data ?? []) as T
    }
    if (method === 'POST') {
      const row = toSnakeKeys({ ...(body as Record<string, unknown>), leadId, organizationId: orgId })
      const { data, error } = await supabase.from('lead_events').insert(row).select('*').single()
      if (error) throwSupabaseError(error)
      return data as T
    }
  }

  if (parsed.id && parsed.sub === 'score-snapshots') {
    const leadId = parsed.id
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('lead_score_snapshots')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
      if (error) throwSupabaseError(error)
      return (data ?? []) as T
    }
    if (method === 'POST') {
      const row = toSnakeKeys({ ...(body as Record<string, unknown>), leadId, organizationId: orgId })
      const { data, error } = await supabase.from('lead_score_snapshots').insert(row).select('*').single()
      if (error) throwSupabaseError(error)
      return data as T
    }
  }

  // ── Notifications bulk ops ────────────────────────────────────────────────
  if (path === '/notifications/mark-all-read' && method === 'POST') {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('organization_id', orgId)
    if (error) throwSupabaseError(error)
    return undefined
  }
  if (path === '/notifications' && method === 'DELETE') {
    const { error } = await supabase.from('notifications').delete().eq('organization_id', orgId)
    if (error) throwSupabaseError(error)
    return undefined
  }

  // ── Custom field upserts ──────────────────────────────────────────────────
  if (path === '/custom-fields/values' && method === 'PUT') {
    const b = body as { entityId: string; fieldId: string; value: unknown }
    const row = { entity_id: b.entityId, field_id: b.fieldId, value: b.value, organization_id: orgId }
    const { error } = await supabase.from('custom_field_values').upsert(row, { onConflict: 'entity_id,field_id' })
    if (error) throwSupabaseError(error)
    return undefined
  }
  if (path === '/custom-fields/i18n' && method === 'PUT') {
    const b = toSnakeKeys(body as Record<string, unknown>)
    b.organization_id = orgId
    const { error } = await supabase
      .from('custom_field_definition_i18n')
      .upsert(b, { onConflict: 'field_id,language_code' })
    if (error) throwSupabaseError(error)
    return undefined
  }
  if (parsed.base === '/custom-fields/values' && parsed.id && method === 'DELETE') {
    const { error } = await supabase.from('custom_field_values').delete().eq('entity_id', parsed.id)
    if (error) throwSupabaseError(error)
    return undefined
  }

  // ── Template usage increment ──────────────────────────────────────────────
  if (parsed.base === '/templates' && parsed.id && path.endsWith('/increment-usage') && method === 'POST') {
    const { data: row, error: fetchErr } = await supabase.from('email_templates').select('usage_count').eq('id', parsed.id).single()
    if (fetchErr) throwSupabaseError(fetchErr, 404)
    const { error } = await supabase
      .from('email_templates')
      .update({ usage_count: (row?.usage_count ?? 0) + 1 })
      .eq('id', parsed.id)
    if (error) throwSupabaseError(error)
    return undefined
  }

  const routeKey = parsed.sub ? undefined : ROUTES[parsed.base]
  if (!routeKey) return null as unknown as T // signal: not handled

  const { table, listShape, order } = routeKey

  if (method === 'GET' && !parsed.id) {
    let q = supabase.from(table).select('*')
    if (table === 'deals' && query?.get('pipelineId')) {
      q = q.eq('pipeline_id', query.get('pipelineId')!)
    }
    if (order) q = q.order(order.column, { ascending: order.ascending ?? true })
    const { data, error } = await q
    if (error) throwSupabaseError(error)
    return wrapList(data ?? [], listShape) as T
  }

  if (method === 'GET' && parsed.id) {
    const { data, error } = await supabase.from(table).select('*').eq('id', parsed.id).maybeSingle()
    if (error) throwSupabaseError(error)
    if (!data) throwSupabaseError({ message: 'Not found' }, 404)
    return data as T
  }

  if (method === 'POST' && !parsed.id) {
    const row = toSnakeKeys((body ?? {}) as Record<string, unknown>)
    row.organization_id = orgId
    const { data, error } = await supabase.from(table).insert(row).select('*').single()
    if (error) throwSupabaseError(error)
    return data as T
  }

  if ((method === 'PATCH' || method === 'PUT') && parsed.id) {
    const row = toSnakeKeys((body ?? {}) as Record<string, unknown>)
    delete row.organization_id
    const { data, error } = await supabase.from(table).update(row).eq('id', parsed.id).select('*').single()
    if (error) throwSupabaseError(error)
    return data as T
  }

  if (method === 'DELETE' && parsed.id) {
    const { error } = await supabase.from(table).delete().eq('id', parsed.id)
    if (error) throwSupabaseError(error)
    return undefined
  }

  return null as unknown as T
}

export function isCrmPostgrestPath(path: string): boolean {
  const clean = path.split('?')[0]
  if (clean.startsWith('/preferences/me')) return true
  if (clean === '/notifications/mark-all-read') return true
  if (/^\/leads\/[^/]+\/(events|score-snapshots)/.test(clean)) return true
  if (clean === '/custom-fields/values' || clean === '/custom-fields/i18n') return true
  if (/^\/custom-fields\/values\//.test(clean)) return true
  if (/^\/templates\/[^/]+\/increment-usage$/.test(clean)) return true

  const parsed = parsePath(path)
  if (ROUTES[parsed.base]) return true
  if (parsed.base === '/custom-fields' && parsed.id) return true
  return false
}
