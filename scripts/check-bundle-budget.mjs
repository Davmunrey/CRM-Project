/**
 * After `npm run build`, checks gzip size of the largest JS asset in dist/assets.
 * Override cap with BUNDLE_MAX_GZIP_KB (default 250).
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const assets = path.join(root, 'dist', 'assets')

const maxKb = Math.max(50, Number(process.env.BUNDLE_MAX_GZIP_KB || '250') || 250)
const maxBytes = maxKb * 1024

if (!fs.existsSync(assets)) {
  console.error('check-bundle-budget: dist/assets not found. Run npm run build first.')
  process.exit(1)
}

let worst = { file: '', gzip: 0 }
for (const name of fs.readdirSync(assets)) {
  if (!name.endsWith('.js')) continue
  const buf = fs.readFileSync(path.join(assets, name))
  const gzip = zlib.gzipSync(buf, { level: 9 }).length
  if (gzip > worst.gzip) {
    worst = { file: name, gzip }
  }
}

console.log(
  `check-bundle-budget: largest JS gzip = ${worst.gzip} bytes (${(worst.gzip / 1024).toFixed(1)} KB) [${worst.file}] cap=${maxKb}KB`,
)

if (worst.gzip > maxBytes) {
  console.error(`check-bundle-budget: exceeds cap. Set BUNDLE_MAX_GZIP_KB or reduce bundle size.`)
  process.exit(1)
}
