import { useMemo } from 'react'

type PresenceMeta = { userId: string; name: string; at: number }

/**
 * Presence via Socket.io is handled server-side (velo-api/src/services/realtime.ts).
 * This hook is a stub until the Socket.io client is wired up in the frontend.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function usePresence(_channelName: string, _me: { userId: string; name: string } | null) {
  const members: PresenceMeta[] = []
  return useMemo(() => ({ members }), [])
}
