'use client'

import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { useAuthStore } from '../store/authStore'
import { devConsole } from './devConsole'

export function getOrgId(): string {
  const orgId = useAuthStore.getState().organizationId
  if (!orgId) throw new Error('[apiHelpers] No organizationId in authStore')
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

export async function sbDelete(table: string, id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = createClient()
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
    return
  }
  const { api } = await import('./api')
  await api.delete(`/${table}/${id}`)
}

export async function sbBulkDelete(table: string, ids: string[]): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = createClient()
    const { error } = await supabase.from(table).delete().in('id', ids)
    if (error) throw error
    return
  }
  const { api } = await import('./api')
  await Promise.all(ids.map((id) => api.delete(`/${table}/${id}`)))
}

export function runApiWrite(
  context: string,
  operation: PromiseLike<unknown>,
  onError?: (message: string) => void,
): void {
  Promise.resolve(operation).catch((error: unknown) => {
    const message = getErrorMessage(error)
    devConsole.error(`[${context}]`, message)
    onError?.(message)
  })
}
