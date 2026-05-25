/**
 * sequenceRunner — polling worker that advances active sequence enrollments.
 *
 * Runs every 60 seconds. Each tick:
 *   1. Fetches up to 50 enrollments where status = 'active' AND next_step_at <= NOW()
 *   2. Per enrollment, resolves the sequence step at current_step index
 *   3. For 'email' steps: renders and sends the email via per-org SMTP (or env fallback)
 *   4. For 'wait' steps: advances immediately with no send
 *   5. Advances current_step; sets next_step_at from next step's delay_days (or completes)
 *   6. On error: marks enrollment as 'error', continues to next enrollment
 *
 * Uses postgres.js tagged-template client (no raw `pg` pool needed — the
 * existing `db` instance already wraps pg under the hood with connection pooling).
 * Transactions are expressed via db.begin().
 */

import postgres from 'postgres'
import { db } from '../db/client.js'
import { sendEmail } from '../services/email.js'
import { decryptToken } from '../services/tokenCipher.js'

// postgres.js transaction SQL handle type
type TxSql = postgres.TransactionSql

// ---------------------------------------------------------------------------
// Types matching the real schema columns (snake_case → camelCase via postgres.js transform)
// ---------------------------------------------------------------------------

interface SequenceStep {
  type: 'email' | 'wait'
  // email step fields
  subject?: string
  body?: string
  templateId?: string
  // wait step fields
  delayDays?: number
  delay_days?: number  // some callers may store in snake_case inside the JSON
}

interface Enrollment {
  id: string
  organizationId: string
  sequenceId: string
  contactId: string | null
  contactName: string
  currentStep: number
  status: string
  nextStepAt: string | null
}

interface Sequence {
  id: string
  steps: SequenceStep[]
}

interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string | null
  organizationId: string
}

interface OrgSmtpRow {
  host: string
  port: number
  username: string
  passwordEnc: string
  fromAddress: string
  fromName: string | null
  replyTo: string | null
  secure: 'starttls' | 'ssl' | 'none'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple {{variable}} substitution. */
function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '')
}

/** Resolve the delay_days from a step, normalising both camelCase and snake_case keys. */
function stepDelayDays(step: SequenceStep): number {
  return step.delayDays ?? step.delay_days ?? 1
}

/**
 * Load and decrypt the per-org SMTP config. Returns null when not found or
 * decryption fails — the caller should log a warning and skip the send.
 */
async function loadOrgSmtp(orgId: string): Promise<{
  host: string
  port: number
  secure: 'starttls' | 'ssl' | 'none'
  username: string
  password: string
  fromAddress: string
  fromName: string | null
  replyTo: string | null
} | null> {
  const rows = await db<OrgSmtpRow[]>`
    SELECT host, port, username, password_enc, from_address, from_name, reply_to, secure
    FROM org_smtp_settings
    WHERE organization_id = ${orgId} AND is_active = true
    LIMIT 1
  `
  if (rows.length === 0) return null
  const r = rows[0]!
  let password = ''
  try {
    password = r.passwordEnc ? decryptToken(r.passwordEnc) : ''
  } catch {
    console.warn(`[sequenceRunner] Failed to decrypt SMTP password for org ${orgId} — skipping send`)
    return null
  }
  return {
    host: r.host,
    port: r.port,
    secure: r.secure,
    username: r.username,
    password,
    fromAddress: r.fromAddress,
    fromName: r.fromName,
    replyTo: r.replyTo,
  }
}

// ---------------------------------------------------------------------------
// Core runner cycle
// ---------------------------------------------------------------------------

export async function runSequenceCycle(): Promise<void> {
  // Fetch due enrollments (max 50 per tick)
  const enrollments = await db<Enrollment[]>`
    SELECT id, organization_id, sequence_id, contact_id, contact_name,
           current_step, status, next_step_at
    FROM sequence_enrollments
    WHERE status = 'active'
      AND next_step_at IS NOT NULL
      AND next_step_at <= NOW()
    ORDER BY next_step_at ASC
    LIMIT 50
  `

  if (enrollments.length === 0) return

  console.log(`[sequenceRunner] Processing ${enrollments.length} due enrollment(s)`)

  for (const enrollment of enrollments) {
    try {
      await processEnrollment(enrollment)
    } catch (err) {
      // Top-level safety net — processEnrollment already handles its own errors,
      // but if something unexpected escapes (e.g. a network issue during the DB
      // update itself) we still log it and move on.
      console.error(`[sequenceRunner] Unexpected error on enrollment ${enrollment.id}:`, err)
    }
  }
}

async function processEnrollment(enrollment: Enrollment): Promise<void> {
  // Wrap each enrollment in a transaction so a failure rolls back cleanly.
  await db.begin(async (tx) => {
    // Re-fetch the sequence inside the transaction to get a consistent view.
    const seqRows = await tx<Sequence[]>`
      SELECT id, steps FROM email_sequences WHERE id = ${enrollment.sequenceId} LIMIT 1
    `
    if (seqRows.length === 0) {
      console.warn(`[sequenceRunner] Sequence ${enrollment.sequenceId} not found — completing enrollment ${enrollment.id}`)
      await tx`
        UPDATE sequence_enrollments
        SET status = 'completed', completed_at = NOW()
        WHERE id = ${enrollment.id}
      `
      return
    }

    const sequence = seqRows[0]!
    const steps: SequenceStep[] = Array.isArray(sequence.steps) ? sequence.steps : []
    const stepIndex = enrollment.currentStep

    // No more steps → complete
    if (stepIndex >= steps.length) {
      await tx`
        UPDATE sequence_enrollments
        SET status = 'completed', completed_at = NOW()
        WHERE id = ${enrollment.id}
      `
      console.log(`[sequenceRunner] Enrollment ${enrollment.id} completed (all steps done)`)
      return
    }

    const step = steps[stepIndex]!

    if (step.type === 'email') {
      await processEmailStep(tx, enrollment, step, stepIndex, steps)
    } else {
      // 'wait' or any unknown type — just advance
      await advanceEnrollment(tx, enrollment.id, stepIndex, steps)
    }
  })
}

async function processEmailStep(
  tx: TxSql,
  enrollment: Enrollment,
  step: SequenceStep,
  stepIndex: number,
  steps: SequenceStep[],
): Promise<void> {
  if (!enrollment.contactId) {
    console.warn(`[sequenceRunner] Enrollment ${enrollment.id} has no contact_id — skipping email step`)
    await advanceEnrollment(tx, enrollment.id, stepIndex, steps)
    return
  }

  // Load contact
  const contactRows = await tx<Contact[]>`
    SELECT id, first_name, last_name, email, organization_id
    FROM contacts
    WHERE id = ${enrollment.contactId}
    LIMIT 1
  `
  if (contactRows.length === 0) {
    console.warn(`[sequenceRunner] Contact ${enrollment.contactId} not found — skipping email step on enrollment ${enrollment.id}`)
    await advanceEnrollment(tx, enrollment.id, stepIndex, steps)
    return
  }

  const contact = contactRows[0]!

  if (!contact.email) {
    console.warn(`[sequenceRunner] Contact ${contact.id} has no email address — skipping email step on enrollment ${enrollment.id}`)
    await advanceEnrollment(tx, enrollment.id, stepIndex, steps)
    return
  }

  // Resolve email content — use step fields directly, or look up a template
  let subject = step.subject ?? '(no subject)'
  let bodyHtml = step.body ?? ''

  if (step.templateId) {
    const tplRows = await tx<Array<{ subject: string; body: string }>>`
      SELECT subject, body FROM email_templates
      WHERE id = ${step.templateId}
      LIMIT 1
    `
    if (tplRows.length > 0) {
      const tpl = tplRows[0]!
      subject = tpl.subject
      bodyHtml = tpl.body
    }
  }

  // Variable substitution
  const vars: Record<string, string> = {
    first_name: contact.firstName,
    last_name: contact.lastName,
    company: '',  // contacts table has no company_name column; keep empty unless looked up
    firstName: contact.firstName,
    lastName: contact.lastName,
  }

  // Optionally look up company name if the contact is linked to one
  const companyRows = await tx<Array<{ name: string }>>`
    SELECT c.name
    FROM companies c
    INNER JOIN contacts ct ON ct.company_id = c.id
    WHERE ct.id = ${contact.id}
    LIMIT 1
  `
  if (companyRows.length > 0) {
    vars['company'] = companyRows[0]!.name
  }

  const renderedSubject = renderTemplate(subject, vars)
  const renderedBody = renderTemplate(bodyHtml, vars)

  // Load SMTP config
  const smtpConfig = await loadOrgSmtp(enrollment.organizationId)

  if (!smtpConfig) {
    console.warn(`[sequenceRunner] No SMTP config for org ${enrollment.organizationId} — skipping email, advancing step`)
    await advanceEnrollment(tx, enrollment.id, stepIndex, steps)
    return
  }

  // Send the email — do this outside the transaction body so a send failure
  // doesn't silently corrupt the DB, but the enrollment error update (below)
  // IS inside the outer tx.begin wrapper, so it will roll back if we rethrow.
  try {
    await sendEmail(
      {
        to: contact.email,
        subject: renderedSubject,
        html: renderedBody,
        text: renderedBody.replace(/<[^>]+>/g, ''),
      },
      smtpConfig,
    )
  } catch (sendErr) {
    console.error(
      `[sequenceRunner] Failed to send email for enrollment ${enrollment.id} step ${stepIndex}:`,
      sendErr,
    )
    // Mark the enrollment as error — the tx.begin will commit this update
    await tx`
      UPDATE sequence_enrollments
      SET status = 'error'
      WHERE id = ${enrollment.id}
    `
    // Record the failure in the audit log
    await tx`
      INSERT INTO audit_log (organization_id, action, entity_type, entity_id, entity_name, details, user_id)
      VALUES (
        ${enrollment.organizationId},
        'sequence_email_failed',
        'sequence_enrollment',
        ${enrollment.id},
        ${enrollment.contactName},
        ${sendErr instanceof Error ? sendErr.message : String(sendErr)},
        'system'
      )
    `
    return
  }

  // Record successful send in activities
  await tx`
    INSERT INTO activities (
      organization_id, type, subject, description, status,
      contact_id, created_by, completed_at
    ) VALUES (
      ${enrollment.organizationId},
      'email',
      ${renderedSubject},
      ${'Sent via sequence step ' + String(stepIndex + 1)},
      'completed',
      ${enrollment.contactId},
      'system',
      NOW()
    )
  `

  // Record in audit log
  await tx`
    INSERT INTO audit_log (organization_id, action, entity_type, entity_id, entity_name, details, user_id)
    VALUES (
      ${enrollment.organizationId},
      'sequence_email_sent',
      'sequence_enrollment',
      ${enrollment.id},
      ${enrollment.contactName},
      ${'Step ' + String(stepIndex + 1) + ': ' + renderedSubject},
      'system'
    )
  `

  // Advance to next step
  await advanceEnrollment(tx, enrollment.id, stepIndex, steps)
}

/**
 * Increments current_step and sets next_step_at based on the *next* step's
 * delay_days. If there is no next step the enrollment is marked completed.
 */
async function advanceEnrollment(
  tx: TxSql,
  enrollmentId: string,
  currentStepIndex: number,
  steps: SequenceStep[],
): Promise<void> {
  const nextIndex = currentStepIndex + 1

  if (nextIndex >= steps.length) {
    // No more steps — complete
    await tx`
      UPDATE sequence_enrollments
      SET current_step = ${nextIndex},
          status = 'completed',
          completed_at = NOW(),
          next_step_at = NULL
      WHERE id = ${enrollmentId}
    `
    console.log(`[sequenceRunner] Enrollment ${enrollmentId} completed after step ${currentStepIndex + 1}`)
    return
  }

  const nextStep = steps[nextIndex]!
  const delayDays = stepDelayDays(nextStep)

  await tx`
    UPDATE sequence_enrollments
    SET current_step = ${nextIndex},
        next_step_at = NOW() + (${delayDays} || ' days')::interval
    WHERE id = ${enrollmentId}
  `
}

// ---------------------------------------------------------------------------
// Lifecycle management
// ---------------------------------------------------------------------------

let intervalHandle: ReturnType<typeof setInterval> | null = null
const TICK_MS = 60_000

export function startSequenceRunner(): void {
  if (intervalHandle !== null) {
    console.warn('[sequenceRunner] Already running — ignoring duplicate start')
    return
  }

  console.log('[sequenceRunner] Starting (tick every 60s)')

  // Fire once immediately on startup so the first run doesn't wait a full minute.
  void runSequenceCycle().catch((err) => {
    console.error('[sequenceRunner] Initial tick error:', err)
  })

  intervalHandle = setInterval(() => {
    void runSequenceCycle().catch((err) => {
      console.error('[sequenceRunner] Tick error:', err)
    })
  }, TICK_MS)
}

export function stopSequenceRunner(): void {
  if (intervalHandle === null) return
  clearInterval(intervalHandle)
  intervalHandle = null
  console.log('[sequenceRunner] Stopped')
}
