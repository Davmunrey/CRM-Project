import 'dotenv/config'
import { execSync } from 'node:child_process'
import postgres from 'postgres'

/**
 * Boot script: validates that DATABASE_URL is reachable.
 * Shows a clear error message if the connection fails,
 * explaining how to fix it.
 */

function passwordFromUrl(url: string): string | null {
  try {
    const u = new URL(url)
    return u.password || null
  } catch {
    return null
  }
}

function hostFromUrl(url: string): string | null {
  try {
    const u = new URL(url)
    return u.hostname
  } catch {
    return null
  }
}

async function testConnection(url: string): Promise<boolean> {
  const db = postgres(url, { connect_timeout: 3 })
  try {
    await db`SELECT 1`
    await db.end()
    return true
  } catch {
    return false
  }
}

async function main() {
  const url = process.env.DATABASE_URL || ''

  if (!url || url === 'postgres://n0crm:@postgres:5432/n0crm') {
    console.error('[n0crm-api] ERROR: DATABASE_URL is empty or invalid.')
    console.error('  Set DATABASE_URL manually, e.g.:')
    console.error('    postgres://n0crm:<password>@postgres:5432/n0crm')
    console.error('  Or set POSTGRES_PASSWORD so the entrypoint builds it automatically.')
    process.exit(1)
  }

  const host = hostFromUrl(url)
  const pass = passwordFromUrl(url)
  console.log(`[n0crm-api] Checking database connection to ${host}...`)

  // Wait up to 60s for postgres to become available
  let attempts = 0
  const maxAttempts = 30
  while (attempts < maxAttempts) {
    attempts++
    const ok = await testConnection(url)
    if (ok) {
      console.log(`[n0crm-api] Database connected successfully.`)
      return
    }
    console.log(`[n0crm-api] Attempt ${attempts}/${maxAttempts} — postgres not ready, retrying in 2s...`)
    await new Promise((r) => setTimeout(r, 2000))
  }

  console.error(`[n0crm-api] ERROR: Could not connect to database after ${maxAttempts} attempts.`)
  console.error(`  DATABASE_URL: ${url.replace(pass || '', '***')}`)
  console.error(`  Host: ${host}`)
  console.error(`  Possible causes:`)
  console.error(`    - POSTGRES_PASSWORD is incorrect (must match the postgres service password)`)
  console.error(`    - postgres container is not running`)
  console.error(`    - DATABASE_URL format is wrong`)
  process.exit(1)
}

main()
