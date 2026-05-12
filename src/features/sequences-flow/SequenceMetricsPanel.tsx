import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from '../../i18n'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { Spinner } from '../../components/ui/Spinner'

type StepEventRow = {
  id: string
  created_at: string
  event_type: string
  node_id: string
  metadata: Record<string, unknown>
}

export function SequenceMetricsPanel({ sequenceId }: { sequenceId: string }) {
  const t = useTranslations()
  const [rows, setRows] = useState<StepEventRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setRows([])
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase client lacks generated types for this table
      const { data, error: qErr } = await (supabase as any)
        .from('sequence_step_events')
        .select('id, created_at, event_type, node_id, metadata')
        .eq('sequence_id', sequenceId)
        .order('created_at', { ascending: false })
        .limit(100)
      if (qErr) throw new Error(qErr.message)
      setRows((data ?? []) as StepEventRow[])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [sequenceId])

  useEffect(() => {
    void load()
  }, [load])

  if (!isSupabaseConfigured) {
    return (
      <div className="rounded-xl border border-fg/8 bg-fg/[0.03] p-6 text-sm text-fg-muted">
        {t.sequences.flow.metricsNeedsSupabase}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-fg/8 bg-fg/[0.03] p-4 space-y-4 max-h-[min(82vh,720px)] flex flex-col min-h-0">
      <div className="flex items-start justify-between gap-3 shrink-0">
        <div>
          <h3 className="text-xs font-semibold text-fg-muted uppercase tracking-wide">{t.sequences.flow.metricsTitle}</h3>
          <p className="text-[10px] text-fg-subtle mt-1 leading-relaxed">{t.sequences.flow.metricsSubtitle}</p>
        </div>
        <button type="button"
          onClick={() => void load()}
          className="text-[10px] font-medium px-2 py-1 rounded-md bg-fg/8 text-fg-muted hover:text-fg hover:bg-fg/12 transition-colors shrink-0"
        >
          {t.common.refresh}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-fg-muted py-8">{t.sequences.flow.metricsEmpty}</p>
      ) : (
        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-fg/8 text-[10px] uppercase tracking-wide text-fg-subtle">
                <th className="py-2 pr-3">{t.sequences.flow.metricsColTime}</th>
                <th className="py-2 pr-3">{t.sequences.flow.metricsColEvent}</th>
                <th className="py-2 pr-3">{t.sequences.flow.metricsColNode}</th>
                <th className="py-2">{t.sequences.flow.metricsColMeta}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-fg/4 hover:bg-fg/[0.02]">
                  <td className="py-2 pr-3 text-fg-muted whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="py-2 pr-3 font-mono text-fg">{r.event_type}</td>
                  <td className="py-2 pr-3 font-mono text-fg-muted">{r.node_id}</td>
                  <td className="py-2 text-fg-subtle max-w-[200px] truncate" title={JSON.stringify(r.metadata ?? {})}>
                    {Object.keys(r.metadata ?? {}).length ? JSON.stringify(r.metadata) : t.common.emptyCell}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
