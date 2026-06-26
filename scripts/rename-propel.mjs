#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const skipDirs = new Set(['node_modules', '.git', 'frontend', 'api', 'infra', '.next', 'dist'])
const replacements = [
  ['Propel', 'Propel'],
  ['propel', 'propel'],
  ['Propel', 'Propel'],
  ['@propel', '@propel'],
  ['propel-api', 'propel-api'],
  ['noreply@propel.com', 'noreply@propel.com'],
  ['PROPEL_API_URL', 'PROPEL_API_URL'],
  ['propel_', 'propel_'],
]

function walk(dir) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(name.name)) continue
    const full = path.join(dir, name.name)
    if (name.isDirectory()) walk(full)
    else {
      const ext = path.extname(name.name)
      if (!['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.md', '.yaml', '.yml', '.svg', '.html', '.mjs', '.toml', '.sh', '.webmanifest'].includes(ext)) continue
      let text = fs.readFileSync(full, 'utf8')
      let changed = false
      for (const [from, to] of replacements) {
        if (text.includes(from)) {
          text = text.split(from).join(to)
          changed = true
        }
      }
      if (changed) fs.writeFileSync(full, text)
    }
  }
}

walk(root)
console.log('rename-propel: done')
