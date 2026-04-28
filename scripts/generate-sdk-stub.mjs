import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const outDir = join(process.cwd(), 'packages', 'sdk-ts', 'src')
mkdirSync(outDir, { recursive: true })

const source = `export interface VeloClientOptions {
  baseUrl: string
  apiKey: string
}

export class VeloClient {
  constructor(private readonly opts: VeloClientOptions) {}

  async list(collection: 'contacts' | 'companies' | 'deals' | 'activities', limit = 50) {
    const res = await fetch(\`\${this.opts.baseUrl}/v1/\${collection}?limit=\${limit}\`, {
      headers: { Authorization: \`Bearer \${this.opts.apiKey}\` },
    })
    if (!res.ok) throw new Error(\`Velo API error: \${res.status}\`)
    return res.json()
  }
}
`

writeFileSync(join(outDir, 'index.ts'), source, 'utf8')
console.log('Generated SDK stub at packages/sdk-ts/src/index.ts')
