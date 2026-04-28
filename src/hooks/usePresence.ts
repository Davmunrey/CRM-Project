import { useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

type PresenceMeta = { userId: string; name: string; at: number }

export function usePresence(channelName: string, me: { userId: string; name: string } | null) {
  const [members, setMembers] = useState<PresenceMeta[]>([])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !me) return
    const channel = supabase.channel(`presence:${channelName}`, {
      config: { presence: { key: me.userId } },
    })
    const sync = () => {
      const state = channel.presenceState() as Record<string, Array<{ userId?: string; name?: string; at?: number }>>
      const next = Object.values(state)
        .flatMap((arr) => arr)
        .map((m) => ({ userId: m.userId ?? 'unknown', name: m.name ?? 'Unknown', at: Number(m.at ?? 0) }))
        .sort((a, b) => b.at - a.at)
      setMembers(next)
    }
    channel.on('presence', { event: 'sync' }, sync)
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ userId: me.userId, name: me.name, at: Date.now() })
      }
    })
    return () => {
      void channel.untrack()
      if (supabase) void supabase.removeChannel(channel)
    }
  }, [channelName, me?.name, me?.userId])

  return useMemo(() => ({ members }), [members])
}
