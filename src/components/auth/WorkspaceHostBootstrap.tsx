import { useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { devConsole } from '../../lib/devConsole'
import { resolveWorkspaceSlugFromWindowHostname } from '../../lib/workspaceSlug'

/**
 * Resolves workspace context from the current hostname: optional `VITE_WORKSPACE_ROOT_DOMAIN`
 * for strict multi-tenant roots; otherwise infers `{slug}.rest.of.host` like Pipedrive company URLs.
 */
export function WorkspaceHostBootstrap() {
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      useAuthStore.getState().setWorkspaceHostContext(null)
      return
    }

    const rootRaw = import.meta.env.VITE_WORKSPACE_ROOT_DOMAIN as string | undefined
    const slug = resolveWorkspaceSlugFromWindowHostname(window.location.hostname, rootRaw)
    if (!slug) {
      useAuthStore.getState().setWorkspaceHostContext({
        slug: null,
        pending: false,
        resolved: null,
        slugNotFound: false,
      })
      return
    }

    useAuthStore.getState().setWorkspaceHostContext({
      slug,
      pending: true,
      resolved: null,
      slugNotFound: false,
    })

    void (async () => {
      const { data, error } = await supabase.rpc('resolve_workspace_slug', { p_slug: slug })
      if (error) {
        devConsole.warn('[workspaceHost] resolve_workspace_slug', error.message)
        useAuthStore.getState().setWorkspaceHostContext({
          slug,
          pending: false,
          resolved: null,
          slugNotFound: true,
        })
        return
      }
      const row = Array.isArray(data) && data[0]
        ? (data[0] as { id: string; name: string })
        : null
      useAuthStore.getState().setWorkspaceHostContext({
        slug,
        pending: false,
        resolved: row,
        slugNotFound: !row,
      })
    })()
  }, [])

  const workspaceHostResolutionPending = useAuthStore((s) => s.workspaceHostResolutionPending)
  /** Primitive deps only — `workspaceFromHost` object identity can change across unrelated store updates. */
  const workspaceFromHostId = useAuthStore((s) => s.workspaceFromHost?.id ?? null)
  const organizationId = useAuthStore((s) => s.organizationId)

  useEffect(() => {
    let nextMismatch: boolean
    if (workspaceHostResolutionPending) {
      nextMismatch = false
    } else if (!organizationId || !workspaceFromHostId) {
      nextMismatch = false
    } else {
      nextMismatch = workspaceFromHostId !== organizationId
    }
    if (useAuthStore.getState().workspaceHostMismatch === nextMismatch) return
    useAuthStore.setState({ workspaceHostMismatch: nextMismatch })
  }, [workspaceHostResolutionPending, workspaceFromHostId, organizationId])

  return null
}
