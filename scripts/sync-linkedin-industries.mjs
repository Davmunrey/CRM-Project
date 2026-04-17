/**
 * Refreshes `src/data/linkedin-industries-v2.json` from the public mirror
 * FernandoKGA/linkedin-industry-codes-v2 (English JSON).
 * Run: node scripts/sync-linkedin-industries.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import https from 'node:https'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'src', 'data', 'linkedin-industries-v2.json')
const URL =
  'https://raw.githubusercontent.com/FernandoKGA/linkedin-industry-codes-v2/main/linkedin_industry_code_v2_all_eng.json'

function download(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}`))
          return
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      })
      .on('error', reject)
  })
}

async function main() {
  const raw = await download(URL)
  JSON.parse(raw) // validate
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, raw, 'utf8')
  console.log(`Wrote ${OUT} (${raw.length} bytes)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
