import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'

const ruleBody = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  isActive: z.boolean().default(true),
  trigger: z.record(z.unknown()),
  actions: z.array(z.record(z.unknown())).default([]),
})

const executionBody = z.object({
  ruleId: z.string(),
  triggerType: z.string(),
  status: z.enum(['success', 'error']),
  context: z.record(z.unknown()).default({}),
  result: z.record(z.unknown()).default({}),
  errorMessage: z.string().optional(),
})

export async function automationsRoutes(app: FastifyInstance) {
  const auth = { onRequest: [app.authenticate] }

  app.get('/', auth, async (req) => {
    const orgId = req.user.org
    return db`SELECT * FROM automation_rules WHERE organization_id = ${orgId} ORDER BY created_at DESC`
  })

  app.post('/', auth, async (req, reply) => {
    const body = ruleBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const { name, description, isActive, trigger, actions } = body.data
    const orgId = req.user.org
    const now = new Date().toISOString()
    const [row] = await db`
      INSERT INTO automation_rules (name, description, is_active, trigger, actions, execution_count, organization_id, created_at, updated_at)
      VALUES (${name}, ${description}, ${isActive}, ${JSON.stringify(trigger)}, ${JSON.stringify(actions)}, 0, ${orgId}, ${now}, ${now})
      RETURNING *
    `
    return reply.code(201).send(row)
  })

  app.patch('/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    const body = ruleBody.partial().safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const d = body.data
    const now = new Date().toISOString()
    const [row] = await db`
      UPDATE automation_rules SET
        name = COALESCE(${d.name ?? null}, name),
        description = COALESCE(${d.description ?? null}, description),
        is_active = COALESCE(${d.isActive ?? null}, is_active),
        trigger = COALESCE(${d.trigger ? JSON.stringify(d.trigger) : null}, trigger),
        actions = COALESCE(${d.actions ? JSON.stringify(d.actions) : null}, actions),
        updated_at = ${now}
      WHERE id = ${id} AND organization_id = ${orgId}
      RETURNING *
    `
    if (!row) return reply.code(404).send({ error: 'Not found' })
    return reply.send(row)
  })

  app.delete('/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    await db`DELETE FROM automation_rules WHERE id = ${id} AND organization_id = ${orgId}`
    return reply.code(204).send()
  })

  // ── POST /automations/trigger ──────────────────────────────────────────────
  // Server-side automation execution: evaluate matching rules and execute actions
  app.post('/trigger', auth, async (req, reply) => {
    const body = z.object({
      triggerType: z.string(),
      context: z.record(z.unknown()).default({}),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const { triggerType, context } = body.data
    const orgId = req.user.org
    const now = new Date().toISOString()

    // Fetch active rules matching the trigger type
    const rules = await db`
      SELECT * FROM automation_rules
      WHERE organization_id = ${orgId} AND is_active = true
      ORDER BY created_at ASC
    `

    const results: { ruleId: string; ruleName: string; actionsExecuted: number; status: string }[] = []

    for (const rule of rules) {
      const trigger = (typeof rule.trigger === 'string' ? JSON.parse(rule.trigger as string) : rule.trigger) as Record<string, unknown>
      const actions = (typeof rule.actions === 'string' ? JSON.parse(rule.actions as string) : rule.actions) as Record<string, unknown>[]

      // Filter by trigger type
      if (trigger['type'] !== triggerType) continue

      // For deal_stage_changed: apply fromStage/toStage filters
      if (triggerType === 'deal_stage_changed') {
        if (trigger['fromStage'] && trigger['fromStage'] !== context['fromStage']) continue
        if (trigger['toStage'] && trigger['toStage'] !== context['toStage']) continue
      }

      let status = 'success'
      let actionsExecuted = 0
      let errorMessage: string | undefined

      try {
        const dealId = context['dealId'] as string | undefined
        const dealTitle = context['dealTitle'] as string ?? 'deal'
        const orgId2 = orgId

        for (const action of actions) {
          if (action['type'] === 'create_activity' && dealId) {
            const daysFromNow = action['activityDaysFromNow'] as number | undefined
            const dueDate = daysFromNow
              ? new Date(Date.now() + daysFromNow * 86_400_000).toISOString()
              : null
            await db`
              INSERT INTO activities (type, subject, description, status, deal_id, organization_id, created_by, created_at, updated_at)
              VALUES (
                ${(action['activityType'] as string) ?? 'task'},
                ${(action['activitySubject'] as string) ?? `Follow-up: ${dealTitle}`},
                ${`Auto-created by rule: ${rule.name as string}`},
                'pending', ${dealId}, ${orgId2}, 'Automations',
                ${now}, ${now}
              )
            `
            actionsExecuted++
          }

          if (action['type'] === 'update_deal_stage' && dealId && action['newStage']) {
            await db`
              UPDATE deals SET stage = ${action['newStage'] as string}, updated_at = ${now}
              WHERE id = ${dealId} AND organization_id = ${orgId2}
            `
            actionsExecuted++
          }

          if (action['type'] === 'assign_to_user' && dealId && action['userId']) {
            await db`
              UPDATE deals SET assigned_to = ${action['userId'] as string}, updated_at = ${now}
              WHERE id = ${dealId} AND organization_id = ${orgId2}
            `
            actionsExecuted++
          }

          if (action['type'] === 'send_notification' && dealId) {
            const title = (action['notificationTitle'] as string ?? 'Automation triggered')
              .replace('{dealTitle}', dealTitle)
              .replace('{ruleName}', rule.name as string)
            const message = (action['notificationMessage'] as string ?? '')
              .replace('{dealTitle}', dealTitle)
              .replace('{ruleName}', rule.name as string)
            await db`
              INSERT INTO notifications (organization_id, type, title, message, entity_type, entity_id, is_read, created_at)
              VALUES (${orgId2}, 'system', ${title}, ${message}, 'deal', ${dealId}, false, ${now})
            `
            actionsExecuted++
          }
        }
      } catch (e: unknown) {
        status = 'error'
        errorMessage = (e as Error).message
      }

      // Log execution
      await db`
        INSERT INTO automation_executions (organization_id, rule_id, trigger_type, status, context, result, error_message)
        VALUES (${orgId}, ${rule.id as string}, ${triggerType}, ${status},
          ${JSON.stringify(context)}, ${JSON.stringify({ actionsExecuted })}, ${errorMessage ?? null})
      `
      await db`
        UPDATE automation_rules
        SET execution_count = execution_count + 1, last_executed_at = ${now}, updated_at = ${now}
        WHERE id = ${rule.id as string}
      `

      results.push({ ruleId: rule.id as string, ruleName: rule.name as string, actionsExecuted, status })
    }

    return reply.send({ triggered: results.length, results })
  })

  // Executions
  app.get('/executions', auth, async (req) => {
    const orgId = req.user.org
    return db`
      SELECT id, rule_id, trigger_type, status, context, result, error_message, created_at
      FROM automation_executions WHERE organization_id = ${orgId}
      ORDER BY created_at DESC LIMIT 25
    `
  })

  app.post('/executions', auth, async (req, reply) => {
    const body = executionBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const { ruleId, triggerType, status, context, result, errorMessage } = body.data
    const orgId = req.user.org
    const ruleOwn = await db`SELECT 1 FROM automation_rules WHERE id = ${ruleId} AND organization_id = ${orgId} LIMIT 1`
    if (ruleOwn.length === 0) return reply.code(404).send({ error: 'Rule not found' })
    const [row] = await db`
      INSERT INTO automation_executions (organization_id, rule_id, trigger_type, status, context, result, error_message)
      VALUES (${orgId}, ${ruleId}, ${triggerType}, ${status}, ${JSON.stringify(context)}, ${JSON.stringify(result)}, ${errorMessage ?? null})
      RETURNING *
    `
    // Increment execution_count on the rule
    await db`
      UPDATE automation_rules
      SET execution_count = execution_count + 1, last_executed_at = NOW(), updated_at = NOW()
      WHERE id = ${ruleId} AND organization_id = ${orgId}
    `
    return reply.code(201).send(row)
  })
}
