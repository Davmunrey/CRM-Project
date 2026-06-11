/**
 * GDPR / CCPA data-subject rights. Org-scoped, owner/admin only.
 *
 *   GET  /privacy/export                      Art. 20 — full org data export (portability)
 *   GET  /privacy/subject/:contactId/export   Art. 15 — one subject's data
 *   POST /privacy/subject/:contactId/erase    Art. 17 — erase/anonymize a subject's PII
 *
 * Erasure anonymizes the contact's identifying fields in place (keeping the row
 * so linked deals/activities and aggregate history stay referentially intact)
 * and is recorded in audit_log.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { db } from '../db/client.js'

function requireAdmin(req: FastifyRequest, reply: FastifyReply): boolean {
  const role = req.user.role
  if (role !== 'owner' && role !== 'admin') {
    reply.code(403).send({ error: 'Insufficient permissions' })
    return false
  }
  return true
}

export async function dataPrivacyRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  // ── Art. 20 — full org export ──────────────────────────────────────────────
  app.get('/export', async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    const orgId = req.user.org

    const [contacts, companies, deals, activities, leads] = await Promise.all([
      db`SELECT * FROM contacts WHERE organization_id = ${orgId} ORDER BY created_at`,
      db`SELECT * FROM companies WHERE organization_id = ${orgId} ORDER BY created_at`,
      db`SELECT * FROM deals WHERE organization_id = ${orgId} ORDER BY created_at`,
      db`SELECT * FROM activities WHERE organization_id = ${orgId} ORDER BY created_at`,
      db`SELECT * FROM leads WHERE organization_id = ${orgId} ORDER BY created_at`,
    ])

    reply.header('Content-Disposition', 'attachment; filename="n0crm-data-export.json"')
    return reply.send({
      exportedAt: new Date().toISOString(),
      organizationId: orgId,
      counts: {
        contacts: contacts.length,
        companies: companies.length,
        deals: deals.length,
        activities: activities.length,
        leads: leads.length,
      },
      data: { contacts, companies, deals, activities, leads },
    })
  })

  // ── Art. 15 — single subject export ────────────────────────────────────────
  app.get('/subject/:contactId/export', async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    const { contactId } = req.params as { contactId: string }
    const orgId = req.user.org

    const [contact] = await db`
      SELECT * FROM contacts WHERE id = ${contactId} AND organization_id = ${orgId} LIMIT 1
    `
    if (!contact) return reply.code(404).send({ error: 'Contact not found' })

    const [activities, deals] = await Promise.all([
      db`SELECT * FROM activities WHERE organization_id = ${orgId} AND contact_id = ${contactId} ORDER BY created_at`,
      db`SELECT * FROM deals WHERE organization_id = ${orgId} AND contact_id = ${contactId} ORDER BY created_at`,
    ])

    return reply.send({ exportedAt: new Date().toISOString(), contact, activities, deals })
  })

  // ── Art. 17 — erase / anonymize a subject ──────────────────────────────────
  app.post('/subject/:contactId/erase', async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    const { contactId } = req.params as { contactId: string }
    const orgId = req.user.org

    const [existing] = await db`
      SELECT id, first_name, last_name FROM contacts
      WHERE id = ${contactId} AND organization_id = ${orgId} LIMIT 1
    `
    if (!existing) return reply.code(404).send({ error: 'Contact not found' })

    const priorName = `${existing['firstName'] ?? ''} ${existing['lastName'] ?? ''}`.trim()

    // Anonymize identifying fields in place; keep the row so linked records and
    // aggregate metrics remain referentially intact.
    const [updated] = await db`
      UPDATE contacts SET
        first_name = 'Redacted',
        last_name = '',
        email = NULL,
        phone = NULL,
        job_title = NULL,
        notes = NULL,
        linkedin_url = NULL,
        tags = '{}',
        updated_at = now()
      WHERE id = ${contactId} AND organization_id = ${orgId}
      RETURNING id
    `
    if (!updated) return reply.code(404).send({ error: 'Contact not found' })

    await db`
      INSERT INTO audit_log (action, entity_type, entity_id, entity_name, details, user_id, organization_id)
      VALUES ('gdpr_erasure', 'contact', ${contactId}, ${priorName}, 'Subject PII erased/anonymized (GDPR Art. 17)', ${req.user.sub}, ${orgId})
    `

    return reply.send({ erased: true, contactId })
  })
}
