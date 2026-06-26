import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { Clock, Mail, Phone, Split } from 'lucide-react'
import { useTranslations } from '../../i18n'
import type { SequenceFlowNode, SequenceStep, SequenceStepType } from '../../types'
import { isAbSplitPayload } from '../../types'
import { useSequenceFlowEdit } from './sequenceFlowEditContext'

export type FlowStudioNodeData = { flowNode: SequenceFlowNode }
/** React Flow node carrying our domain `SequenceFlowNode` in `data.flowNode`. */
export type FlowStudioRfNode = Node<FlowStudioNodeData>

const handleClass = '!w-2 !h-2 !border !border-fg/25 !bg-fg/50'

function stepIcon(type: SequenceStepType, size = 14) {
  switch (type) {
    case 'email':
      return <Mail size={size} className="text-accent-400" aria-hidden />
    case 'call_task':
      return <Phone size={size} className="text-success" aria-hidden />
    case 'linkedin_task':
      return <Mail size={size} className="text-fg-muted" aria-hidden />
    case 'wait':
      return <Clock size={size} className="text-warning" aria-hidden />
  }
}

function stepSummary(step: SequenceStep, t: ReturnType<typeof useTranslations>): string {
  switch (step.type) {
    case 'email':
      return step.subject?.trim() || t.sequences.flow.nodeSummaryEmail
    case 'call_task':
    case 'linkedin_task':
      return step.taskDescription?.trim() || t.sequences.flow.nodeSummaryTask
    case 'wait':
      return t.sequences.flow.nodeSummaryWait.replace('{days}', String(step.delayDays ?? 0))
    default:
      return ''
  }
}

export function SequenceStepRfNode({ id, data, selected }: NodeProps<FlowStudioRfNode>) {
  const t = useTranslations()
  const edit = useSequenceFlowEdit()
  const fn = data.flowNode
  const step = fn.data as SequenceStep
  const summary = stepSummary(step, t)
  const canPatch = edit?.canEdit ?? false

  return (
    <div
      className={`rounded-xl border bg-surface-2/95 px-3 py-2 shadow-md min-w-[200px] max-w-[280px] transition-shadow ${
        selected ? 'border-accent-500/60 ring-1 ring-accent-500/25' : 'border-fg/12'
      }`}
    >
      <Handle type="target" position={Position.Top} className={handleClass} />
      <div className="flex items-start gap-2">
        <div className="mt-0.5 shrink-0">{stepIcon(step.type)}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
            {t.sequences.flow.nodeTypeLabels[step.type]}
          </p>
          <p className="text-xs text-fg line-clamp-2 leading-snug">{summary}</p>
          <p className="text-[10px] text-fg-subtle mt-1 font-mono">{t.sequences.flow.metricsPlaceholder}</p>
        </div>
      </div>
      <div
        className="mt-2 space-y-1 border-t border-fg/10 pt-2"
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <label className="flex items-center gap-2 text-[10px] text-fg-muted">
          <span className="shrink-0 w-[7.5rem] leading-tight">{t.sequences.flow.nodeCanvasDelayLabel}</span>
          <input
            type="number"
            min={0}
            value={step.delayDays}
            disabled={!canPatch || !edit}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10)
              edit?.patchStep(id, { delayDays: Number.isFinite(n) && n >= 0 ? n : 0 })
            }}
            aria-label={t.sequences.flow.nodeCanvasDelayLabel}
            className="w-14 shrink-0 rounded-md border border-fg/15 bg-surface-1/80 px-1.5 py-0.5 text-[11px] text-fg tabular-nums outline-none focus:border-accent-500/50 disabled:opacity-50"
          />
        </label>
        {step.type === 'email' && step.order === 0 && step.delayDays === 0 ? (
          <p className="text-[9px] text-fg-subtle leading-snug">{t.sequences.flow.timingFirstStepGapNote}</p>
        ) : null}
      </div>
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </div>
  )
}

export function AbSplitRfNode({ data, selected }: NodeProps<FlowStudioRfNode>) {
  const t = useTranslations()
  const fn = data.flowNode
  const p = isAbSplitPayload(fn.data) ? fn.data : { kind: 'ab_split' as const, weightA: 50, weightB: 50 }

  return (
    <div
      className={`rounded-xl border bg-surface-2/95 px-3 py-2 shadow-md min-w-[160px] max-w-[220px] transition-shadow ${
        selected ? 'border-accent-500/60 ring-1 ring-accent-500/25' : 'border-fg/12'
      }`}
    >
      <Handle type="target" position={Position.Top} className={handleClass} />
      <div className="flex items-start gap-2">
        <Split size={14} className="text-accent-300 shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
            {t.sequences.flow.nodeTypeAbSplit}
          </p>
          <p className="text-xs text-fg-muted">
            {t.sequences.flow.abSplitWeightsSummary
              .replace('{a}', String(Math.round(p.weightA)))
              .replace('{b}', String(Math.round(p.weightB)))}
          </p>
          <p className="text-[10px] text-fg-subtle mt-1 font-mono">{t.sequences.flow.metricsPlaceholder}</p>
        </div>
      </div>
      <Handle
        id="a"
        type="source"
        position={Position.Bottom}
        className={handleClass}
        style={{ left: '32%', transform: 'translate(-50%, 0)' }}
      />
      <Handle
        id="b"
        type="source"
        position={Position.Bottom}
        className={handleClass}
        style={{ left: '68%', transform: 'translate(-50%, 0)' }}
      />
    </div>
  )
}
