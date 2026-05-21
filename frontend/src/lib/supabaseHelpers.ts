/**
 * Helpers wrapping the n0CRM API client.
 * Kept for backward compat during migration.
 */
import { api } from './api'
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
  await api.delete(`/${table}/${id}`)
}

export async function sbBulkDelete(table: string, ids: string[]): Promise<void> {
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
