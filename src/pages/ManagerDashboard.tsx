import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLeadsStore } from '../store/leadsStore'
import { useDealsStore } from '../store/dealsStore'
import { useActivitiesStore } from '../store/activitiesStore'
import { useSettingsStore } from '../store/settingsStore'
import { useTranslations } from '../i18n'
import {
  computeMqlSqlLeadSnapshot,
  computeDealStageAgingHeatmap,
  computeOwnerFirstTouchHours,
  MANAGER_DASHBOARD_UNASSIGNED_OWNER_KEY,
  type DealAgingBucket,
} from '../utils/managerDashboardMetrics'
import type { PipelineStage } from '../types'
import { Table, TableHead, TableBody, TableRow, TableCell } from '../components/ui/Table'
import { ListRow } from '../components/ui/ListRow'

const HEAT_CLASSES = ['crm-heat-0', 'crm-heat-1', 'crm-heat-2', 'crm-heat-3', 'crm-heat-4'] as const

function buildClosedStageIds(stages: PipelineStage[]): Set<string> {
  const out = new Set<string>()
  for (const p of stages) {
    if (p.id === 'closed_won' || p.id === 'closed_lost') out.add(p.id)
    else if (p.probability >= 100 && /\b(won|ganad|ganado)/i.test(p.name)) out.add(p.id)
    else if (p.probability === 0 && /\b(lost|perdid|perdido)/i.test(p.name)) out.add(p.id)
  }
  if (out.size === 0) {
    out.add('closed_won')
    out.add('closed_lost')
  }
  return out
}

function heatClass(value: number, max: number): string {
  if (max <= 0 || value <= 0) return HEAT_CLASSES[0]
  const ratio = value / max
  const idx = Math.min(HEAT_CLASSES.length - 1, Math.max(1, Math.ceil(ratio * (HEAT_CLASSES.length - 1))))
  return HEAT_CLASSES[idx]
}

const BUCKET_KEYS: DealAgingBucket[] = ['d0_7', 'd8_14', 'd15_30', 'd31p']

export function ManagerDashboard() {
  const t = useTranslations()
  const leads = useLeadsStore((s) => s.leads)
  const fetchLeads = useLeadsStore((s) => s.fetchLeads)
  const deals = useDealsStore((s) => s.deals)
  const activities = useActivitiesStore((s) => s.activities)
  const pipelineStages = useSettingsStore((s) => s.settings.pipelineStages)

  useEffect(() => {
    void fetchLeads()
  }, [fetchLeads])

  const closedIds = useMemo(() => buildClosedStageIds(pipelineStages), [pipelineStages])
  const openStages = useMemo(
    () => pipelineStages.filter((p) => !closedIds.has(p.id)).sort((a, b) => a.order - b.order),
    [pipelineStages, closedIds],
  )

  const mqlSql = useMemo(() => computeMqlSqlLeadSnapshot(leads), [leads])
  const heatmap = useMemo(
    () => computeDealStageAgingHeatmap(deals, openStages, closedIds),
    [deals, openStages, closedIds],
  )
  const heatMax = useMemo(() => {
    let m = 0
    for (const row of heatmap) {
      for (const k of BUCKET_KEYS) m = Math.max(m, row.buckets[k])
    }
    return m
  }, [heatmap])

  const ownerRows = useMemo(() => computeOwnerFirstTouchHours(deals, activities, closedIds), [deals, activities, closedIds])

  const bucketLabel = (k: DealAgingBucket) => {
    switch (k) {
      case 'd0_7':
        return t.managerDashboard.bucket0_7
      case 'd8_14':
        return t.managerDashboard.bucket8_14
      case 'd15_30':
        return t.managerDashboard.bucket15_30
      case 'd31p':
        return t.managerDashboard.bucket31p
      default:
        return k
    }
  }

  return (
    <div className="crm-page space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg tracking-tight">{t.managerDashboard.title}</h1>
        <p className="text-sm text-fg-muted mt-1 max-w-3xl">{t.managerDashboard.subtitle}</p>
        <p className="text-xs text-fg-subtle mt-2 max-w-3xl">{t.managerDashboard.methodologyHint}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass rounded-2xl border border-fg/8 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">{t.managerDashboard.mqlCount}</p>
          <p className="text-3xl font-bold text-fg mt-1">{mqlSql.mqlCount}</p>
        </div>
        <div className="glass rounded-2xl border border-fg/8 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">{t.managerDashboard.sqlCount}</p>
          <p className="text-3xl font-bold text-fg mt-1">{mqlSql.sqlCount}</p>
        </div>
        <div className="glass rounded-2xl border border-fg/8 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">{t.managerDashboard.sqlShare}</p>
          <p className="text-3xl font-bold text-success mt-1">
            {mqlSql.sqlSharePct != null ? `${mqlSql.sqlSharePct}%` : t.common.notAvailable}
          </p>
          <p className="text-[11px] text-fg-subtle mt-2">{t.managerDashboard.sqlShareHint}</p>
        </div>
      </div>

      <section className="glass rounded-2xl border border-fg/8 p-6 overflow-x-auto">
        <h2 className="text-lg font-semibold text-fg mb-1">{t.managerDashboard.heatmapTitle}</h2>
        <p className="text-xs text-fg-subtle mb-4">{t.managerDashboard.heatmapHint}</p>
        <Table className="min-w-[520px] text-left">
          <TableHead>
            <TableRow>
              <TableCell header className="py-2 pr-4">
                {t.managerDashboard.stage}
              </TableCell>
              {BUCKET_KEYS.map((k) => (
                <TableCell key={k} header className="py-2 px-2 text-center">
                  {bucketLabel(k)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {heatmap.map((row) => (
              <TableRow key={row.stageId}>
                <TableCell className="py-2 pr-4 font-medium text-fg">{row.stageName}</TableCell>
                {BUCKET_KEYS.map((k) => (
                  <TableCell key={k} className="py-2 px-2 text-center">
                    <span
                      className={`inline-flex min-w-[2rem] justify-center rounded-lg px-2 py-1 text-xs font-semibold text-fg ${heatClass(row.buckets[k], heatMax)}`}
                    >
                      {row.buckets[k]}
                    </span>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="glass rounded-2xl border border-fg/8 p-6">
        <h2 className="text-lg font-semibold text-fg mb-1">{t.managerDashboard.responseTitle}</h2>
        <p className="text-xs text-fg-subtle mb-4">{t.managerDashboard.responseHint}</p>
        {ownerRows.length === 0 ? (
          <p className="text-sm text-fg-subtle">{t.managerDashboard.responseNoData}</p>
        ) : (
          <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle overflow-hidden">
            {ownerRows.map((r) => (
              <ListRow key={r.ownerKey} bordered={false} clickable={false} className="min-h-0 py-3 justify-between">
                <span className="text-fg font-medium text-sm">
                  {r.ownerKey === MANAGER_DASHBOARD_UNASSIGNED_OWNER_KEY ? t.common.unassigned : r.ownerKey}
                </span>
                <span className="text-fg-muted text-sm">
                  {t.managerDashboard.medianHours}:{' '}
                  <span className="text-accent-400 font-semibold">
                    {r.medianHours}
                    {t.managerDashboard.hoursAbbrev}
                  </span>
                  <span className="text-fg-subtle ml-2">({r.sampleSize})</span>
                </span>
              </ListRow>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs text-fg-subtle">
        <Link className="text-accent-400 hover:underline" to="/reports">
          {t.managerDashboard.linkReports}
        </Link>
      </p>
    </div>
  )
}
