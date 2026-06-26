type PresenceMeta = { userId: string; name: string; at: number }

const EMPTY_PRESENCE = { members: [] as PresenceMeta[] }

// Stub until Socket.io client is wired up in the frontend.
export function usePresence(_channelName: string, _me: { userId: string; name: string } | null) {
  return EMPTY_PRESENCE
}
