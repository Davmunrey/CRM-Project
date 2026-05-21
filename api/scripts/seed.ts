import 'dotenv/config'
import postgres from 'postgres'
import bcrypt from 'bcryptjs'

const db = postgres(process.env['DATABASE_URL']!)

const ADMIN_EMAIL = process.env['SEED_ADMIN_EMAIL'] ?? 'admin@velo.local'
const ADMIN_PASSWORD = process.env['SEED_ADMIN_PASSWORD'] ?? 'Admin1234!'
const ADMIN_NAME = process.env['SEED_ADMIN_NAME'] ?? 'Admin'
const ORG_NAME = process.env['SEED_ORG_NAME'] ?? 'Velo Demo'
const ORG_SLUG = process.env['SEED_ORG_SLUG'] ?? 'velo-demo'

// ── Organization ──────────────────────────────────────────────────────────────
const existingOrg = await db`SELECT id FROM organizations WHERE slug = ${ORG_SLUG} LIMIT 1`
let orgId: string

if (existingOrg.length > 0) {
  orgId = existingOrg[0]!.id as string
  console.log(`Org already exists: ${ORG_SLUG} (${orgId})`)
} else {
  const [org] = await db`
    INSERT INTO organizations (name, slug) VALUES (${ORG_NAME}, ${ORG_SLUG}) RETURNING id
  `
  orgId = org!.id as string
  console.log(`Created org: ${ORG_SLUG} (${orgId})`)
}

// ── Admin user ────────────────────────────────────────────────────────────────
const existingUser = await db`SELECT id FROM users WHERE email = ${ADMIN_EMAIL} LIMIT 1`

if (existingUser.length > 0) {
  console.log(`User already exists: ${ADMIN_EMAIL}`)
} else {
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12)
  await db`
    INSERT INTO users (email, password_hash, name, role, is_active, organization_id)
    VALUES (${ADMIN_EMAIL}, ${hash}, ${ADMIN_NAME}, 'admin', true, ${orgId})
  `
  console.log(`Created user: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)
}

// ── Default lead scoring rules ────────────────────────────────────────────────
const defaultRules = [
  { key: 'email_open', points: 8 },
  { key: 'email_click', points: 12 },
  { key: 'email_reply', points: 20 },
  { key: 'email_sent', points: 4 },
  { key: 'call_completed', points: 15 },
  { key: 'meeting_booked', points: 18 },
  { key: 'meeting_completed', points: 18 },
  { key: 'note_added', points: 5 },
  { key: 'form_submitted', points: 10 },
  { key: 'deal_created', points: 14 },
]

for (const rule of defaultRules) {
  await db`
    INSERT INTO lead_scoring_rules (organization_id, key, points, is_enabled)
    VALUES (${orgId}, ${rule.key}, ${rule.points}, true)
    ON CONFLICT (organization_id, key) DO NOTHING
  `
}
console.log(`Seeded ${defaultRules.length} lead scoring rules`)

console.log('\nSeed complete.')
console.log(`  Org:   ${ORG_NAME} (slug: ${ORG_SLUG})`)
console.log(`  Login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)
await db.end()
