import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Mail, Trash2, Save } from 'lucide-react'
import { useTranslations } from '../../i18n'
import type { EmailSequence, SequenceFlowDefinition, SequenceFlowEdge, SequenceFlowNode, SequenceStep } from '../../types'
import { Button } from '../../components/ui/Button'
import { flowHasCycle, flowPrimaryPathToSteps, resolveFlowDefinition } from './sequenceFlowConverters'
import { appendStepNode, getSinkNodeIdOnPrimaryPath, removeNode } from './sequenceFlowMutations'
import { AbSplitRfNode, SequenceStepRfNode, type FlowStudioRfNode } from './SequenceFlowNodes'
import { SequenceNodeInspector } from './SequenceNodeInspector'
import { SequenceFlowEditContext, type PatchSequenceStepFn } from './sequenceFlowEditContext'

function toRfNodes(flow: SequenceFlowDefinition): FlowStudioRfNode[] {
  return flow.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: { flowNode: n },
  }))
}

function toRfEdges(edges: SequenceFlowEdge[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    type: 'smoothstep' as const,
  }))
}

function fromRfState(nodes: FlowStudioRfNode[], edges: Edge[]): SequenceFlowDefinition {
  const mappedNodes: SequenceFlowNode[] = nodes.map((n) => {
    const base = n.data.flowNode
    return {
      ...base,
      position: n.position,
    }
  })
  const mappedEdges: SequenceFlowEdge[] = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? null,
  }))
  return {
    flowVersion: 2,
    nodes: mappedNodes,
    edges: mappedEdges,
  }
}

export interface SequenceFlowStudioProps {
  sequence: EmailSequence
  canEdit: boolean
  onPersist: (payload: { flowDefinition: SequenceFlowDefinition; steps: SequenceStep[] }) => void
}

export function SequenceFlowStudio({ sequence, canEdit, onPersist }: SequenceFlowStudioProps) {
  const t = useTranslations()
  const baseline = useMemo(() => resolveFlowDefinition(sequence), [sequence])
  const flowSnapshot = useMemo(
    () =>
      JSON.stringify({
        n: baseline.nodes.map((x) => [x.id, x.type, x.position, x.data]),
        e: baseline.edges,
      }),
    [baseline],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowStudioRfNode>(toRfNodes(baseline))
  const [edges, setEdges, onEdgesChange] = useEdgesState(toRfEdges(baseline.edges))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    const f = resolveFlowDefinition(sequence)
    setNodes(toRfNodes(f))
    setEdges(toRfEdges(f.edges))
    setSelectedId(null)
    setSaveError(null)
  }, [sequence.id, flowSnapshot, setEdges, setNodes])

  const flowFromCanvas = useMemo(() => fromRfState(nodes, edges), [nodes, edges])

  const nodeTypes = useMemo(
    () => ({
      email: SequenceStepRfNode,
      wait: SequenceStepRfNode,
      call_task: SequenceStepRfNode,
      linkedin_task: SequenceStepRfNode,
      ab_split: AbSplitRfNode,
    }),
    [],
  )

  const onConnect = useCallback(
    (params: Connection) => {
      if (!canEdit) return
      setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true }, eds))
    },
    [canEdit, setEdges],
  )

  const onNodeClick = useCallback((_e: MouseEvent, node: FlowStudioRfNode) => {
    setSelectedId(node.id)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedId(null)
  }, [])

  const handleSave = useCallback(() => {
    setSaveError(null)
    const next = fromRfState(nodes, edges)
    if (next.nodes.length === 0) {
      setSaveError(t.sequences.flow.validationEmpty)
      return
    }
    if (flowHasCycle(next)) {
      setSaveError(t.sequences.flow.validationCycle)
      return
    }
    const steps = flowPrimaryPathToSteps(next)
    onPersist({ flowDefinition: next, steps })
  }, [edges, nodes, onPersist, t.sequences.flow.validationCycle, t.sequences.flow.validationEmpty])

  const handleAddEmail = useCallback(() => {
    const flow = fromRfState(nodes, edges)
    const connectFrom = selectedId ?? getSinkNodeIdOnPrimaryPath(flow)
    const next = appendStepNode(flow, { connectFromId: connectFrom ?? undefined, type: 'email' })
    setNodes(toRfNodes(next))
    setEdges(toRfEdges(next.edges))
    setSelectedId(null)
  }, [edges, nodes, selectedId, setEdges, setNodes])

  const patchStep = useCallback<PatchSequenceStepFn>((nodeId, patch) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId) return n
        const fn = n.data.flowNode
        const raw = fn.data as { kind?: string }
        if ('kind' in raw && raw.kind === 'ab_split') return n
        const step = fn.data as SequenceStep
        return {
          ...n,
          data: {
            flowNode: {
              ...fn,
              data: { ...step, ...patch },
            },
          },
        }
      }),
    )
  }, [setNodes])

  const flowEditCtx = useMemo(() => ({ canEdit, patchStep }), [canEdit, patchStep])

  const handleDeleteSelected = useCallback(() => {
    if (!selectedId) return
    const flow = fromRfState(nodes, edges)
    const next = removeNode(flow, selectedId)
    if (next.nodes.length === 0) {
      const fallback = resolveFlowDefinition(sequence)
      setNodes(toRfNodes(fallback))
      setEdges(toRfEdges(fallback.edges))
    } else {
      setNodes(toRfNodes(next))
      setEdges(toRfEdges(next.edges))
    }
    setSelectedId(null)
  }, [edges, nodes, selectedId, sequence, setEdges, setNodes])

  const handleInspectorFlow = useCallback(
    (next: SequenceFlowDefinition) => {
      setNodes(toRfNodes(next))
      setEdges(toRfEdges(next.edges))
    },
    [setEdges, setNodes],
  )

  return (
    <div className="flex flex-col gap-2 min-h-0 flex-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-medium text-fg-subtle mr-0.5">{t.sequences.flow.toolbarAdd}</span>
        <Button type="button" size="sm" variant="secondary" disabled={!canEdit} leftIcon={<Mail size={14} />} onClick={handleAddEmail}>
          {t.activities.typeLabels.email}
        </Button>
        <div className="flex-1 min-w-[6px]" />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!canEdit || !selectedId}
          leftIcon={<Trash2 size={14} />}
          onClick={handleDeleteSelected}
        >
          {t.sequences.flow.deleteNode}
        </Button>
        <Button type="button" size="sm" disabled={!canEdit} leftIcon={<Save size={14} />} onClick={handleSave}>
          {t.common.save}
        </Button>
      </div>

      {saveError ? <p className="text-[10px] text-danger">{saveError}</p> : null}

      <div className="flex flex-1 min-h-0 gap-3 min-w-0 flex-col xl:flex-row xl:items-stretch">
        <div className="min-h-[min(220px,36svh)] flex-1 min-w-0 rounded-lg border border-fg/8 overflow-hidden bg-surface-2/[0.15] xl:min-h-[min(320px,48vh)] xl:max-w-[min(100%,520px)] xl:shrink-0">
          <SequenceFlowEditContext.Provider value={flowEditCtx}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={canEdit ? onEdgesChange : undefined}
              onConnect={canEdit ? onConnect : undefined}
              nodeTypes={nodeTypes}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              nodesDraggable={canEdit}
              nodesConnectable={canEdit}
              edgesReconnectable={canEdit}
              elementsSelectable
              fitView
              fitViewOptions={{ padding: 0.2 }}
              defaultEdgeOptions={{ type: 'smoothstep' }}
              proOptions={{ hideAttribution: true }}
              className="text-fg"
            >
              <Background />
              <Controls />
              <MiniMap pannable zoomable className="!bg-surface-2/90 hidden xl:block" />
            </ReactFlow>
          </SequenceFlowEditContext.Provider>
        </div>
        <div className="w-full min-h-[min(380px,52svh)] flex-1 min-w-0 flex flex-col xl:min-h-0 xl:min-w-[min(100%,28rem)] xl:max-w-none xl:flex-1 xl:border-l xl:border-fg/6 xl:pl-3">
          <SequenceNodeInspector flow={flowFromCanvas} selectedNodeId={selectedId} onChangeFlow={handleInspectorFlow} />
        </div>
      </div>

      <details className="rounded-md border border-fg/6 bg-fg/[0.02]">
        <summary className="cursor-pointer select-none px-2 py-1 text-[10px] font-medium text-fg-subtle hover:text-fg-muted list-none [&::-webkit-details-marker]:hidden">
          {t.sequences.flow.canvasHintSummary}
        </summary>
        <p className="px-2 pb-2 pt-1 text-[10px] text-fg-subtle leading-relaxed border-t border-fg/6">{t.sequences.flow.canvasHint}</p>
      </details>
    </div>
  )
}
