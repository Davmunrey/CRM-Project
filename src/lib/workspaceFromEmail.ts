/** Workspace / org display label from the email domain (e.g. `user@acme.com` → `acme.com`). */
export function workspaceNameFromEmail(email: string): string {
  const m = email.trim().toLowerCase().match(/^[^@]+@([^@]+)$/)
  return m?.[1] ?? 'Workspace'
}
