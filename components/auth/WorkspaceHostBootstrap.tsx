import { useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../lib/api'
import { devConsole } from '../../lib/devConsole'
import { resolveWorkspaceSlugFromWindowHostname } from '../../lib/workspaceSlug'

export function WorkspaceHostBootstrap() {
  useEffect(() => {
    const rootRaw = process.env.NEXT_PUBLIC_WORKSPACE_ROOT_DOMAIN as string | undefined
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
      try {
        const data = await api.get<{ organization?: { id: string; name: string } | null }>(`/auth/resolve-org/${encodeURIComponent(slug)}`)
        const row = data?.organization ?? null
        useAuthStore.getState().setWorkspaceHostContext({
          slug,
          pending: false,
          resolved: row,
          slugNotFound: !row,
        })
      } catch (err) {
        devConsole.warn('[workspaceHost] resolve slug failed', err instanceof Error ? err.message : err)
        useAuthStore.getState().setWorkspaceHostContext({
          slug,
          pending: false,
          resolved: null,
          slugNotFound: true,
        })
      }
    })()
  }, [])

  const workspaceHostResolutionPending = useAuthStore((s) => s.workspaceHostResolutionPending)
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
