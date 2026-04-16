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
        <h1 className="text-2xl font-bold text-white tracking-tight">{t.managerDashboard.title}</h1>
        <p className="text-sm text-slate-400 mt-1 max-w-3xl">{t.managerDashboard.subtitle}</p>
        <p className="text-xs text-slate-600 mt-2 max-w-3xl">{t.managerDashboard.methodologyHint}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass rounded-2xl border border-white/8 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{t.managerDashboard.mqlCount}</p>
          <p className="text-3xl font-bold text-white mt-1">{mqlSql.mqlCount}</p>
        </div>
        <div className="glass rounded-2xl border border-white/8 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{t.managerDashboard.sqlCount}</p>
          <p className="text-3xl font-bold text-white mt-1">{mqlSql.sqlCount}</p>
        </div>
        <div className="glass rounded-2xl border border-white/8 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{t.managerDashboard.sqlShare}</p>
          <p className="text-3xl font-bold text-emerald-400 mt-1">
            {mqlSql.sqlSharePct != null ? `${mqlSql.sqlSharePct}%` : t.common.notAvailable}
          </p>
          <p className="text-[11px] text-slate-600 mt-2">{t.managerDashboard.sqlShareHint}</p>
        </div>
      </div>

      <section className="glass rounded-2xl border border-white/8 p-6 overflow-x-auto">
        <h2 className="text-lg font-semibold text-white mb-1">{t.managerDashboard.heatmapTitle}</h2>
        <p className="text-xs text-slate-500 mb-4">{t.managerDashboard.heatmapHint}</p>
        <table className="w-full text-sm text-left min-w-[520px]">
          <thead>
            <tr className="text-slate-500 border-b border-white/8">
              <th className="py-2 pr-4 font-medium">{t.managerDashboard.stage}</th>
              {BUCKET_KEYS.map((k) => (
                <th key={k} className="py-2 px-2 font-medium text-center">
                  {bucketLabel(k)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatmap.map((row) => (
              <tr key={row.stageId} className="border-b border-white/5">
                <td className="py-2 pr-4 text-slate-200 font-medium">{row.stageName}</td>
                {BUCKET_KEYS.map((k) => (
                  <td key={k} className="py-2 px-2 text-center">
                    <span
                      className={`inline-flex min-w-[2rem] justify-center rounded-lg px-2 py-1 text-xs font-semibold text-white ${heatClass(row.buckets[k], heatMax)}`}
                    >
                      {row.buckets[k]}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="glass rounded-2xl border border-white/8 p-6">
        <h2 className="text-lg font-semibold text-white mb-1">{t.managerDashboard.responseTitle}</h2>
        <p className="text-xs text-slate-500 mb-4">{t.managerDashboard.responseHint}</p>
        {ownerRows.length === 0 ? (
          <p className="text-sm text-slate-500">{t.managerDashboard.responseNoData}</p>
        ) : (
          <ul className="divide-y divide-white/6">
            {ownerRows.map((r) => (
              <li key={r.ownerKey} className="flex items-center justify-between py-3 text-sm">
                <span className="text-slate-200 font-medium">
                  {r.ownerKey === MANAGER_DASHBOARD_UNASSIGNED_OWNER_KEY ? t.common.unassigned : r.ownerKey}
                </span>
                <span className="text-slate-400">
                  {t.managerDashboard.medianHours}:{' '}
                  <span className="text-brand-300 font-semibold">
                    {r.medianHours}
                    {t.managerDashboard.hoursAbbrev}
                  </span>
                  <span className="text-slate-600 ml-2">({r.sampleSize})</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-slate-600">
        <Link className="text-brand-400 hover:underline" to="/reports">
          {t.managerDashboard.linkReports}
        </Link>
      </p>
    </div>
  )
}
