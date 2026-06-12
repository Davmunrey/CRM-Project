import { Draggable } from '@hello-pangea/dnd'
import type { Deal } from '../../types'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { DEAL_PRIORITY_COLORS } from '../../utils/constants'
import { Avatar } from '../ui/Avatar'
import { memo, useMemo } from 'react'
import { useContactsStore } from '../../store/contactsStore'
import { useCompaniesStore } from '../../store/companiesStore'
import { useActivitiesStore } from '../../store/activitiesStore'
import { getTranslations } from '../../i18n'
import { localizedCompany, localizedContact, localizedDeal } from '../../i18n/localizeSeed'
import { computeDealHealth, healthStatusColor, healthStatusBg } from '../../utils/dealHealth'
import { computeDealRot, hasUpcomingActivity } from '../../utils/dealRot'
import { CalendarDays, Flame, CalendarClock } from 'lucide-react'

interface DealCardProps {
  deal: Deal
  index: number
  onClick: () => void
}

function getDealAgeDays(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
}

function getAgingColor(days: number): { bg: string; text: string } {
  if (days < 7) return { bg: 'bg-success/15', text: 'text-success' }
  if (days <= 30) return { bg: 'bg-warning/15', text: 'text-warning' }
  return { bg: 'bg-danger/15', text: 'text-danger' }
}

function DealCardInner({ deal, index, onClick }: DealCardProps) {
  const contactRaw = useContactsStore((s) => s.contacts.find((c) => c.id === deal.contactId))
  const companyRaw = useCompaniesStore((s) => s.companies.find((c) => c.id === deal.companyId))
  const activities = useActivitiesStore((s) => s.activities)
  const displayDeal = useMemo(() => localizedDeal(deal, getTranslations()), [deal])
  const contact = useMemo(
    () => (contactRaw ? localizedContact(contactRaw, getTranslations()) : undefined),
    [contactRaw],
  )
  const company = useMemo(
    () => (companyRaw ? localizedCompany(companyRaw, getTranslations()) : undefined),
    [companyRaw],
  )
  const health = computeDealHealth(deal, activities)
  const rot = computeDealRot(deal)
  const dealActivities = useMemo(() => activities.filter((a) => a.dealId === deal.id), [activities, deal.id])
  const needsNextStep = rot.isOpen && !hasUpcomingActivity(dealActivities)
  const tr = getTranslations()

  const isOverdue = deal.expectedCloseDate < new Date().toISOString().split('T')[0]
    && deal.stage !== 'closed_won' && deal.stage !== 'closed_lost'

  const ageDays = getDealAgeDays(deal.createdAt)
  const aging = getAgingColor(ageDays)

  return (
    <Draggable draggableId={deal.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`
            bg-surface-1 border rounded-xl p-3 cursor-pointer
            transition-all duration-fast select-none
            ${snapshot.isDragging
              ? 'border-indigo-500 shadow-xl shadow-indigo-500/10 rotate-1'
              : 'border-fg/8 hover:border-fg/16'
            }
          `}
        >
          {/* Title + priority dot + aging badge */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-sm font-medium text-fg leading-snug line-clamp-2">{displayDeal.title}</p>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${aging.bg} ${aging.text}`}>
                {ageDays}d
              </span>
            </div>
            <div
              className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
              style={{ backgroundColor: DEAL_PRIORITY_COLORS[deal.priority] }}
              title={`Prioridad: ${deal.priority}`}
            />
          </div>

          {/* Health badge */}
          {health.status !== 'strong' && health.status !== 'on_track' && deal.stage !== 'closed_won' && deal.stage !== 'closed_lost' && (
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border mb-2 ${healthStatusBg(health.status)} ${healthStatusColor(health.status)}`}
              title={health.reasons.join(' · ')}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${health.status === 'at_risk' ? 'bg-danger animate-pulse' : 'bg-warning'}`} />
              {health.status === 'at_risk' ? 'At risk' : 'Watch'}
            </span>
          )}

          {/* Pipedrive-style flags: rotting (idle) + no scheduled next step */}
          {(rot.isRotting || needsNextStep) && (
            <div className="flex flex-wrap items-center gap-1 mb-2">
              {rot.isRotting && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-danger/30 bg-danger/12 text-danger"
                  title={tr.dealRot.idleFor.replace('{days}', String(rot.daysIdle))}
                >
                  <Flame size={10} /> {tr.dealRot.rotting}
                </span>
              )}
              {needsNextStep && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-warning/30 bg-warning/12 text-warning"
                  title={tr.dealRot.noNextStep}
                >
                  <CalendarClock size={10} /> {tr.dealRot.noNextStep}
                </span>
              )}
            </div>
          )}

          {/* Company */}
          {company && (
            <p className="text-xs text-fg-subtle mb-2 truncate">{company.name}</p>
          )}

          {/* Value */}
          <p className="text-sm font-bold text-success mb-2">
            {formatCurrency(displayDeal.value, displayDeal.currency)}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CalendarDays size={11} className={isOverdue ? 'text-danger' : 'text-fg-subtle'} />
              <span className={`text-[10px] ${isOverdue ? 'text-danger' : 'text-fg-subtle'}`}>
                {formatDate(deal.expectedCloseDate)}
              </span>
            </div>
            {contact && (
              <Avatar
                name={`${contact.firstName} ${contact.lastName}`}
                size="xs"
              />
            )}
          </div>
        </div>
      )}
    </Draggable>
  )
}

export const DealCard = memo(DealCardInner)
