import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  FunnelChart, Funnel, LabelList,
} from 'recharts'
import { api } from '../lib/api'
import { formatCurrency } from '../utils/formatters'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { PermissionGate } from '../components/auth/PermissionGate'
import { Download, BarChart3, CheckCircle2, Layers, Percent } from 'lucide-react'
import { subMonths, parseISO, startOfDay, endOfDay } from 'date-fns'
import { useTranslations } from '../i18n'
import { useChartTheme } from '../lib/chartTheme'
import { PageHeader } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import type { ActivityType } from '../types'

// ─── API response types ───────────────────────────────────────────────────────

interface AnalyticsSummary {
  pipeline: number
  won: number
  lostValue: number
  activeDeals: number
  wonDeals: number
  lostDeals: number
  totalDeals: number
  conversionRate: number
  avgDealSize: number
}

interface DealsByStage {
  stage: string
  count: number
  value: number
  weighted: number
}

interface ActivityByType {
  type: string
  count: number
}

interface ContactBySource {
  source: string
  count: number
}

interface SalesRep {
  userId: string
  name: string
  wonDeals: number
  wonValue: number
  pipelineValue: number
  activeDeals: number
  winRate: number
  activitiesCount: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Reports() {
  const t = useTranslations()
  const chart = useChartTheme()

  const [dateFrom, setDateFrom] = useState(() =>
    subMonths(new Date(), 6).toISOString().split('T')[0],
  )
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [dealsByStage, setDealsByStage] = useState<DealsByStage[]>([])
  const [activitiesByType, setActivitiesByType] = useState<ActivityByType[]>([])
  const [contactsBySource, setContactsBySource] = useState<ContactBySource[]>([])
  const [salesReps, setSalesReps] = useState<SalesRep[]>([])
  const [loading, setLoading] = useState(true)

  const [emailTrackingStats, setEmailTrackingStats] = useState<{
    opens: number
    clicks: number
    loading: boolean
    error: boolean
  }>({ opens: 0, clicks: 0, loading: false, error: false })

  const fetchAnalytics = useCallback(async (from: string, to: string) => {
    setLoading(true)
    const fromIso = from ? startOfDay(parseISO(from)).toISOString() : undefined
    const toIso = to ? endOfDay(parseISO(to)).toISOString() : undefined
    const qs = [fromIso ? `from=${encodeURIComponent(fromIso)}` : '', toIso ? `to=${encodeURIComponent(toIso)}` : ''].filter(Boolean).join('&')
    const q = qs ? `?${qs}` : ''

    try {
      const [sum, stages, acts, sources, reps] = await Promise.all([
        api.get<AnalyticsSummary>(`/analytics/summary${q}`),
        api.get<{ data: DealsByStage[] }>(`/analytics/deals-by-stage${q}`),
        api.get<{ data: ActivityByType[] }>(`/analytics/activities-by-type${q}`),
        api.get<{ data: ContactBySource[] }>('/analytics/contacts-by-source'),
        api.get<{ data: SalesRep[] }>(`/analytics/sales-reps${q}`),
      ])
      setSummary(sum)
      setDealsByStage(stages.data)
      setActivitiesByType(acts.data)
      setContactsBySource(sources.data)
      setSalesReps(reps.data)
    } catch {
      // keep previous data on error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchAnalytics(dateFrom, dateTo)
  }, [fetchAnalytics, dateFrom, dateTo])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setEmailTrackingStats((s) => ({ ...s, loading: true, error: false }))
      try {
        const start = dateFrom
          ? startOfDay(parseISO(dateFrom)).toISOString()
          : startOfDay(subMonths(new Date(), 6)).toISOString()
        const end = dateTo ? endOfDay(parseISO(dateTo)).toISOString() : endOfDay(new Date()).toISOString()
        const data = await api.get<{ opens: number; clicks: number }>(
          `/email-tracking/stats?from=${encodeURIComponent(start)}&to=${encodeURIComponent(end)}`,
        )
        if (cancelled) return
        setEmailTrackingStats({ opens: data?.opens ?? 0, clicks: data?.clicks ?? 0, loading: false, error: false })
      } catch {
        if (!cancelled) setEmailTrackingStats({ opens: 0, clicks: 0, loading: false, error: true })
      }
    }
    void load()
    return () => { cancelled = true }
  }, [dateFrom, dateTo])

  // ── Chart data derived from API results ───────────────────────────────────

  const activeStages = ['lead', 'qualified', 'proposal', 'negotiation']

  const forecastData = useMemo(() =>
    activeStages.map((stage) => {
      const s = dealsByStage.find((d) => d.stage === stage)
      return {
        name: t.deals.stageLabels[stage as keyof typeof t.deals.stageLabels] ?? stage,
        value: s?.value ?? 0,
        weighted: s?.weighted ?? 0,
      }
    }),
    [dealsByStage, t],
  )

  const wonLostData = useMemo(() => {
    const won = dealsByStage.find((d) => d.stage === 'closed_won')
    const lost = dealsByStage.find((d) => d.stage === 'closed_lost')
    return [
      won && won.count > 0 ? { name: t.deals.won, value: won.count, color: chart.success } : null,
      lost && lost.count > 0 ? { name: t.deals.lost, value: lost.count, color: chart.danger } : null,
    ].filter(Boolean) as { name: string; value: number; color: string }[]
  }, [dealsByStage, chart, t])

  const activityTypeData = useMemo(() => {
    const types = Object.keys(t.activities.typeLabels) as ActivityType[]
    const palette = chart.seriesPalette
    return types.map((type, i) => {
      const found = activitiesByType.find((a) => a.type === type)
      return { name: t.activities.typeLabels[type], value: found?.count ?? 0, fill: palette[i % palette.length] }
    }).filter((d) => d.value > 0)
  }, [activitiesByType, chart, t])

  const contactsBySourceChart = useMemo(() => {
    const palette = chart.seriesPalette
    return contactsBySource.map((c, i) => ({ name: c.source, value: c.count, color: palette[i % palette.length] }))
  }, [contactsBySource, chart.seriesPalette])

  const funnelData = useMemo(() => {
    const order = ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won']
    return order.map((stage) => {
      const s = dealsByStage.find((d) => d.stage === stage)
      return { name: t.deals.stageLabels[stage as keyof typeof t.deals.stageLabels] ?? stage, value: s?.count ?? 0, fill: chart.barPrimary }
    }).filter((d) => d.value > 0)
  }, [dealsByStage, chart.barPrimary, t])

  const handleExportCSV = () => {
    const rows = [
      ['Stage', 'Count', 'Value', 'Weighted'],
      ...dealsByStage.map((d) => [
        t.deals.stageLabels[d.stage as keyof typeof t.deals.stageLabels] ?? d.stage,
        String(d.count),
        String(d.value),
        String(Math.round(d.weighted)),
      ]),
    ]
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-deals-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="crm-page space-y-6">
      <PageHeader showTitle={false} title={t.reports.title} subtitle={t.reports.performance} />

      {/* Date filter */}
      <div className="glass p-4 flex items-center gap-4 flex-wrap">
        <p className="text-sm font-medium text-fg-muted">{t.reports.periodLabel}:</p>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        <span className="text-fg-subtle">→</span>
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        {loading && <span className="text-xs text-fg-subtle animate-pulse ml-2">{t.common.loading}…</span>}
        <div className="ml-auto">
          <PermissionGate permission="reports:export">
            <Button variant="secondary" size="sm" leftIcon={<Download size={14} />} onClick={handleExportCSV}>
              {t.common.export} CSV
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title={t.reports.pipeline}
          value={summary ? formatCurrency(summary.pipeline) : '…'}
          icon={<BarChart3 size={18} />}
          accent="info"
        />
        <StatCard
          title={t.deals.stageLabels.closed_won}
          value={summary ? formatCurrency(summary.won) : '…'}
          icon={<CheckCircle2 size={18} />}
          accent="success"
        />
        <StatCard
          title={t.dashboard.activeDealsLabel}
          value={summary ? summary.activeDeals : '…'}
          icon={<Layers size={18} />}
          accent="accent"
        />
        <StatCard
          title={t.reports.conversionRate}
          value={summary ? `${summary.conversionRate}%` : '…'}
          icon={<Percent size={18} />}
          accent="warning"
        />
      </div>

      {/* Server-tracked outbound email */}
      <div className="glass p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-fg-muted">{t.reports.emailTrackingTitle}</h3>
            <p className="text-xs text-fg-subtle mt-1 max-w-3xl">{t.reports.emailTrackingSubtitle}</p>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md shrink-0 border bg-success/10 text-success border-success/20">
            {t.reports.emailTrackingServerBadge}
          </span>
        </div>
        {emailTrackingStats.error ? (
          <p className="text-sm text-danger">{t.reports.emailTrackingLoadError}</p>
        ) : emailTrackingStats.loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1">
            <div><p className="text-xs text-fg-subtle mb-1">{t.reports.emailTrackingOpens}</p><p className="text-2xl font-bold text-success">…</p></div>
            <div><p className="text-xs text-fg-subtle mb-1">{t.reports.emailTrackingClicks}</p><p className="text-2xl font-bold text-info">…</p></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1">
              <div><p className="text-xs text-fg-subtle mb-1">{t.reports.emailTrackingOpens}</p><p className="text-2xl font-bold text-success">{emailTrackingStats.opens}</p></div>
              <div><p className="text-xs text-fg-subtle mb-1">{t.reports.emailTrackingClicks}</p><p className="text-2xl font-bold text-info">{emailTrackingStats.clicks}</p></div>
            </div>
            {emailTrackingStats.opens === 0 && emailTrackingStats.clicks === 0 && (
              <p className="text-sm text-fg-subtle pt-2">{t.reports.emailTrackingEmpty}</p>
            )}
          </>
        )}
        <div className="text-[11px] text-fg-subtle border-t border-fg/6 pt-3 space-y-2">
          <p>{t.reports.emailTrackingPrivacyNote}</p>
          <p className="text-fg-subtle">{t.reports.emailTrackingReliabilityNote}</p>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Revenue forecast by stage */}
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-fg-muted mb-1">{t.reports.salesOverview}</h3>
          <p className="text-xs text-fg-subtle mb-4">{t.forecast.weighted}</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={forecastData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: chart.axisTickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: chart.axisTickFill, fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={chart.tooltipStyle}
                formatter={(v: unknown, name: unknown) => [formatCurrency(Number(v)), name === 'value' ? t.common.total : t.forecast.weighted]} />
              <Bar dataKey="value" fill={chart.barPrimary} radius={[4, 4, 0, 0]} name="value" />
              <Bar dataKey="weighted" fill={chart.barSecondary} radius={[4, 4, 0, 0]} name="weighted" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Won vs Lost donut */}
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-fg-muted mb-1">{t.deals.won} vs {t.deals.lost}</h3>
          <p className="text-xs text-fg-subtle mb-4">{t.reports.pipeline}</p>
          {wonLostData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={wonLostData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label>
                  {wonLostData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chart.tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-60 text-fg-subtle text-sm">{t.common.noResults}</div>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Activities by type */}
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-fg-muted mb-4">{t.reports.activityReport}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={activityTypeData} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" tick={{ fill: chart.axisTickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: chart.axisTickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chart.tooltipStyle} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {activityTypeData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Contacts by source */}
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-fg-muted mb-4">{t.contacts.title} ({t.contacts.source})</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={contactsBySourceChart} cx="50%" cy="50%" outerRadius={75} dataKey="value" label labelLine={false} fontSize={10}>
                {contactsBySourceChart.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={chart.tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline funnel */}
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-fg-muted mb-4">{t.reports.pipeline}</h3>
          {funnelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <FunnelChart>
                <Tooltip contentStyle={chart.tooltipStyle} />
                <Funnel dataKey="value" data={funnelData} isAnimationActive>
                  <LabelList position="right" fill={chart.labelMutedFill} stroke="none" dataKey="name" fontSize={10} />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-52 text-fg-subtle text-sm">{t.common.noResults}</div>
          )}
        </div>
      </div>

      {/* Salesperson breakdown */}
      <div className="glass p-5">
        <h3 className="text-sm font-semibold text-fg-muted mb-4">{t.reports.performance}</h3>
        <div className="overflow-hidden rounded-xl border border-fg/8">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">{t.reports.performance}</caption>
              <thead>
                <tr className="border-b border-fg/8">
                  {[t.common.name, t.leaderboard.dealsWon, t.leaderboard.revenue, t.reports.pipeline, t.dashboard.activeDealsLabel, t.reports.conversionRate, t.activities.title].map((h) => (
                    <th key={h} scope="col" className="text-left text-xs font-semibold text-fg-subtle py-2 pr-4 last:pr-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {salesReps.map((rep, idx) => (
                  <tr key={rep.userId} className="hover:bg-fg/[0.02] transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-fg-subtle w-4">{idx + 1}</span>
                        <Avatar name={rep.name} size="xs" />
                        <span className="text-sm font-medium text-fg">{rep.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4"><span className="text-sm font-semibold text-success">{rep.wonDeals}</span></td>
                    <td className="py-3 pr-4"><span className="text-sm font-semibold text-success">{formatCurrency(rep.wonValue)}</span></td>
                    <td className="py-3 pr-4"><span className="text-sm text-accent-400">{formatCurrency(rep.pipelineValue)}</span></td>
                    <td className="py-3 pr-4"><span className="text-sm text-fg">{rep.activeDeals}</span></td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-fg/8 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-accent-500" style={{ width: `${rep.winRate}%` }} />
                        </div>
                        <span className="text-xs text-fg-muted">{rep.winRate}%</span>
                      </div>
                    </td>
                    <td className="py-3"><span className="text-sm text-warning">{rep.activitiesCount}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
