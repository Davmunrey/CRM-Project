// Debug / diagnostics + backup/restore endpoints.
//
// All routes are gated by the X-Debug-Token header matching env.DEBUG_TOKEN.
// If DEBUG_TOKEN is empty or shorter than 16 chars, the entire prefix returns
// 404 so no information is leaked.
//
// Inspection:
//   GET  /_debug/health        — counts snapshot
//   GET  /_debug/users         — list users
//   GET  /_debug/migrations    — applied migrations
//   POST /_debug/sql           — ad-hoc SQL (read-only unless allow_writes:true)
//
// Backup & restore:
//   GET  /_debug/backup        — streams pg_dump | gzip as attachment.
//                                Curl: curl -OJ -H "X-Debug-Token: $T" /_debug/backup
//   POST /_debug/restore       — pipes request body into psql.
//                                Body: raw SQL OR .sql.gz (auto-detected by magic bytes).
//                                Curl: curl -H "X-Debug-Token: $T" \
//                                        -H "Content-Type: application/gzip" \
//                                        --data-binary @dump.sql.gz \
//                                        /_debug/restore
//   GET  /_debug/backups       — list rotation files currently on disk in /backups

import type { FastifyInstance } from 'fastify'
import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { mkdir, readdir, stat, unlink } from 'node:fs/promises'
import { db } from '../db/client.js'

const DEBUG_TOKEN = process.env['DEBUG_TOKEN'] ?? ''

// Parse postgres connection string into discrete pg_dump / psql flags.
function pgEnvFromUrl(url: string): { args: string[]; env: NodeJS.ProcessEnv } {
  const u = new URL(url)
  const args = [
    '--host', u.hostname,
    '--port', u.port || '5432',
    '--username', decodeURIComponent(u.username),
    '--dbname', u.pathname.replace(/^\//, '') || 'postgres',
  ]
  const env: NodeJS.ProcessEnv = { ...process.env, PGPASSWORD: decodeURIComponent(u.password) }
  return { args, env }
}

export async function debugRoutes(app: FastifyInstance): Promise<void> {
  if (!DEBUG_TOKEN || DEBUG_TOKEN.length < 16) {
    app.log.info('[debug] DEBUG_TOKEN unset or too short — debug routes disabled')
    return
  }
  app.log.warn('[debug] DEBUG_TOKEN is set — diagnostic + backup routes enabled at /_debug/*')

  app.addHook('onRequest', async (req, reply) => {
    const token = req.headers['x-debug-token']
    if (typeof token !== 'string' || token !== DEBUG_TOKEN) {
      return reply.code(404).send({ error: 'Not Found' })
    }
  })

  // ─── Inspection ─────────────────────────────────────────────────────────

  app.get('/health', async () => {
    const [users] = await db`SELECT count(*)::int AS n FROM users`
    const [supers] = await db`SELECT count(*)::int AS n FROM users WHERE is_super_admin = true`
    const [orgs] = await db`SELECT count(*)::int AS n FROM organizations`
    const [contacts] = await db`SELECT count(*)::int AS n FROM contacts`
    const [deals] = await db`SELECT count(*)::int AS n FROM deals`
    const [migrations] = await db`SELECT count(*)::int AS n FROM _migrations`
    return {
      api: { node: process.version, uptime_s: Math.floor(process.uptime()) },
      counts: {
        users: users?.['n'] ?? 0,
        super_admins: supers?.['n'] ?? 0,
        organizations: orgs?.['n'] ?? 0,
        contacts: contacts?.['n'] ?? 0,
        deals: deals?.['n'] ?? 0,
        migrations_applied: migrations?.['n'] ?? 0,
      },
    }
  })

  app.get('/users', async () => {
    const rows = await db`
      SELECT id, email, name, role, is_active, is_super_admin, organization_id, created_at
      FROM users ORDER BY created_at DESC LIMIT 200
    `
    return { count: rows.length, users: rows }
  })

  app.get('/migrations', async () => {
    const rows = await db`SELECT id, filename, applied_at FROM _migrations ORDER BY id`
    return { count: rows.length, migrations: rows }
  })

  app.post<{ Body: { sql?: unknown; allow_writes?: unknown } }>('/sql', async (req, reply) => {
    const sql = typeof req.body?.sql === 'string' ? req.body.sql.trim() : ''
    const allowWrites = req.body?.allow_writes === true
    if (!sql) return reply.code(400).send({ error: 'sql (string) is required in body' })
    if (!allowWrites) {
      const upper = sql.toUpperCase()
      const blocked = ['INSERT ', 'UPDATE ', 'DELETE ', 'DROP ', 'TRUNCATE ', 'ALTER ', 'CREATE ', 'GRANT ', 'REVOKE ']
      if (blocked.some((kw) => upper.includes(kw))) {
        return reply.code(400).send({
          error: 'Write statement detected. Re-send with "allow_writes": true to confirm.',
          detected_keywords: blocked.filter((kw) => upper.includes(kw)),
        })
      }
    }
    req.log.warn({ sql: sql.slice(0, 200), allowWrites }, '[debug] /_debug/sql executing')
    try {
      const rows = await db.unsafe(sql)
      return { rowCount: Array.isArray(rows) ? rows.length : 0, rows }
    } catch (err) {
      return reply.code(400).send({ error: 'Query failed', detail: String(err) })
    }
  })

  // ─── Backup ─────────────────────────────────────────────────────────────

  app.get('/backup', async (req, reply) => {
    const dbUrl = process.env['DATABASE_URL']
    if (!dbUrl) return reply.code(500).send({ error: 'DATABASE_URL not set' })
    const { args, env } = pgEnvFromUrl(dbUrl)

    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    reply
      .header('Content-Type', 'application/gzip')
      .header('Content-Disposition', `attachment; filename="n0crm-backup-${ts}.sql.gz"`)

    req.log.info('[debug] /backup starting pg_dump')
    const dump = spawn('pg_dump', [...args, '--no-owner', '--no-privileges', '--clean', '--if-exists'], { env })
    const gz = spawn('gzip', ['-c'])

    dump.stdout.pipe(gz.stdin)
    dump.stderr.on('data', (b) => req.log.warn({ pg_dump: b.toString().trim() }))
    gz.stderr.on('data', (b) => req.log.warn({ gzip: b.toString().trim() }))
    dump.on('error', (e) => req.log.error({ err: String(e) }, '[debug] pg_dump spawn error'))
    gz.on('error', (e) => req.log.error({ err: String(e) }, '[debug] gzip spawn error'))
    dump.on('exit', (code) => { if (code !== 0) req.log.error({ code }, '[debug] pg_dump exited non-zero') })

    return reply.send(gz.stdout)
  })

  // ─── Restore ────────────────────────────────────────────────────────────

  app.addContentTypeParser('application/sql', { parseAs: 'buffer' }, (_req, body, done) => done(null, body))
  app.addContentTypeParser('application/octet-stream', { parseAs: 'buffer' }, (_req, body, done) => done(null, body))
  app.addContentTypeParser('application/gzip', { parseAs: 'buffer' }, (_req, body, done) => done(null, body))

  app.post('/restore', async (req, reply) => {
    const dbUrl = process.env['DATABASE_URL']
    if (!dbUrl) return reply.code(500).send({ error: 'DATABASE_URL not set' })
    if (!Buffer.isBuffer(req.body)) return reply.code(400).send({ error: 'body must be raw SQL or .sql.gz' })

    const isGzip = req.headers['content-encoding'] === 'gzip' ||
                   req.headers['content-type'] === 'application/gzip' ||
                   (req.body.length > 2 && req.body[0] === 0x1f && req.body[1] === 0x8b)

    const { args, env } = pgEnvFromUrl(dbUrl)
    req.log.warn({ bytes: req.body.length, isGzip }, '[debug] /restore starting psql')

    const psql = spawn('psql', [...args, '--single-transaction', '--set=ON_ERROR_STOP=on'], { env })
    let stderrBuf = ''
    psql.stderr.on('data', (b) => { stderrBuf += b.toString() })

    if (isGzip) {
      const gunzip = spawn('gzip', ['-cd'])
      gunzip.stdout.pipe(psql.stdin)
      gunzip.stdin.end(req.body)
    } else {
      psql.stdin.end(req.body)
    }

    const exitCode = await new Promise<number>((resolve) => psql.on('exit', (c) => resolve(c ?? 1)))
    if (exitCode !== 0) {
      return reply.code(500).send({ error: 'psql failed', exitCode, stderr_tail: stderrBuf.slice(-2000) })
    }
    return { ok: true, exitCode, stderr_tail: stderrBuf.slice(-500) }
  })

  // ─── Scheduled internal backups ─────────────────────────────────────────
  //
  // Every BACKUP_INTERVAL_HOURS (default 6) we run pg_dump | gzip to
  // /backups/n0crm-<ISO>.sql.gz and keep the last BACKUP_KEEP (default 10).
  // Lives inside the API process — survives Redeploy but NOT Uninstall.
  // To preserve across Uninstall, download via GET /_debug/backup first.

  const intervalHours = Number(process.env['BACKUP_INTERVAL_HOURS'] ?? 6)
  const keep = Number(process.env['BACKUP_KEEP'] ?? 10)
  if (intervalHours > 0) {
    const tick = async (): Promise<void> => {
      try {
        await mkdir('/backups', { recursive: true })
        const dbUrl = process.env['DATABASE_URL']
        if (!dbUrl) return
        const { args, env } = pgEnvFromUrl(dbUrl)
        const ts = new Date().toISOString().replace(/[:.]/g, '-')
        const filepath = `/backups/n0crm-${ts}.sql.gz`
        await new Promise<void>((resolve, reject) => {
          const dump = spawn('pg_dump', [...args, '--no-owner', '--no-privileges', '--clean', '--if-exists'], { env })
          const gz = spawn('gzip', ['-c'])
          const out = createWriteStream(filepath)
          dump.stdout.pipe(gz.stdin)
          gz.stdout.pipe(out)
          dump.on('error', reject)
          out.on('error', reject)
          out.on('finish', () => resolve())
        })
        const all = (await readdir('/backups'))
          .filter((f) => f.startsWith('n0crm-') && f.endsWith('.sql.gz'))
          .sort()
        const toDelete = all.slice(0, Math.max(0, all.length - keep))
        for (const f of toDelete) await unlink(`/backups/${f}`)
        app.log.info({ file: filepath, total: all.length, deleted: toDelete.length }, '[debug] scheduled backup ok')
      } catch (err) {
        app.log.error({ err: String(err) }, '[debug] scheduled backup failed')
      }
    }
    setTimeout(() => { void tick() }, 5 * 60_000)
    setInterval(() => { void tick() }, intervalHours * 60 * 60_000)
    app.log.info({ intervalHours, keep }, '[debug] scheduled backups armed')
  }

  app.get('/backups', async () => {
    try {
      const files = await readdir('/backups')
      const out: Array<{ name: string; size: number; mtime: string }> = []
      for (const f of files.sort().reverse()) {
        const st = await stat(`/backups/${f}`)
        out.push({ name: f, size: st.size, mtime: st.mtime.toISOString() })
      }
      return { dir: '/backups', count: out.length, files: out }
    } catch (err) {
      return { dir: '/backups', error: String(err) }
    }
  })
}
