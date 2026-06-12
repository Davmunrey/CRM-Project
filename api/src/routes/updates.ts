/**
 * Monday-style "Updates" — threaded collaboration on CRM items (/updates).
 *
 * An update belongs to an entity (contact|company|deal|lead), can be a reply
 * (parentId), and can @mention org members. Mentions are embedded in the body as
 * `@[Display Name](user-uuid)` tokens; posting an update notifies each mentioned
 * member (validated to be in the same org) via the notifications table.
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'

const ENTITY_TYPES = ['contact', 'company', 'deal', 'lead'] as const

const UUID_RE = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/

/** Extract unique mentioned user ids from `@[Name](uuid)` tokens in an update body. */
export function parseMentions(body: string): string[] {
  const re = new RegExp(`@\\[[^\\]]+\\]\\((${UUID_RE.source})\\)`, 'g')
  const out = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = re.exec(body)) !== null) {
    if (m[1]) out.add(m[1].toLowerCase())
  }
  return [...out]
}

const createBody = z.object({
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.string().min(1).max(64),
  body: z.string().min(1).max(10000),
  parentId: z.string().uuid().optional(),
})

const listQuery = z.object({
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.string().min(1).max(64),
})

export async function updatesRoutes(app: FastifyInstance) {
  const auth = { onRequest: [app.authenticate] }

  // List updates for an item (flat, newest-first; the client nests replies by parentId).
  app.get('/', auth, async (req, reply) => {
    const q = listQuery.safeParse(req.query)
    if (!q.success) return reply.code(400).send({ error: 'entityType and entityId are required' })
    const orgId = req.user.org
    const rows = await db`
      SELECT u.id, u.entity_type, u.entity_id, u.parent_id, u.author_id, u.body, u.mentions, u.created_at, u.updated_at,
             a.name AS author_name, a.avatar_url AS author_avatar
      FROM item_updates u
      LEFT JOIN users a ON a.id = u.author_id
      WHERE u.organization_id = ${orgId}
        AND u.entity_type = ${q.data.entityType}
        AND u.entity_id = ${q.data.entityId}
        AND u.deleted_at IS NULL
      ORDER BY u.created_at ASC
    `
    return reply.send({ data: rows })
  })

  // Post an update (or a reply) + notify mentioned org members.
  app.post('/', auth, async (req, reply) => {
    const parsed = createBody.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid request' })
    const orgId = req.user.org
    if (!orgId) return reply.code(403).send({ error: 'No organization' })
    const { entityType, entityId, body, parentId } = parsed.data

    // A reply must point at a non-deleted update in the same org/entity.
    if (parentId) {
      const [parent] = await db`
        SELECT id FROM item_updates
        WHERE id = ${parentId} AND organization_id = ${orgId} AND deleted_at IS NULL LIMIT 1
      `
      if (!parent) return reply.code(404).send({ error: 'Parent update not found' })
    }

    // Only notify mentioned ids that are real, active members of THIS org (no cross-org leak).
    const mentionIds = parseMentions(body)
    let validMentions: string[] = []
    if (mentionIds.length > 0) {
      const members = await db`
        SELECT id FROM users WHERE organization_id = ${orgId} AND is_active = true AND id = ANY(${mentionIds}::uuid[])
      `
      validMentions = members.map((m) => m['id'] as string)
    }

    const [row] = await db`
      INSERT INTO item_updates (organization_id, entity_type, entity_id, parent_id, author_id, body, mentions)
      VALUES (${orgId}, ${entityType}, ${entityId}, ${parentId ?? null}, ${req.user.sub}, ${body}, ${db.json(validMentions)})
      RETURNING id, entity_type, entity_id, parent_id, author_id, body, mentions, created_at, updated_at
    `

    // Fan out a notification to each mentioned member (except the author).
    const recipients = validMentions.filter((id) => id !== req.user.sub)
    if (recipients.length > 0) {
      const snippet = body.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1').slice(0, 140)
      for (const userId of recipients) {
        await db`
          INSERT INTO notifications (type, title, message, entity_type, entity_id, user_id, triggered_by, is_read, organization_id)
          VALUES ('mention', 'You were mentioned', ${snippet}, ${entityType}, ${entityId}, ${userId}, ${req.user.sub}, false, ${orgId})
        `
      }
    }

    const [author] = await db`SELECT name AS author_name, avatar_url AS author_avatar FROM users WHERE id = ${req.user.sub} LIMIT 1`
    return reply.code(201).send({ ...row, authorName: author?.['authorName'] ?? null, authorAvatar: author?.['authorAvatar'] ?? null })
  })

  // Soft-delete an update — author, or an elevated role (owner/admin/manager).
  app.delete('/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    const [row] = await db`SELECT author_id FROM item_updates WHERE id = ${id} AND organization_id = ${orgId} AND deleted_at IS NULL LIMIT 1`
    if (!row) return reply.code(404).send({ error: 'Not found' })
    const elevated = ['owner', 'admin', 'manager'].includes(req.user.role)
    if (row['authorId'] !== req.user.sub && !elevated) {
      return reply.code(403).send({ error: 'Only the author or a manager can delete this update' })
    }
    await db`UPDATE item_updates SET deleted_at = now(), updated_at = now() WHERE id = ${id} AND organization_id = ${orgId}`
    return reply.code(204).send()
  })
}
