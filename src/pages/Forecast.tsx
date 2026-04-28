import { useMemo, useState, useEffect } from 'react'
import { useTranslations } from '../i18n'
import { useDateLocale } from '../hooks/useDateLocale'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Line, ComposedChart, Area,
} from 'recharts'
import { useDealsStore } from '../store/dealsStore'
import { useActivitiesStore } from '../store/activitiesStore'
import { formatCurrency, formatDate } from '../utils/formatters'
import {
  subMonths, format, startOfMonth, endOfMonth, parseISO,
  isWithinInterval, addMonths,
} from 'date-fns'
import type { Locale } from 'date-fns'
import { TrendingUp, TrendingDown, DollarSign, Target, Zap, Star } from 'lucide-react'
import type { Deal } from '../types'
import { useChartTheme } from '../lib/chartTheme'
import { PageHeader } from '../components/ui/PageHeader'

// ─── Types ───────────────────────────────────────────────────────────────────

interface MonthlyRevenue {
  month: string        // display label "Mar 25"
  isoMonth: string     // "2025-03"
  revenue: number
  dealCount: number
}

interface ForecastMonth {
  month: string
  isoMonth: string
  weighted: number
  dealCount: number
  isProjection: true
}

interface KPIData {
  totalWonYTD: number
  avgDealSize: number
  projectedNextQ: number
  growthRateMoM: number        // percentage, can be negative
  hasGrowthData: boolean
}

type HealthTier = 'excellent' | 'good' | 'fair' | 'low'

interface HealthScore {
  score: number                // 0-100
  activeDeals: number
  stageScore: number           // 0-25
  activityRatioScore: number   // 0-25
  winRateScore: number         // 0-25
  diversityScore: number       // 0-25
  tier: HealthTier
  color: string
}

interface BestBet {
  id: string
  title: string
  value: number
  probability: number
  weighted: number
  stage: Deal['stage']
  expectedCloseDate: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isoMonth(date: Date): string {
  return format(date, 'yyyy-MM')
}

function monthLabel(date: Date, dateLocale: Locale): string {
  return format(date, 'MMM yy', { locale: dateLocale })
}

// ─── Pipeline health score computation ───────────────────────────────────────

function computeHealthScore(
  deals: Deal[],
  activities: { dealId?: string }[],
): HealthScore {
  const activeDeals = deals.filter(
    (d) => d.stage !== 'closed_won' && d.stage !== 'closed_lost',
  )

  // 1. Active deal count score (0-25): 10+ deals = full score
  const countScore = Math.min(25, Math.round((activeDeals.length / 10) * 25))

  // 2. Stage diversity score (0-25): reward presence in multiple stages
  const activeStages = ['lead', 'qualified', 'proposal', 'negotiation'] as const
  const stagesPresent = activeStages.filter((s) =>
    activeDeals.some((d) => d.stage === s),
  ).length
  const diversityScore = Math.round((stagesPresent / activeStages.length) * 25)

  // 3. Activities-per-deal ratio score (0-25): 3+ activities/deal = full score
  const dealsWithActivities = new Set(
    activities.filter((a) => a.dealId).map((a) => a.dealId),
  ).size
  const ratio = activeDeals.length > 0 ? dealsWithActivities / activeDeals.length : 0
  const activityRatioScore = Math.min(25, Math.round((ratio / 1) * 25))

  // 4. Win rate score (0-25): 30%+ win rate = full score
  const closedDeals = deals.filter(
    (d) => d.stage === 'closed_won' || d.stage === 'closed_lost',
  )
  const wonDeals = deals.filter((d) => d.stage === 'closed_won')
  const winRate = closedDeals.length > 0 ? wonDeals.length / closedDeals.length : 0
  const winRateScore = Math.min(25, Math.round((winRate / 0.3) * 25))

  const score = countScore + diversityScore + activityRatioScore + winRateScore

  let tier: HealthTier
  let color: string
  if (score >= 80) { tier = 'excellent'; color = 'text-success' }
  else if (score >= 60) { tier = 'good'; color = 'text-accent-400' }
  else if (score >= 40) { tier = 'fair'; color = 'text-warning' }
  else { tier = 'low'; color = 'text-danger' }

  return {
    score,
    activeDeals: activeDeals.length,
    stageScore: diversityScore,
    activityRatioScore,
    winRateScore,
    diversityScore: countScore,
    tier,
    color,
  }
}

function healthLabelForTier(tier: HealthTier, t: ReturnType<typeof useTranslations>): string {
  switch (tier) {
    case 'excellent':
      return t.forecast.healthExcellent
    case 'good':
      return t.forecast.healthGood
    case 'fair':
      return t.forecast.healthFair
    default:
      return t.forecast.healthLow
  }
}

// ─── Gauge arc (SVG) ─────────────────────────────────────────────────────────

interface GaugeProps {
  value: number   // 0-100
  color: string   // tailwind text class
  valueTextColor?: string
}

function HealthGauge({ value, color, valueTextColor }: GaugeProps) {
  const radius = 54
  const circumference = Math.PI * radius   // half-circle
  const offset = circumference * (1 - value / 100)

  // Map tailwind text class to stroke hex
  const strokeMap: Record<string, string> = {
    'text-success': '#34d399',
    'text-accent-400': '#60a5fa',
    'text-warning': '#fbbf24',
    'text-danger': '#f87171',
  }
  const stroke = strokeMap[color] ?? '#60a5fa'

  return (
    <svg viewBox="0 0 120 70" className="w-36 h-24" aria-hidden="true">
      {/* Track */}
      <path
        d="M 10,65 A 54,54 0 0,1 110,65"
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* Fill */}
      <path
        d="M 10,65 A 54,54 0 0,1 110,65"
        fill="none"
        stroke={stroke}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={`${offset}`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      {/* Value text */}
      <text x="60" y="62" textAnchor="middle" fill={valueTextColor ?? 'currentColor'} fontSize="18" fontWeight="700">
        {value}
      </text>
    </svg>
  )
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KPICardProps {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
}

function KPICard({ label, value, sub, icon, trend, trendLabel }: KPICardProps) {
  return (
    <div className="glass p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-fg-subtle">{label}</p>
        <span className="w-8 h-8 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-400 flex-shrink-0">
          {icon}
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold text-fg tracking-tight">{value}</p>
        {sub && <p className="text-xs text-fg-subtle mt-0.5">{sub}</p>}
      </div>
      {trend && trendLabel && (
        <div className={`flex items-center gap-1 text-xs font-medium ${
          trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-fg-muted'
        }`}>
          {trend === 'up' && <TrendingUp size={12} />}
          {trend === 'down' && <TrendingDown size={12} />}
          {trendLabel}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Forecast() {
  const t = useTranslations()
  const chart = useChartTheme()
  const dateLocale = useDateLocale()
  // Manual Zustand subscriptions to avoid getSnapshot issues with persist middleware
  const [deals, setDeals] = useState<Deal[]>(() => useDealsStore.getState().deals)
  const [activities, setActivities] = useState(
    () => useActivitiesStore.getState().activities,
  )

  useEffect(() => {
    setDeals(useDealsStore.getState().deals)
    setActivities(useActivitiesStore.getState().activities)

    const unsubDeals = useDealsStore.subscribe((s) => setDeals(s.deals))
    const unsubActivities = useActivitiesStore.subscribe((s) =>
      setActivities(s.activities),
    )
    return () => {
      unsubDeals()
      unsubActivities()
    }
  }, [])

  // ── Monthly revenue trend: last 12 closed_won months ──────────────────────

  const monthlyRevenue = useMemo<MonthlyRevenue[]>(() => {
    const now = new Date()
    return Array.from({ length: 12 }, (_, i) => {
      const monthDate = subMonths(now, 11 - i)
      const start = startOfMonth(monthDate)
      const end = endOfMonth(monthDate)
      const iso = isoMonth(monthDate)

      const monthDeals = deals.filter((d) => {
        if (d.stage !== 'closed_won') return false
        try {
          return isWithinInterval(parseISO(d.updatedAt), { start, end })
        } catch {
          return false
        }
      })

      return {
        month: monthLabel(monthDate, dateLocale),
        isoMonth: iso,
        revenue: monthDeals.reduce((sum, d) => sum + d.value, 0),
        dealCount: monthDeals.length,
      }
    })
  }, [deals, dateLocale])

  // ── Forecast: next 3 months weighted pipeline ─────────────────────────────

  const forecastMonths = useMemo<ForecastMonth[]>(() => {
    const now = new Date()
    const activeDeals = deals.filter(
      (d) => d.stage !== 'closed_won' && d.stage !== 'closed_lost',
    )

    return Array.from({ length: 3 }, (_, i) => {
      const monthDate = addMonths(now, i + 1)
      const start = startOfMonth(monthDate)
      const end = endOfMonth(monthDate)
      const iso = isoMonth(monthDate)

      const closing = activeDeals.filter((d) => {
        try {
          return isWithinInterval(parseISO(d.expectedCloseDate), { start, end })
        } catch {
          return false
        }
      })

      return {
        month: monthLabel(monthDate, dateLocale),
        isoMonth: iso,
        weighted: closing.reduce((sum, d) => sum + d.value * (d.probability / 100), 0),
        dealCount: closing.length,
        isProjection: true as const,
      }
    })
  }, [deals, dateLocale])

  // ── Combined chart data (history + projection) ────────────────────────────

  const chartData = useMemo(() => {
    const history = monthlyRevenue.map((m) => ({
      month: m.month,
      revenue: m.revenue,
      weighted: null as number | null,
      isProjection: false,
    }))
    const projection = forecastMonths.map((m) => ({
      month: m.month,
      revenue: null as number | null,
      weighted: m.weighted,
      isProjection: true,
    }))
    return [...history, ...projection]
  }, [monthlyRevenue, forecastMonths])

  // ── KPI Calculations ──────────────────────────────────────────────────────

  const kpi = useMemo<KPIData>(() => {
    const now = new Date()
    const yearStart = new Date(now.getFullYear(), 0, 1)

    // Total won YTD
    const wonYTD = deals.filter((d) => {
      if (d.stage !== 'closed_won') return false
      try {
        return parseISO(d.updatedAt) >= yearStart
      } catch {
        return false
      }
    })
    const totalWonYTD = wonYTD.reduce((sum, d) => sum + d.value, 0)

    // Average deal size (all won deals)
    const allWon = deals.filter((d) => d.stage === 'closed_won')
    const avgDealSize = allWon.length > 0
      ? allWon.reduce((sum, d) => sum + d.value, 0) / allWon.length
      : 0

    // Projected next quarter: weighted pipeline closing in the next 3 months
    const projectedNextQ = forecastMonths.reduce((sum, m) => sum + m.weighted, 0)

    // Growth rate MoM: last 2 complete months
    const lastMonth = monthlyRevenue[monthlyRevenue.length - 1]
    const prevMonth = monthlyRevenue[monthlyRevenue.length - 2]
    let growthRateMoM = 0
    let hasGrowthData = false
    if (prevMonth && prevMonth.revenue > 0) {
      growthRateMoM = ((lastMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100
      hasGrowthData = true
    }

    return { totalWonYTD, avgDealSize, projectedNextQ, growthRateMoM, hasGrowthData }
  }, [deals, forecastMonths, monthlyRevenue])

  const scenarioTotals = useMemo(() => {
    const activeDeals = deals.filter((d) => d.stage !== 'closed_won' && d.stage !== 'closed_lost')
    const committed = activeDeals
      .filter((d) => d.probability >= 70)
      .reduce((sum, d) => sum + d.value, 0)
    const bestCase = activeDeals.reduce((sum, d) => sum + d.value * Math.min(1, (d.probability + 20) / 100), 0)
    const expected = activeDeals.reduce((sum, d) => sum + d.value * (d.probability / 100), 0)
    return { committed, bestCase, expected }
  }, [deals])

  // ── Pipeline health score ─────────────────────────────────────────────────

  const health = useMemo(() => {
    const raw = computeHealthScore(deals, activities)
    return {
      ...raw,
      label: healthLabelForTier(raw.tier, t),
    }
  }, [deals, activities, t])

  // ── Best bets: top 5 by weighted value ───────────────────────────────────

  const bestBets = useMemo<BestBet[]>(() => {
    return deals
      .filter((d) => d.stage !== 'closed_won' && d.stage !== 'closed_lost')
      .map((d) => ({
        id: d.id,
        title: d.title,
        value: d.value,
        probability: d.probability,
        weighted: d.value * (d.probability / 100),
        stage: d.stage,
        expectedCloseDate: d.expectedCloseDate,
      }))
      .sort((a, b) => b.weighted - a.weighted)
      .slice(0, 5)
  }, [deals])

  // ── Stage colour map ──────────────────────────────────────────────────────

  const stageColorClass: Record<Deal['stage'], string> = {
    lead: 'text-info bg-info/10',
    qualified: 'text-warning bg-warning/10',
    proposal: 'text-accent-400 bg-accent-500/10',
    negotiation: 'text-accent-300 bg-accent-600/10',
    closed_won: 'text-success bg-success/10',
    closed_lost: 'text-danger bg-danger/10',
  }

  // ── Growth trend helpers ──────────────────────────────────────────────────

  const growthTrend = kpi.hasGrowthData
    ? kpi.growthRateMoM >= 0 ? 'up' : 'down'
    : 'neutral'

  const growthLabel = kpi.hasGrowthData
    ? `${kpi.growthRateMoM >= 0 ? '+' : ''}${kpi.growthRateMoM.toFixed(1)}%`
    : t.forecast.growthUnavailable

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="crm-page space-y-6">
      <PageHeader showTitle={false} title={t.forecast.title} subtitle={t.reports.salesOverview} />

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          label={t.forecast.title}
          value={formatCurrency(kpi.totalWonYTD)}
          sub={t.deals.stageLabels.closed_won}
          icon={<DollarSign size={15} />}
        />
        <KPICard
          label={t.forecast.expected}
          value={formatCurrency(kpi.avgDealSize)}
          sub={t.deals.won}
          icon={<Target size={15} />}
        />
        <KPICard
          label={t.forecast.bestCase}
          value={formatCurrency(scenarioTotals.bestCase)}
          sub={t.forecast.weighted}
          icon={<Zap size={15} />}
        />
        <KPICard
          label={t.forecast.committed}
          value={formatCurrency(scenarioTotals.committed)}
          sub={t.forecast.expected}
          icon={<TrendingUp size={15} />}
          trend={growthTrend}
          trendLabel={growthLabel}
        />
      </div>

      {/* ── Revenue trend + Forecast chart ────────────────────────────────── */}
      <div className="glass p-5">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="text-sm font-semibold text-fg-muted">{t.forecast.title}</h3>
            <p className="text-xs text-fg-subtle mt-0.5">
              {t.forecast.weighted}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-fg-subtle">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-accent-500/70 inline-block" />
              {t.forecast.committed}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-success/50 inline-block" />
              {t.forecast.bestCase}
            </span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="projectionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chart.success} stopOpacity={0.25} />
                <stop offset="95%" stopColor={chart.success} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: chart.axisTickFill, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: chart.axisTickFill, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
              }
            />
            <Tooltip
              contentStyle={chart.tooltipStyle}
              formatter={(value: number | string | ReadonlyArray<number | string> | undefined, name: string | number | undefined) => [
                formatCurrency(Number(Array.isArray(value) ? (value as ReadonlyArray<number | string>)[0] : (value ?? 0))),
                name === 'revenue' ? t.forecast.committed : t.forecast.weighted,
              ] as [string, string]}
            />
            <Bar
              dataKey="revenue"
              fill={chart.barPrimary}
              radius={[4, 4, 0, 0]}
              name="revenue"
              maxBarSize={36}
            />
            <Area
              type="monotone"
              dataKey="weighted"
              stroke={chart.success}
              strokeWidth={2}
              fill="url(#projectionGradient)"
              strokeDasharray="5 3"
              name="weighted"
              connectNulls
              dot={{ fill: chart.success, r: 3, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="weighted"
              stroke={chart.success}
              strokeWidth={0}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Pipeline health + Forecast breakdown ──────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Health score card */}
        <div className="glass p-5 flex flex-col items-center justify-center gap-3">
          <div className="w-full">
            <h3 className="text-sm font-semibold text-fg-muted">{t.reports.pipeline}</h3>
            <p className="text-xs text-fg-subtle mt-0.5">{t.forecast.healthScoreSubtitle}</p>
          </div>

          <HealthGauge value={health.score} color={health.color} valueTextColor={chart.fg} />

          <p className={`text-lg font-bold ${health.color}`}>{health.label}</p>

          {/* Score breakdown bars */}
          <div className="w-full space-y-2 mt-1">
            {[
              { label: t.dashboard.activeDealsLabel, value: health.diversityScore, max: 25 },
              { label: t.deals.stage, value: health.stageScore, max: 25 },
              { label: t.activities.title, value: health.activityRatioScore, max: 25 },
              { label: t.reports.conversionRate, value: health.winRateScore, max: 25 },
            ].map(({ label, value, max }) => (
              <div key={label} className="flex items-center gap-2">
                <p className="text-[11px] text-fg-subtle w-36 flex-shrink-0">{label}</p>
                <div className="flex-1 h-1.5 bg-fg/6 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-500 rounded-full transition-all duration-slow"
                    style={{ width: `${(value / max) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] text-fg-muted w-6 text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Next 3-month forecast breakdown */}
        <div className="glass p-5 xl:col-span-2">
          <h3 className="text-sm font-semibold text-fg-muted mb-1">{t.forecast.bestCase}</h3>
          <p className="text-xs text-fg-subtle mb-4">
            {t.forecast.weighted}
          </p>

          <div className="grid grid-cols-3 gap-4 mb-5">
            {forecastMonths.map((m) => (
              <div key={m.isoMonth} className="bg-fg/[0.03] border border-fg/6 rounded-xl p-4">
                <p className="text-xs text-fg-subtle capitalize mb-1">{m.month}</p>
                <p className="text-xl font-bold text-success">
                  {formatCurrency(m.weighted)}
                </p>
                <p className="text-[11px] text-fg-subtle mt-1">
                  {m.dealCount} {t.forecast.closingDealsSuffix}
                </p>
              </div>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={forecastMonths}
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: chart.axisTickFill, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: chart.axisTickFill, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                }
              />
              <Tooltip
                contentStyle={chart.tooltipStyle}
                formatter={(v: number | string | ReadonlyArray<number | string> | undefined) => [
                  formatCurrency(Number(Array.isArray(v) ? (v as ReadonlyArray<number | string>)[0] : (v ?? 0))),
                  t.forecast.weighted,
                ] as [string, string]}
              />
              <Bar
                dataKey="weighted"
                fill={chart.success}
                radius={[6, 6, 0, 0]}
                name="weighted"
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Best bets table ────────────────────────────────────────────────── */}
      <div className="glass p-5">
        <div className="flex items-center gap-2 mb-4">
          <Star size={15} className="text-warning" />
          <h3 className="text-sm font-semibold text-fg-muted">{t.forecast.bestCase}</h3>
          <span className="text-xs text-fg-subtle ml-1">{t.forecast.weighted}</span>
        </div>

        {bestBets.length === 0 ? (
          <p className="text-sm text-fg-subtle text-center py-8">
            {t.deals.emptyTitle}
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-fg/8">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">{t.forecast.bestCase}</caption>
              <thead>
                <tr className="border-b border-fg/8">
                  {[t.deals.title, t.common.value, t.deals.stage, t.deals.expectedClose, t.deals.probability, t.forecast.weighted].map(
                    (h) => (
                      <th
                        key={h}
                        scope="col"
                        className="text-left text-xs font-semibold text-fg-subtle py-2 pr-4 last:pr-0"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {bestBets.map((bet, idx) => (
                  <tr key={bet.id} className="hover:bg-fg/[0.02] transition-colors">
                    {/* Rank + title */}
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-fg-subtle w-4 flex-shrink-0">{idx + 1}</span>
                        <span className="text-sm font-medium text-fg truncate max-w-[200px]">
                          {bet.title}
                        </span>
                      </div>
                    </td>

                    {/* Value */}
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-fg">
                        {formatCurrency(bet.value)}
                      </span>
                    </td>

                    {/* Stage badge */}
                    <td className="py-3 pr-4">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          stageColorClass[bet.stage]
                        }`}
                      >
                        {t.deals.stageLabels[bet.stage as keyof typeof t.deals.stageLabels] ?? bet.stage}
                      </span>
                    </td>

                    {/* Close date */}
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <span className="text-xs text-fg-muted">
                        {formatDate(bet.expectedCloseDate)}
                      </span>
                    </td>

                    {/* Probability bar */}
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-fg/8 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-accent-500 transition-all duration-slow"
                            style={{ width: `${bet.probability}%` }}
                          />
                        </div>
                        <span className="text-xs text-fg-muted w-8">{bet.probability}%</span>
                      </div>
                    </td>

                    {/* Weighted value */}
                    <td className="py-3">
                      <span className="text-sm font-bold text-success">
                        {formatCurrency(bet.weighted)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
