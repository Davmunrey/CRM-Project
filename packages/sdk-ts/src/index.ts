export interface VeloClientOptions {
  baseUrl: string
  apiKey: string
}

export class VeloClient {
  constructor(private readonly opts: VeloClientOptions) {}

  async list(collection: 'contacts' | 'companies' | 'deals' | 'activities', limit = 50) {
    const res = await fetch(`${this.opts.baseUrl}/v1/${collection}?limit=${limit}`, {
      headers: { Authorization: `Bearer ${this.opts.apiKey}` },
    })
    if (!res.ok) throw new Error(`Velo API error: ${res.status}`)
    return res.json()
  }
}
