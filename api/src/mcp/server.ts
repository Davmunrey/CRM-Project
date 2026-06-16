#!/usr/bin/env node
/**
 * n0CRM MCP server — exposes the CRM to MCP clients (Claude Desktop, Cursor,
 * ChatGPT, etc.) over stdio.
 *
 * It reuses the agent's org-scoped, write-gated tool registry (CRM_TOOLS) so an
 * MCP client gets exactly the same safe surface the in-app AI assistant has:
 * every read filters on organization_id and every write verifies FK ownership
 * before mutating. Auth is a n0CRM API key (env N0CRM_API_KEY) resolved to an
 * org + scopes via the same sha256 lookup the public REST API uses.
 *
 * Writes are enabled only when the key grants the `crm:write` scope (a full,
 * unscoped key counts as full access — same semantics as the REST API).
 *
 * This is a server-side MCP: it shares the API's environment/DB connection, so
 * run it co-located with the API (same env). All diagnostics go to STDERR —
 * STDOUT is reserved for the MCP protocol stream.
 *
 * Run:  N0CRM_API_KEY=<key> node dist/mcp/server.js   (or: npm run mcp)
 */

import { createHash } from 'node:crypto'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { db } from '../db/client.js'
import { CRM_TOOLS, getTool, type ToolContext } from '../services/ai/tools.js'

/** Scope check mirroring publicApi.hasScope: an unscoped key = full access. */
function hasScope(keyScopes: string[], required: string): boolean {
  if (keyScopes.length === 0) return true
  return keyScopes.includes('*') || keyScopes.includes('all') || keyScopes.includes(required)
}

async function resolveApiKey(apiKey: string): Promise<{ orgId: string; scopes: string[] } | null> {
  const keyHash = createHash('sha256').update(apiKey).digest('hex')
  const rows = await db<Array<{ organizationId: string; scopes: unknown }>>`
    SELECT organization_id, scopes
    FROM api_keys
    WHERE key_hash = ${keyHash}
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1
  `
  if (rows.length === 0) return null
  const scopes = Array.isArray(rows[0]!.scopes) ? (rows[0]!.scopes as string[]) : []
  return { orgId: rows[0]!.organizationId, scopes }
}

async function main(): Promise<void> {
  const apiKey = process.env['N0CRM_API_KEY']
  if (!apiKey) {
    console.error('[n0crm-mcp] N0CRM_API_KEY is required (a n0CRM API key).')
    process.exit(1)
  }

  const auth = await resolveApiKey(apiKey)
  if (!auth) {
    console.error('[n0crm-mcp] Invalid, revoked, or expired N0CRM_API_KEY.')
    process.exit(1)
  }

  const allowWrites = hasScope(auth.scopes, 'crm:write')
  const ctx: ToolContext = { orgId: auth.orgId, userId: 'mcp', allowWrites }

  const server = new Server(
    { name: 'n0crm', version: '1.0.0' },
    { capabilities: { tools: {} } },
  )

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: CRM_TOOLS.map((t) => ({
      name: t.def.name,
      description: t.def.description,
      inputSchema: { ...t.def.parameters, type: 'object' as const },
    })),
  }))

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = getTool(req.params.name)
    if (!tool) {
      return { isError: true, content: [{ type: 'text' as const, text: `Unknown tool: ${req.params.name}` }] }
    }
    try {
      const result = await tool.execute(ctx, (req.params.arguments ?? {}) as Record<string, unknown>)
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text' as const, text: err instanceof Error ? err.message : String(err) }],
      }
    }
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error(
    `[n0crm-mcp] ready — org ${auth.orgId}, writes ${allowWrites ? 'enabled' : 'disabled'}, ${CRM_TOOLS.length} tools`,
  )
}

main().catch((err: unknown) => {
  console.error('[n0crm-mcp] fatal:', err)
  process.exit(1)
})
