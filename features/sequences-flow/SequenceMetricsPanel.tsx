import { useTranslations } from '../../i18n'

export function SequenceMetricsPanel({ sequenceId: _sequenceId }: { sequenceId: string }) {
  const t = useTranslations()
  return (
    <div className="rounded-xl border border-fg/8 bg-fg/[0.03] p-6 text-sm text-fg-muted">
      {t.sequences.flow.metricsNeedsSupabase}
    </div>
  )
}
