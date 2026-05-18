import { useState, useEffect } from 'react'
import { Plus, Trash2, SlidersHorizontal } from 'lucide-react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useTranslations } from '../../i18n'
import { useSettingsStore } from '../../store/settingsStore'
import { useDealsStore } from '../../store/dealsStore'
import { toast } from '../../store/toastStore'
import type { PipelineStage } from '../../types'

const PIPELINE_STAGE_COLORS = ['#3b82f6', '#8b5cf6', '#14b8a6', '#f59e0b', '#f97316', '#ec4899']
const PIPELINE_STAGE_DELETE_BLOCKED = new Set(['closed_won', 'closed_lost'])
const innerSurface = 'rounded-xl border border-border-subtle bg-surface-1'

export function PipelineSection() {
  const t = useTranslations()
  const { settings, reorderStages, addPipelineStage, updateLeadSlaHours } = useSettingsStore()
  const [pipelineDraft, setPipelineDraft] = useState<PipelineStage[]>(settings.pipelineStages)

  useEffect(() => {
    setPipelineDraft(settings.pipelineStages)
  }, [settings.pipelineStages])

  const handlePipelineStageChange = (stageId: string, patch: Partial<PipelineStage>) => {
    setPipelineDraft((prev) => prev.map((stage) => (stage.id === stageId ? { ...stage, ...patch } : stage)))
  }

  const handlePipelineDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const from = result.source.index
    const to = result.destination.index
    if (from === to) return
    setPipelineDraft((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next.map((stage, index) => ({ ...stage, order: index }))
    })
  }

  const handleAddPipelineStage = () => {
    const nextIndex = settings.pipelineStages.length + 1
    const id = `stage_${Date.now().toString(36)}`
    const color = PIPELINE_STAGE_COLORS[settings.pipelineStages.length % PIPELINE_STAGE_COLORS.length]
    const stageName = `${t.deals.stage} ${nextIndex}`
    const newStage: PipelineStage = {
      id,
      name: stageName,
      color,
      order: settings.pipelineStages.length,
      probability: 40,
    }
    addPipelineStage(newStage)
    setPipelineDraft((prev) => [...prev, newStage])
    toast.success(t.common.create + ' ✓')
  }

  const handleRemovePipelineStage = (stageId: string) => {
    if (PIPELINE_STAGE_DELETE_BLOCKED.has(stageId)) {
      toast.error(t.settings.pipelineStageProtected)
      return
    }
    const sorted = [...pipelineDraft].sort((a, b) => a.order - b.order)
    const index = sorted.findIndex((s) => s.id === stageId)
    if (index === -1) return
    const fallback = sorted[index - 1]?.id ?? sorted[index + 1]?.id
    if (!fallback) {
      toast.error(t.errors.generic)
      return
    }
    const { deals, updateDeal } = useDealsStore.getState()
    for (const d of deals) {
      if (d.stage === stageId) updateDeal(d.id, { stage: fallback })
    }
    const nextStages = sorted.filter((s) => s.id !== stageId).map((s, i) => ({ ...s, order: i }))
    setPipelineDraft(nextStages)
    reorderStages(nextStages)
    toast.success(t.common.delete + ' ✓')
  }

  const handleSavePipelineConfig = () => {
    const normalized = pipelineDraft.map((stage, index) => ({
      ...stage,
      name: stage.name.trim() || settings.pipelineStages[index]?.name || stage.id,
      probability: Math.max(0, Math.min(100, Number.isFinite(stage.probability) ? stage.probability : 0)),
      order: index,
    }))
    reorderStages(normalized)
    toast.success(t.common.save + ' ✓')
  }

  return (
    <section className="crm-surface-section p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-fg">{t.settings.pipeline}</h2>
        <Button size="sm" leftIcon={<Plus size={13} />} onClick={handleAddPipelineStage}>
          {t.common.add}
        </Button>
      </div>
      <DragDropContext onDragEnd={handlePipelineDragEnd}>
        <Droppable droppableId="pipeline-stages">
          {(dropProvided) => (
            <div
              className="space-y-3"
              ref={dropProvided.innerRef}
              {...dropProvided.droppableProps}
            >
              {pipelineDraft.map((stage, index) => (
                <Draggable key={stage.id} draggableId={stage.id} index={index}>
                  {(dragProvided) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      className={`p-3 ${innerSurface}`}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <button
                          type="button"
                          {...dragProvided.dragHandleProps}
                          className="focus-ring mt-2 rounded-lg p-1 text-fg-subtle hover:text-fg-muted hover:bg-fg/6 cursor-grab active:cursor-grabbing shrink-0"
                          aria-label={`${t.common.edit} order`}
                          title={`${t.common.edit} order`}
                        >
                          <SlidersHorizontal size={14} />
                        </button>
                        <div className="w-3 h-3 rounded-full flex-shrink-0 mt-2.5" style={{ backgroundColor: stage.color }} />
                        <div className="min-w-0 flex-1 space-y-2">
                          <Input
                            label={t.common.name}
                            value={stage.name}
                            onChange={(e) => handlePipelineStageChange(stage.id, { name: e.target.value })}
                            className="w-full"
                          />
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              size="xs"
                              variant="ghost"
                              disabled={PIPELINE_STAGE_DELETE_BLOCKED.has(stage.id)}
                              onClick={() => handleRemovePipelineStage(stage.id)}
                              title={PIPELINE_STAGE_DELETE_BLOCKED.has(stage.id) ? t.settings.pipelineStageProtected : t.settings.pipelineStageDeleteHint}
                              aria-label={t.common.delete}
                              leftIcon={<Trash2 size={12} />}
                            >
                              {t.common.delete}
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-xs text-fg-muted w-28">{t.deals.probability}</label>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={stage.probability}
                          onChange={(e) => handlePipelineStageChange(stage.id, { probability: Number(e.target.value) })}
                          className="flex-1 accent-accent-600"
                        />
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={stage.probability}
                          onChange={(e) => handlePipelineStageChange(stage.id, { probability: Number(e.target.value) })}
                          className="crm-themed-input w-20 rounded-lg px-2 py-1 text-xs"
                        />
                        <span className="text-xs text-fg-subtle">%</span>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {dropProvided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <div className="mt-4 max-w-xs">
        <Input
          label={t.settings.leadOpsSlaHours}
          type="number"
          min={1}
          value={settings.leadSlaHours ?? 8}
          onChange={(e) => updateLeadSlaHours(Number(e.target.value))}
        />
      </div>
      <div className="mt-4 flex gap-2">
        <Button size="sm" onClick={handleSavePipelineConfig}>
          {t.common.save}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setPipelineDraft(settings.pipelineStages)}>
          {t.common.cancel}
        </Button>
      </div>
    </section>
  )
}
