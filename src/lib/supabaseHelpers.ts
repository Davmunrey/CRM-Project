import { supabase, isSupabaseConfigured } from './supabase'
import { devConsole } from './devConsole'
import { useAuthStore } from '../store/authStore'

/** Get current org ID from authStore -- used for all inserts */
export function getOrgId(): string {
  const orgId = useAuthStore.getState().organizationId
  if (!orgId) throw new Error('[supabaseHelpers] No organizationId in authStore')
  return orgId
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const msg = (error as { message?: unknown }).message
    if (typeof msg === 'string') return msg
  }
  return 'Unknown error'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any

/** Generic delete by id */
export async function sbDelete(table: string, id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured')
  const { error } = await sb().from(table).delete().eq('id', id)
  if (error) throw error
}

/** Generic bulk delete */
export async function sbBulkDelete(table: string, ids: string[]): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured')
  const { error } = await sb().from(table).delete().in('id', ids)
  if (error) throw error
}

export function runSupabaseWrite(
  context: string,
  operation: PromiseLike<{ error: unknown | null }>,
  onError?: (message: string) => void,
): void {
  operation
    .then(({ error }) => {
      if (!error) return
      const message = getErrorMessage(error)
      devConsole.error(`[${context}]`, message)
      onError?.(message)
    }, (error: unknown) => {
      const message = getErrorMessage(error)
      devConsole.error(`[${context}]`, message)
      onError?.(message)
    })
}
