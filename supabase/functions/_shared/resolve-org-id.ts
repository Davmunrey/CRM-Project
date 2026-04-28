type SupabaseLikeClient = {
  rpc: (fn: string) => Promise<{ data: unknown; error: { message?: string } | null }>
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (column: string, options: { ascending: boolean }) => {
          limit: (count: number) => {
            maybeSingle: () => Promise<{
              data: { organization_id?: string | null } | null
              error: { message?: string } | null
            }>
          }
        }
      }
    }
  }
}

type AuthUser = {
  id: string
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}

function normalizeClaimString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.replace(/^"+|"+$/g, '').trim()
  return normalized || null
}

export async function resolveOrgId(
  callerClient: SupabaseLikeClient,
  adminClient: SupabaseLikeClient,
  user: AuthUser,
): Promise<string | null> {
  const { data: rpcOrgId } = await callerClient.rpc('get_org_id')
  const normalizedRpcOrgId = normalizeClaimString(rpcOrgId)
  if (normalizedRpcOrgId) return normalizedRpcOrgId

  const metadataOrgId =
    normalizeClaimString(user.app_metadata?.organization_id) ??
    normalizeClaimString(user.user_metadata?.org_id) ??
    normalizeClaimString(user.user_metadata?.organization_id)
  if (metadataOrgId) return metadataOrgId

  const { data: membership } = await adminClient
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return normalizeClaimString(membership?.organization_id)
}
