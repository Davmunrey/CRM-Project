import 'dotenv/config'
import { readdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import { env } from '../dist/config/env.js'

const db = postgres(env.DATABASE_URL)
const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations')

await db`
  CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ DEFAULT NOW()
  )
`

const applied = new Set(
  (await db`SELECT filename FROM _migrations`).map((r) => r.filename as string),
)

const files = (await readdir(MIGRATIONS_DIR))
  .filter((f) => f.endsWith('.sql'))
  .sort()

let count = 0
for (const file of files) {
  if (applied.has(file)) continue
  const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8')
  console.log(`Applying ${file}...`)
  try {
    await db.begin(async (tx) => {
      await tx.unsafe(sql)
      await tx`INSERT INTO _migrations (filename) VALUES (${file})`
    })
  } catch (err) {
    console.error(`[migrate] FAILED on ${file}:`, err)
    await db.end()
    process.exit(1)
  }
  count++
}

console.log(`Done. ${count} migration(s) applied.`)
await db.end()
