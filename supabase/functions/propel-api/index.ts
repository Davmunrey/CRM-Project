import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { corsHeaders, handleOptions, jsonResponse } from '../_shared/cors.ts'
import { getAuthContext } from '../_shared/auth.ts'
import {
  handleAccount,
  handleAi,
  handleAutomations,
  handleBilling,
  handleEmailTracking,
  handleGmailThreadLinks,
  handleGmailThreadWorkspace,
  handleMembers,
  handlePipelines,
  handleSequences,
  handleWebhooks,
} from '../_shared/handlers.ts'

serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/propel-api/, '') || url.pathname

  const auth = await getAuthContext(req)
  if (auth instanceof Response) {
    auth.headers.set('Access-Control-Allow-Origin', '*')
    return auth
  }

  try {
    if (path.startsWith('/gmail/thread-links')) {
      const res = await handleGmailThreadLinks(req, auth, path)
      Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    const workspaceMatch = path.match(/^\/gmail\/thread-workspace\/([^/]+)$/)
    if (workspaceMatch) {
      const res = await handleGmailThreadWorkspace(req, auth, decodeURIComponent(workspaceMatch[1]))
      Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    if (path.startsWith('/email-tracking')) {
      const res = await handleEmailTracking(req, auth, path)
      Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    if (path.startsWith('/automations/')) {
      const res = await handleAutomations(req, auth, path)
      Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    if (path.startsWith('/pipelines/') && path.includes('/members')) {
      const res = await handlePipelines(req, auth, path)
      Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    if (path.startsWith('/ai/')) {
      const res = await handleAi(req, auth, path)
      Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    if (path.startsWith('/sequences/enrollments')) {
      const res = await handleSequences(req, auth, path)
      Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    if (path.startsWith('/billing')) {
      const res = await handleBilling(req, auth, path)
      Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    if (path.startsWith('/webhook-subscriptions')) {
      const res = await handleWebhooks(req, auth, path)
      Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    if (path.startsWith('/orgs/me/members')) {
      const res = await handleMembers(req, auth, path)
      Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    if (path === '/auth/me' || path === '/auth/password' || path === '/auth/admin/reset-password') {
      const res = await handleAccount(req, auth, path)
      Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    return jsonResponse({ error: `No handler for ${path}` }, 404)
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : 'Internal error' }, 500)
  }
})
