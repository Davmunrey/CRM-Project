/**
 * CRM tools exposed to the tool-using agent.
 *
 * Every tool is strictly org-scoped: reads filter on `organization_id` and
 * writes both filter and verify FK ownership before mutating, so the agent can
 * never read or touch another tenant's data. Write tools (`create_activity`,
 * `update_deal_stage`) only run when the caller passes `allowWrites: true`;
 * otherwise they return a soft error the model can relay to the user.
 *
 * Each tool's `execute` returns a plain JSON-serializable object that is fed
 * back to the model verbatim, and (for writes) appends an audit_log row.
 */
import { z } from 'zod'
import { db } from '../../db/client.js'
import type { AiToolDef } from './providers.js'

export interface ToolContext {
  orgId: string
  userId: string
  /** When false, write tools refuse to mutate. */
  allowWrites: boolean
}

export interface CrmTool {
  def: AiToolDef
  /** Validates `args` and performs the action. Never throws for user errors. */
  execute(ctx: ToolContext, args: Record<string, unknown>): Promise<unknown>
}

const ACTIVITY_TYPES = [
  'call',
  'email',
  'meeting',
  'task',
  'note',
  'demo',
  'follow_up',
  'linkedin',
] as const

/** Confirm a row exists within the caller's org. Returns false when not found. */
async function ownsRow(table: 'contacts' | 'companies' | 'deals', id: string, orgId: string): Promise<boolean> {
  // Table name is a hard-coded literal (never user input), so db.unsafe is safe here.
  const rows = await db.unsafe(
    `SELECT 1 FROM ${table} WHERE id = $1 AND organization_id = $2 LIMIT 1`,
    [id, orgId],
  )
  return rows.length > 0
}

// ── search_contacts ──────────────────────────────────────────────────────────

const searchContacts: CrmTool = {
  def: {
    name: 'search_contacts',
    description:
      'Search contacts in the CRM by name, email or company. Returns up to `limit` matches with their id, name, email, job title, status and lead score.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Name, email fragment, or keyword to match.' },
        limit: { type: 'number', description: 'Max results (1-25, default 10).' },
      },
      required: ['query'],
    },
  },
  async execute(ctx, args) {
    const schema = z.object({ query: z.string().default(''), limit: z.coerce.number().min(1).max(25).default(10) })
    const { query, limit } = schema.parse(args)
    const like = `%${query}%`
    const rows = await db`
      SELECT id, first_name, last_name, email, job_title, status, type, lead_score, company_id
      FROM contacts
      WHERE organization_id = ${ctx.orgId}
        AND (first_name ILIKE ${like} OR last_name ILIKE ${like} OR email ILIKE ${like})
      ORDER BY lead_score DESC, updated_at DESC
      LIMIT ${limit}
    `
    return { count: rows.length, contacts: rows }
  },
}

// ── get_contact ──────────────────────────────────────────────────────────────

const getContact: CrmTool = {
  def: {
    name: 'get_contact',
    description: 'Fetch the full record for one contact by id, including recent linked activities.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Contact UUID.' } },
      required: ['id'],
    },
  },
  async execute(ctx, args) {
    const { id } = z.object({ id: z.string().uuid() }).parse(args)
    const rows = await db`
      SELECT c.id, c.first_name, c.last_name, c.email, c.phone, c.job_title,
             c.status, c.type, c.source, c.lead_score, c.tags, c.notes,
             c.last_contacted_at, c.linkedin_url, co.name AS company_name
      FROM contacts c
      LEFT JOIN companies co ON co.id = c.company_id AND co.organization_id = c.organization_id
      WHERE c.id = ${id} AND c.organization_id = ${ctx.orgId}
      LIMIT 1
    `
    if (rows.length === 0) return { error: 'Contact not found' }
    const activities = await db`
      SELECT type, subject, description, status, due_date, completed_at, created_at
      FROM activities
      WHERE organization_id = ${ctx.orgId} AND contact_id = ${id}
      ORDER BY created_at DESC
      LIMIT 10
    `
    return { contact: rows[0], recentActivities: activities }
  },
}

// ── search_companies ─────────────────────────────────────────────────────────

const searchCompanies: CrmTool = {
  def: {
    name: 'search_companies',
    description: 'Search companies by name or domain. Returns id, name, domain, industry, size and status.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number', description: 'Max results (1-25, default 10).' },
      },
      required: ['query'],
    },
  },
  async execute(ctx, args) {
    const { query, limit } = z
      .object({ query: z.string().default(''), limit: z.coerce.number().min(1).max(25).default(10) })
      .parse(args)
    const like = `%${query}%`
    const rows = await db`
      SELECT id, name, domain, industry, size, status, country, city
      FROM companies
      WHERE organization_id = ${ctx.orgId}
        AND (name ILIKE ${like} OR domain ILIKE ${like})
      ORDER BY updated_at DESC
      LIMIT ${limit}
    `
    return { count: rows.length, companies: rows }
  },
}

// ── search_deals ─────────────────────────────────────────────────────────────

const searchDeals: CrmTool = {
  def: {
    name: 'search_deals',
    description:
      'Search/list deals. Optionally filter by status (open/won/lost) or a free-text query on the title. Returns id, title, value, currency, stage, status and expected close date.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Optional title keyword.' },
        status: { type: 'string', enum: ['open', 'won', 'lost'] },
        limit: { type: 'number', description: 'Max results (1-25, default 10).' },
      },
    },
  },
  async execute(ctx, args) {
    const { query, status, limit } = z
      .object({
        query: z.string().optional(),
        status: z.enum(['open', 'won', 'lost']).optional(),
        limit: z.coerce.number().min(1).max(25).default(10),
      })
      .parse(args)
    const like = query ? `%${query}%` : null
    const rows = await db`
      SELECT id, title, value, currency, stage, status, expected_close_date, contact_id, company_id
      FROM deals
      WHERE organization_id = ${ctx.orgId}
        ${status ? db`AND status = ${status}` : db``}
        ${like ? db`AND title ILIKE ${like}` : db``}
      ORDER BY value DESC, updated_at DESC
      LIMIT ${limit}
    `
    return { count: rows.length, deals: rows }
  },
}

// ── get_deal ─────────────────────────────────────────────────────────────────

const getDeal: CrmTool = {
  def: {
    name: 'get_deal',
    description: 'Fetch one deal by id with its linked contact and recent activities.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Deal UUID.' } },
      required: ['id'],
    },
  },
  async execute(ctx, args) {
    const { id } = z.object({ id: z.string().uuid() }).parse(args)
    const rows = await db`
      SELECT d.id, d.title, d.value, d.currency, d.stage, d.status, d.notes,
             d.expected_close_date, d.closed_at,
             c.first_name, c.last_name, c.email
      FROM deals d
      LEFT JOIN contacts c ON c.id = d.contact_id AND c.organization_id = d.organization_id
      WHERE d.id = ${id} AND d.organization_id = ${ctx.orgId}
      LIMIT 1
    `
    if (rows.length === 0) return { error: 'Deal not found' }
    const activities = await db`
      SELECT type, subject, description, status, due_date, created_at
      FROM activities
      WHERE organization_id = ${ctx.orgId} AND deal_id = ${id}
      ORDER BY created_at DESC
      LIMIT 10
    `
    return { deal: rows[0], recentActivities: activities }
  },
}

// ── create_activity (write) ──────────────────────────────────────────────────

const createActivity: CrmTool = {
  def: {
    name: 'create_activity',
    description:
      'Log a CRM activity (call, email, meeting, task, note, demo, follow_up or linkedin). Optionally link it to a contact and/or deal and set a due date. Use this to record what happened or to schedule a follow-up task.',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: [...ACTIVITY_TYPES] },
        subject: { type: 'string', description: 'Short title.' },
        description: { type: 'string' },
        contactId: { type: 'string', description: 'Optional contact UUID to link.' },
        dealId: { type: 'string', description: 'Optional deal UUID to link.' },
        dueDate: { type: 'string', description: 'Optional ISO date/time for tasks/follow-ups.' },
      },
      required: ['type', 'subject'],
    },
  },
  async execute(ctx, args) {
    if (!ctx.allowWrites) {
      return { error: 'Write actions are disabled. Ask the user to enable actions to log activities.' }
    }
    const data = z
      .object({
        type: z.enum(ACTIVITY_TYPES),
        subject: z.string().min(1).max(300),
        description: z.string().max(4000).default(''),
        contactId: z.string().uuid().optional(),
        dealId: z.string().uuid().optional(),
        dueDate: z.string().datetime().optional(),
      })
      .parse(args)

    // Verify linked FKs belong to this org before inserting (no cross-org links).
    if (data.contactId && !(await ownsRow('contacts', data.contactId, ctx.orgId))) {
      return { error: 'contactId does not belong to your organization' }
    }
    if (data.dealId && !(await ownsRow('deals', data.dealId, ctx.orgId))) {
      return { error: 'dealId does not belong to your organization' }
    }

    const [row] = await db`
      INSERT INTO activities (
        organization_id, type, subject, description, status,
        contact_id, deal_id, due_date, created_by
      ) VALUES (
        ${ctx.orgId}, ${data.type}, ${data.subject}, ${data.description},
        ${data.dueDate ? 'pending' : 'completed'},
        ${data.contactId ?? null}, ${data.dealId ?? null}, ${data.dueDate ?? null}, ${ctx.userId}
      )
      RETURNING id, type, subject, status, due_date, created_at
    `
    await db`
      INSERT INTO audit_log (action, entity_type, entity_id, entity_name, details, user_id, organization_id)
      VALUES ('ai_activity_created', 'activity', ${row!['id'] as string}, ${data.subject},
              ${'Created via AI assistant'}, ${ctx.userId}, ${ctx.orgId})
    `
    return { ok: true, activity: row }
  },
}

// ── update_deal_stage (write) ────────────────────────────────────────────────

const updateDealStage: CrmTool = {
  def: {
    name: 'update_deal_stage',
    description:
      "Move a deal to a different pipeline stage, and optionally mark it won or lost. Use the stage names from the org's pipeline.",
    parameters: {
      type: 'object',
      properties: {
        dealId: { type: 'string', description: 'Deal UUID.' },
        stage: { type: 'string', description: 'Target stage name.' },
        status: { type: 'string', enum: ['open', 'won', 'lost'], description: 'Optional new status.' },
      },
      required: ['dealId', 'stage'],
    },
  },
  async execute(ctx, args) {
    if (!ctx.allowWrites) {
      return { error: 'Write actions are disabled. Ask the user to enable actions to move deals.' }
    }
    const data = z
      .object({
        dealId: z.string().uuid(),
        stage: z.string().min(1).max(120),
        status: z.enum(['open', 'won', 'lost']).optional(),
      })
      .parse(args)

    const closedAt = data.status === 'won' || data.status === 'lost' ? new Date().toISOString() : null
    const [row] = await db`
      UPDATE deals
      SET stage = ${data.stage},
          status = COALESCE(${data.status ?? null}, status),
          closed_at = COALESCE(${closedAt}, closed_at),
          updated_at = now()
      WHERE id = ${data.dealId} AND organization_id = ${ctx.orgId}
      RETURNING id, title, stage, status
    `
    if (!row) return { error: 'Deal not found' }
    await db`
      INSERT INTO audit_log (action, entity_type, entity_id, entity_name, details, user_id, organization_id)
      VALUES ('ai_deal_stage_updated', 'deal', ${row['id'] as string}, ${row['title'] as string},
              ${'Moved to ' + data.stage + (data.status ? ' (' + data.status + ')' : '')},
              ${ctx.userId}, ${ctx.orgId})
    `
    return { ok: true, deal: row }
  },
}

// ── Registry ─────────────────────────────────────────────────────────────────

export const CRM_TOOLS: CrmTool[] = [
  searchContacts,
  getContact,
  searchCompanies,
  searchDeals,
  getDeal,
  createActivity,
  updateDealStage,
]

const TOOL_BY_NAME = new Map(CRM_TOOLS.map((t) => [t.def.name, t]))

export function getTool(name: string): CrmTool | undefined {
  return TOOL_BY_NAME.get(name)
}

export function toolDefs(): AiToolDef[] {
  return CRM_TOOLS.map((t) => t.def)
}
