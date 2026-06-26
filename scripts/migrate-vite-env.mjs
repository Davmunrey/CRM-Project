#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const skipDirs = new Set(['node_modules', '.git', 'frontend', 'api', 'infra', '.next', 'dist'])

const rules = [
  [/import\.meta\.env\.VITE_API_URL/g, "process.env.NEXT_PUBLIC_API_URL"],
  [/import\.meta\.env\.VITE_GMAIL_REDIRECT_URI/g, "process.env.NEXT_PUBLIC_GMAIL_REDIRECT_URI"],
  [/import\.meta\.env\.VITE_EMAIL_PROVIDER/g, "process.env.NEXT_PUBLIC_EMAIL_PROVIDER"],
  [/import\.meta\.env\.VITE_SENTRY_DSN/g, "process.env.NEXT_PUBLIC_SENTRY_DSN"],
  [/import\.meta\.env\.VITE_APP_CHANNEL/g, "process.env.NEXT_PUBLIC_APP_CHANNEL"],
  [/import\.meta\.env\.VITE_I18N_PSEUDO/g, "process.env.NEXT_PUBLIC_I18N_PSEUDO"],
  [/import\.meta\.env\.PROD/g, "process.env.NODE_ENV === 'production'"],
  [/import\.meta\.env\.DEV/g, "process.env.NODE_ENV !== 'production'"],
  [/import\.meta\.env\.MODE === 'test'/g, "process.env.NODE_ENV === 'test'"],
  [/import\.meta\.env\.MODE === 'staging'/g, "process.env.NEXT_PUBLIC_APP_CHANNEL === 'staging'"],
  [/\(import\.meta\.env\.(\w+) as string \| undefined\)/g, "process.env.$1"],
]

function walk(dir) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(name.name)) continue
    const full = path.join(dir, name.name)
    if (name.isDirectory()) walk(full)
    else if (/\.(tsx?)$/.test(name.name)) {
      let text = fs.readFileSync(full, 'utf8')
      if (!text.includes('import.meta')) continue
      let changed = false
      for (const [re, rep] of rules) {
        if (re.test(text)) {
          text = text.replace(re, rep)
          changed = true
        }
      }
      if (changed) fs.writeFileSync(full, text)
    }
  }
}

walk(root)
console.log('vite-env-migrate: done')
