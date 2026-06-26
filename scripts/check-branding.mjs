#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pattern = /\bn0crm\b|\bn0CRM\b|@n0crm\b|\bn0crm-api\b|\bN0CRM\b/i
const skipDirs = new Set([
  'node_modules',
  '.git',
  'frontend',
  'api',
  'infra',
  '.next',
  'dist',
  '.gitea',
])
const skipFiles = new Set([
  'package-lock.json',
  'check-branding.mjs',
  'rename-propel.mjs',
])

const hits = []

function walk(dir) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(name.name)) continue
    const full = path.join(dir, name.name)
    if (name.isDirectory()) {
      walk(full)
    } else if (!skipFiles.has(name.name)) {
      const ext = path.extname(name.name)
      if (
        ![
          '.ts',
          '.tsx',
          '.js',
          '.jsx',
          '.css',
          '.json',
          '.md',
          '.yaml',
          '.yml',
          '.svg',
          '.html',
          '.mjs',
          '.toml',
          '.sh',
          '.webmanifest',
        ].includes(ext)
      ) {
        continue
      }
      const text = fs.readFileSync(full, 'utf8')
      if (pattern.test(text)) {
        hits.push(path.relative(root, full))
      }
    }
  }
}

walk(root)

if (hits.length) {
  console.error('check-branding: FAILED — legacy references in:')
  hits.forEach((h) => console.error('  ' + h))
  process.exit(1)
}

console.log('check-branding: OK')
process.exit(0)
