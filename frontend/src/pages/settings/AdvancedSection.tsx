import { useState, useEffect } from 'react'
import { Activity, ShieldAlert, RefreshCw, Lock } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Tabs } from '../../components/ui/Tabs'
import { useTranslations } from '../../i18n'

const innerSurface = 'rounded-xl border border-border-subtle bg-surface-1'

interface MaintenanceRun {
  id: string
  status: 'running' | 'success' | 'error'
  mode: 'single_org' | 'all_orgs'
  processed: number
  error_message: string | null
  started_at: string
  finished_at: string | null
}

interface AdvancedSectionProps {
  formatAgo: (iso?: string | null) => string
}

export function AdvancedSection({ formatAgo }: AdvancedSectionProps) {
  const t = useTranslations()
  const [maintenanceRuns] = useState<MaintenanceRun[]>([])
  const [loadingMaintenanceRuns, setLoadingMaintenanceRuns] = useState(false)
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState<'all' | 'success' | 'running' | 'error'>('all')

  const loadMaintenanceRuns = async () => {
    // lead_score_maintenance_runs is not available in velo-api
    setLoadingMaintenanceRuns(false)
  }

  useEffect(() => {
    void loadMaintenanceRuns()
  }, [])

  const lastSuccessRun = maintenanceRuns.find((run) => run.status === 'success')
  const lastSuccessAt = lastSuccessRun?.finished_at ?? lastSuccessRun?.started_at
  const staleSlaHours = 8
  const staleSlaMs = staleSlaHours * 60 * 60 * 1000
  // eslint-disable-next-line react-hooks/purity -- display-only SLA-breach badge; one-render staleness is harmless
  const isSlaBreached = !lastSuccessAt || Date.now() - new Date(lastSuccessAt).getTime() > staleSlaMs
  const recentErrors = maintenanceRuns.filter((run) => run.status === 'error').slice(0, 3)
  const visibleMaintenanceRuns = maintenanceStatusFilter === 'all'
    ? maintenanceRuns
    : maintenanceRuns.filter((run) => run.status === maintenanceStatusFilter)

  return (
    <section className="crm-surface-section p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSlaBreached ? 'bg-warning/20' : 'bg-success/20'}`}>
            {isSlaBreached ? <ShieldAlert size={14} className="text-warning" /> : <Activity size={14} className="text-success" />}
          </div>
          <div>
            <h2 className="text-base font-semibold text-fg">{t.settings.leadOpsTitle}</h2>
            <p className="text-xs text-fg-subtle">{t.settings.leadOpsSubtitle}</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<RefreshCw size={13} />}
          loading={loadingMaintenanceRuns}
          onClick={loadMaintenanceRuns}
        >
          {t.leads.refresh}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className={`${innerSurface} p-3`}>
          <p className="text-xs text-fg-subtle mb-1">{t.settings.leadOpsLastSuccess}</p>
          <p className="text-sm font-medium text-fg">{formatAgo(lastSuccessAt)}</p>
        </div>
        <div className={`${innerSurface} p-3`}>
          <p className="text-xs text-fg-subtle mb-1">{t.settings.leadOpsSlaLabel}</p>
          <p className={`text-sm font-medium ${isSlaBreached ? 'text-warning' : 'text-success'}`}>
            {isSlaBreached ? t.settings.leadOpsBreached : t.settings.leadOpsHealthy}
          </p>
        </div>
        <div className={`${innerSurface} p-3`}>
          <p className="text-xs text-fg-subtle mb-1">{t.settings.leadOpsRecentErrors}</p>
          <p className={`text-sm font-medium ${recentErrors.length > 0 ? 'text-danger' : 'text-fg'}`}>
            {recentErrors.length}
          </p>
        </div>
        <div className={`${innerSurface} border-success/25 bg-success/5 p-3`}>
          <p className="text-xs text-fg-subtle mb-1">{t.settings.leadOpsMailboxScope}</p>
          <p className="text-sm font-medium text-success flex items-center gap-1.5">
            <Lock size={13} />
            {t.settings.leadOpsMailboxPrivate}
          </p>
          <p className="mt-1 text-[11px] text-fg-subtle">{t.settings.leadOpsMailboxPrivateHint}</p>
        </div>
      </div>

      <div className="mb-4 min-w-0">
        <Tabs
          tabs={([
            { value: 'all', label: t.settings.leadOpsFilterAll },
            { value: 'success', label: t.settings.leadOpsFilterSuccess },
            { value: 'running', label: t.settings.leadOpsFilterRunning },
            { value: 'error', label: t.settings.leadOpsFilterError },
          ] as const).map((opt) => ({ id: opt.value, label: opt.label }))}
          activeId={maintenanceStatusFilter}
          onChange={(id) => setMaintenanceStatusFilter(id as 'all' | 'success' | 'running' | 'error')}
          className="w-full min-w-0 [&>div]:w-full [&>div]:flex-wrap"
        />
      </div>

      {visibleMaintenanceRuns.length === 0 ? (
        <p className="text-sm text-fg-subtle">{t.settings.leadOpsNoRuns}</p>
      ) : (
        <div className="space-y-2">
          {visibleMaintenanceRuns.map((run) => {
            const statusLabel = run.status === 'success'
              ? t.settings.leadOpsFilterSuccess
              : run.status === 'running'
                ? t.settings.leadOpsFilterRunning
                : t.settings.leadOpsFilterError
            return (
              <div key={run.id} className={`${innerSurface} p-3`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-fg-muted">
                    {run.mode === 'all_orgs' ? t.settings.leadOpsAllOrgs : t.settings.leadOpsSingleOrg} · {formatAgo(run.started_at)}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    run.status === 'success'
                      ? 'bg-success/15 text-success border-success/30'
                      : run.status === 'running'
                        ? 'bg-accent-500/15 text-accent-300 border-accent-500/30'
                        : 'bg-danger/15 text-danger border-danger/30'
                  }`}>
                    {statusLabel}
                  </span>
                </div>
                <div className="mt-1 text-xs text-fg-subtle">
                  {t.settings.leadOpsProcessed}: <span className="text-fg-muted">{run.processed}</span>
                </div>
                {run.error_message ? (
                  <p className="mt-1 text-xs text-danger">{run.error_message}</p>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
