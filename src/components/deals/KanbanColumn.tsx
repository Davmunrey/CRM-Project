import { Droppable } from '@hello-pangea/dnd'
import type { Deal, DealStage } from '../../types'
import { DealCard } from './DealCard'
import { formatCurrency } from '../../utils/formatters'
import { useTranslations } from '../../i18n'
import { useSettingsStore } from '../../store/settingsStore'

interface KanbanColumnProps {
  stage: DealStage
  deals: Deal[]
  onDealClick: (deal: Deal) => void
  color: string
}

export function KanbanColumn({ stage, deals, onDealClick, color }: KanbanColumnProps) {
  const t = useTranslations()
  const pipelineStages = useSettingsStore((s) => s.settings.pipelineStages)
  const totalValue = deals.reduce((sum, d) => sum + d.value, 0)
  const customStageLabel = pipelineStages.find((s) => s.id === stage)?.name
  const stageLabels = t.deals.stageLabels as Record<string, string>
  const stageLabel = stageLabels[stage] || customStageLabel || stage

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-semibold text-fg-muted">{stageLabel}</span>
          <span className="text-xs text-fg-subtle bg-fg/4 px-1.5 py-0.5 rounded-full">
            {deals.length}
          </span>
        </div>
        <span className="text-xs text-fg-subtle font-medium">
          {formatCurrency(totalValue)}
        </span>
      </div>

      {/* Drop zone */}
      <Droppable droppableId={stage}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`
              kanban-dropzone flex-1 rounded-xl min-h-[200px] p-2 space-y-2 transition-colors
              ${snapshot.isDraggingOver
                ? 'bg-accent-500/10 border border-indigo-500/30'
                : 'bg-surface-2/30 border border-fg/6'
              }
            `}
          >
            {deals.map((deal, index) => (
              <DealCard
                key={deal.id}
                deal={deal}
                index={index}
                onClick={() => onDealClick(deal)}
              />
            ))}
            {provided.placeholder}
            {deals.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-20 text-fg text-xs">
                {t.deals.dragDealsHere}
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  )
}
