export interface N0CrmClientOptions {
  baseUrl: string
  apiKey: string
}

export class N0CrmClient {
  constructor(private readonly opts: N0CrmClientOptions) {}

  async list(collection: 'contacts' | 'companies' | 'deals' | 'activities', limit = 50) {
    const res = await fetch(`${this.opts.baseUrl}/v1/${collection}?limit=${limit}`, {
      headers: { Authorization: `Bearer ${this.opts.apiKey}` },
    })
    if (!res.ok) throw new Error(`n0CRM API error: ${res.status}`)
    return res.json()
  }
}
