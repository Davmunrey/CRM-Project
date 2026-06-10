/**
 * Append-only security-event logging (auth & account security). Fire-and-forget:
 * a logging failure must NEVER break the request it describes. Distinct from the
 * org-scoped audit_log — these events may have no org/actor (e.g. a failed login
 * for an unknown email). See migration 020_security_events.sql.
 */
import type { FastifyRequest } from 'fastify'
import { db } from '../db/client.js'

export type SecurityEventType =
  | 'login_success'
  | 'login_failed'
  | 'login_mfa_required'
  | 'login_mfa_failed'
  | 'logout'
  | 'register'
  | 'password_changed'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | 'mfa_enabled'
  | 'mfa_disabled'
  | 'impersonation_started'
  | 'impersonation_ended'

export interface SecurityEventOpts {
  actorUserId?: string | null
  actorEmail?: string | null
  organizationId?: string | null
  detail?: string
}

/**
 * Record a security event. Best-effort and non-blocking — never throws and never
 * awaits the caller's path. Captures client IP + user-agent from `req` when given.
 */
export function recordSecurityEvent(
  req: FastifyRequest | null,
  type: SecurityEventType,
  opts: SecurityEventOpts = {},
): void {
  const ip = req ? (req.ip ?? null) : null
  const ua = req ? (String(req.headers['user-agent'] ?? '').slice(0, 300) || null) : null
  void db`
    INSERT INTO security_events (event_type, actor_user_id, actor_email, organization_id, ip, user_agent, detail)
    VALUES (${type}, ${opts.actorUserId ?? null}, ${opts.actorEmail ?? null}, ${opts.organizationId ?? null}, ${ip}, ${ua}, ${opts.detail ?? ''})
  `.catch(() => {
    /* security logging must never break the request it describes */
  })
}
