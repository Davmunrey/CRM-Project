/**
 * Sets WEBHOOK_WORKER_SECRET on the linked Supabase project (Edge Functions secrets).
 * Run from repo root after `npm run supabase:login` and `npm run supabase:link -- --project-ref <id>`.
 *
 * Uses env WEBHOOK_WORKER_SECRET if set; otherwise generates a random 64-char hex string.
 */
import { execSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'

const secret = process.env.WEBHOOK_WORKER_SECRET ?? randomBytes(32).toString('hex')
// Windows: must use a shell to run `supabase.cmd` from node_modules/.bin reliably.
const cmd = `npx supabase secrets set WEBHOOK_WORKER_SECRET=${secret}`

console.log('Setting Edge secret WEBHOOK_WORKER_SECRET on the linked project…')
execSync(cmd, { stdio: 'inherit', shell: true })
console.log('Done. Store the same value for GitHub Actions / cron (see supabase/README.md).')
if (!process.env.WEBHOOK_WORKER_SECRET) {
  console.log('')
  console.log('Generated secret (save it now):')
  console.log(secret)
}
