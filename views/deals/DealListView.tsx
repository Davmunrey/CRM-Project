import type { Dispatch, SetStateAction } from 'react'
import { Trash2, KanbanSquare } from 'lucide-react'
import { useTranslations, useLocalizedOrgUsers, getTranslations } from '../../i18n'
import { Button } from '../../components/ui/Button'
import { Badge, type BadgeVariant } from '../../components/ui/Badge'
import { Select } from '../../components/ui/Select'
import { EmptyState } from '../../components/shared/EmptyState'
import { PermissionGate } from '../../components/auth/PermissionGate'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { computeDealHealth, healthStatusColor } from '../../utils/dealHealth'
import { DEAL_PRIORITY_COLORS } from '../../utils/constants'
import { localizedDeal } from '../../i18n/localizeSeed'
import { rowActivationKeyDown } from '../../utils/a11y'
import { useAuthStore } from '../../store/authStore'
import { useActivitiesStore } from '../../store/activitiesStore'
import type { Deal, DealStage } from '../../types'

const STAGE_BADGE_MAP: Record<string, BadgeVariant> = {
  lead: 'info',
  qualified: 'warning',
  proposal: 'violet',
  negotiation: 'orange',
  closed_won: 'success',
  closed_lost: 'danger',
}

function getDealAgeDays(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
}

function getAgingColor(days: number): { bg: string; text: string } {
  if (days < 7) return { bg: 'bg-success/15', text: 'text-success' }
  if (days <= 30) return { bg: 'bg-warning/15', text: 'text-warning' }
  return { bg: 'bg-danger/15', text: 'text-danger' }
}

export interface DealListViewProps {
  filtered: Deal[]
  selectedDealIds: Set<string>
  setSelectedDealIds: Dispatch<SetStateAction<Set<string>>>
  sortedPipelineStages: Array<{ id: string; name: string; order: number }>
  getStageLabel: (stage: DealStage) => string
  getCompany: (id: string) => { id: string; name: string } | undefined
  onDealClick: (deal: Deal) => void
  onDeleteDeal: (id: string) => void
  onOpenForm: () => void
  onBulkAssign: (user: string) => void
  onBulkStageChange: (stage: DealStage) => void
  onBulkDeleteRequest: () => void
}

export function DealListView({
  filtered,
  selectedDealIds,
  setSelectedDealIds,
  sortedPipelineStages,
  getStageLabel,
  getCompany,
  onDealClick,
  onDeleteDeal,
  onOpenForm,
  onBulkAssign,
  onBulkStageChange,
  onBulkDeleteRequest,
}: DealListViewProps) {
  const t = useTranslations()
  const orgUsers = useLocalizedOrgUsers(useAuthStore((s) => s.users))
  const activities = useActivitiesStore((s) => s.activities)

  const toggleDealSelect = (id: string) => {
    setSelectedDealIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllDeals = () => {
    if (selectedDealIds.size === filtered.length) {
      setSelectedDealIds(new Set())
    } else {
      setSelectedDealIds(new Set(filtered.map((d) => d.id)))
    }
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto py-3 space-y-3">
      {selectedDealIds.size > 0 && (
        <div className="glass px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-fg-muted">
            {selectedDealIds.size} {t.deals.title} {t.common.selected}
          </span>
          <div className="h-4 w-px bg-fg/12" />
          <Select
            options={orgUsers.map((u) => ({ value: u.name, label: u.name }))}
            placeholder={t.common.assignedTo}
            value=""
            onChange={(e) => {
              if (e.target.value) onBulkAssign(e.target.value)
            }}
          />
          <Select
            options={sortedPipelineStages.map((s) => ({ value: s.id, label: s.name }))}
            placeholder={t.deals.stage}
            value=""
            onChange={(e) => {
              if (e.target.value) onBulkStageChange(e.target.value as DealStage)
            }}
          />
          <Button
            variant="danger"
            size="sm"
            leftIcon={<Trash2 size={14} />}
            onClick={onBulkDeleteRequest}
          >
            {t.common.delete}
          </Button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<KanbanSquare size={28} />}
          title={t.deals.emptyTitle}
          description={t.deals.emptyDescription}
          action={{ label: t.deals.newDeal, onClick: onOpenForm }}
        />
      ) : (
        <div className="glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">{t.nav.deals}</caption>
              <thead>
                <tr className="contacts-table-head border-b border-fg/8">
                  <th scope="col" className="px-4 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={selectedDealIds.size === filtered.length && filtered.length > 0}
                      onChange={toggleAllDeals}
                      aria-label={t.common.selectAll}
                      title={t.common.selectAll}
                      className="rounded border-fg/12 bg-fg/6 text-accent-500 focus:ring-accent-500"
                    />
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-fg-subtle uppercase">{t.deals.title}</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-fg-subtle uppercase">{t.deals.company}</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-fg-subtle uppercase">{t.common.value}</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-fg-subtle uppercase">{t.deals.stage}</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-fg-subtle uppercase">{t.common.priority}</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-fg-subtle uppercase">{t.deals.expectedClose}</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-fg-subtle uppercase">{t.common.assignedTo}</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-fg-subtle uppercase">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filtered.map((deal) => {
                  const locDeal = localizedDeal(deal, getTranslations())
                  const company = getCompany(deal.companyId)
                  const ageDays = getDealAgeDays(deal.createdAt)
                  const aging = getAgingColor(ageDays)
                  const health = computeDealHealth(deal, activities)
                  const showHealthDot = (health.status === 'at_risk' || health.status === 'needs_attention')
                    && deal.stage !== 'closed_won' && deal.stage !== 'closed_lost'
                  return (
                    <tr
                      key={deal.id}
                      tabIndex={0}
                      className="hover:bg-fg/4 cursor-pointer transition-colors"
                      onClick={() => onDealClick(deal)}
                      onKeyDown={(e) => rowActivationKeyDown(e, () => onDealClick(deal))}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedDealIds.has(deal.id)}
                          onChange={() => toggleDealSelect(deal.id)}
                          aria-label={`${t.common.select} ${locDeal.title}`}
                          title={`${t.common.select} ${locDeal.title}`}
                          className="rounded border-fg/12 bg-fg/6 text-accent-500 focus:ring-accent-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: DEAL_PRIORITY_COLORS[deal.priority] }} />
                          <span className="font-medium text-fg">{locDeal.title}</span>
                          {showHealthDot && (
                            <span
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${health.status === 'at_risk' ? 'bg-danger animate-pulse' : 'bg-warning'} ${healthStatusColor(health.status)}`}
                              title={health.reasons.join(' · ')}
                            />
                          )}
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${aging.bg} ${aging.text}`}>
                            {ageDays}{t.dashboard.days}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-fg-muted text-xs">{company?.name ?? '-'}</td>
                      <td className="px-4 py-3 text-success font-semibold text-sm">
                        {formatCurrency(deal.value, deal.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STAGE_BADGE_MAP[deal.stage] ?? 'neutral'}>{getStageLabel(deal.stage)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-fg-muted">{t.deals.priorityLabels[deal.priority]}</td>
                      <td className="px-4 py-3 text-xs text-fg-subtle">{formatDate(deal.expectedCloseDate)}</td>
                      <td className="px-4 py-3 text-xs text-fg-muted">{deal.assignedTo}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <PermissionGate permission="deals:delete">
                          <Button variant="ghost" size="xs" onClick={() => onDeleteDeal(deal.id)}
                            className="text-danger hover:text-danger">
                            <Trash2 size={13} />
                          </Button>
                        </PermissionGate>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
