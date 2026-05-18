import { DragDropContext } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import { KanbanColumn } from '../../components/deals/KanbanColumn'
import { toast } from '../../store/toastStore'
import { useTranslations } from '../../i18n'
import { useDealsStore } from '../../store/dealsStore'
import type { Deal, DealStage } from '../../types'

export interface KanbanPipelineStage {
  id: string
  name: string
  order: number
  color?: string
}

export interface DealKanbanProps {
  filtered: Deal[]
  sortedPipelineStages: KanbanPipelineStage[]
  getStageLabel: (stage: DealStage) => string
  onDealClick: (deal: Deal) => void
}

export function DealKanban({
  filtered,
  sortedPipelineStages,
  getStageLabel,
  onDealClick,
}: DealKanbanProps) {
  const t = useTranslations()
  const moveDeal = useDealsStore((s) => s.moveDeal)

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const { draggableId, destination } = result
    const newStage = destination.droppableId as DealStage
    const deal = filtered.find((d) => d.id === draggableId)
    if (deal && deal.stage !== newStage) {
      moveDeal(draggableId, newStage)
      toast.success(`${t.deals.title} → ${getStageLabel(newStage)}`)
    }
  }

  return (
    <div className="flex-1 min-h-0 overflow-x-auto py-2 snap-x snap-mandatory md:snap-none">
      <DragDropContext onDragEnd={onDragEnd}>
        <div
          className="flex gap-4 h-full min-h-[500px] px-1 sm:px-0"
          style={{ minWidth: `${sortedPipelineStages.length * 296}px` }}
        >
          {sortedPipelineStages.map((pipelineStage) => (
            <div key={pipelineStage.id} className="snap-center shrink-0">
              <KanbanColumn
                stage={pipelineStage.id}
                deals={filtered.filter((d) => d.stage === pipelineStage.id)}
                onDealClick={onDealClick}
                color={pipelineStage.color ?? ''}
              />
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  )
}
