import type { SequenceFlowDefinition, SequenceFlowEdge, SequenceStep, SequenceStepType } from '../../types'
import { isAbSplitPayload } from '../../types'
import {
  flowPrimaryPathToSteps,
  getEntryNodeId,
  normalizeFlowDefinition,
} from './sequenceFlowConverters'

const BASE_X = 120
const Y_GAP = 108
const Y_START = 40

function newStepId() {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function newEdgeId(a: string, b: string) {
  return `e-${a}-${b}-${Math.random().toString(36).slice(2, 6)}`
}

/** Last node id on the primary path (same ordering as `flowPrimaryPathToSteps`). */
export function getSinkNodeIdOnPrimaryPath(flow: SequenceFlowDefinition): string | null {
  const steps = flowPrimaryPathToSteps(flow)
  const last = steps[steps.length - 1]
  return last?.id ?? null
}

/** Place a new node below `sourceId` on the vertical spine (same X, lower Y). */
export function positionBelow(flow: SequenceFlowDefinition, sourceId: string): { x: number; y: number } {
  const src = flow.nodes.find((n) => n.id === sourceId)
  if (!src) return { x: BASE_X, y: Y_START }
  return { x: src.position.x, y: src.position.y + Y_GAP }
}

export function appendStepNode(
  flow: SequenceFlowDefinition,
  params: {
    connectFromId?: string | null
    type: SequenceStepType
    delayDays?: number
  },
): SequenceFlowDefinition {
  const id = newStepId()
  const steps = flowPrimaryPathToSteps(flow)
  const order = steps.length
  const fullStep: SequenceStep = {
    id,
    order,
    type: params.type,
    delayDays: params.delayDays ?? (order === 0 ? 0 : 3),
    ...(params.type === 'email'
      ? {
          subject: '',
          bodyTemplate: '',
          emailThreadMode: 'new_thread' as const,
          useEmailSignature: true,
        }
      : {}),
    ...((params.type === 'call_task' || params.type === 'linkedin_task') ? { taskDescription: '' } : {}),
  }

  const source =
    params.connectFromId ??
    getSinkNodeIdOnPrimaryPath(flow) ??
    getEntryNodeId(flow) ??
    null

  const pos = source ? positionBelow(flow, source) : { x: BASE_X, y: Y_START }
  const nodes = [...flow.nodes, { id, type: params.type, position: pos, data: fullStep }]
  const edges: SequenceFlowEdge[] = [...flow.edges]

  if (source) {
    edges.push({ id: newEdgeId(source, id), source, target: id })
  }

  return normalizeFlowDefinition({ flowVersion: flow.flowVersion, nodes, edges })
}

export function appendAbSplitNode(
  flow: SequenceFlowDefinition,
  connectFromId?: string | null,
): SequenceFlowDefinition {
  const id = `abs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const source =
    connectFromId ?? getSinkNodeIdOnPrimaryPath(flow) ?? getEntryNodeId(flow) ?? null
  const pos = source ? positionBelow(flow, source) : { x: BASE_X, y: Y_START }
  const nodes = [
    ...flow.nodes,
    {
      id,
      type: 'ab_split' as const,
      position: pos,
      data: { kind: 'ab_split' as const, weightA: 50, weightB: 50 },
    },
  ]
  const edges: SequenceFlowEdge[] = [...flow.edges]
  if (source) {
    edges.push({ id: newEdgeId(source, id), source, target: id })
  }
  return normalizeFlowDefinition({ flowVersion: flow.flowVersion, nodes, edges })
}

export function removeNode(flow: SequenceFlowDefinition, nodeId: string): SequenceFlowDefinition {
  const nodes = flow.nodes.filter((n) => n.id !== nodeId)
  const edges = flow.edges.filter((e) => e.source !== nodeId && e.target !== nodeId)
  if (nodes.length === 0) {
    return normalizeFlowDefinition({
      flowVersion: flow.flowVersion,
      nodes: [],
      edges: [],
    })
  }
  return normalizeFlowDefinition({ flowVersion: flow.flowVersion, nodes, edges })
}

export function updateNodeData(
  flow: SequenceFlowDefinition,
  nodeId: string,
  data: SequenceFlowDefinition['nodes'][0]['data'],
): SequenceFlowDefinition {
  const nodes = flow.nodes.map((n) => {
    if (n.id !== nodeId) return n
    if (isAbSplitPayload(data)) {
      return { ...n, type: 'ab_split' as const, data }
    }
    const st = data as SequenceStep
    return { ...n, type: st.type, data: st }
  })
  return normalizeFlowDefinition({ ...flow, nodes })
}

export function updateAbSplitWeights(
  flow: SequenceFlowDefinition,
  nodeId: string,
  weightA: number,
  weightB: number,
): SequenceFlowDefinition {
  const nodes = flow.nodes.map((n) => {
    if (n.id !== nodeId) return n
    if (n.type !== 'ab_split' || !isAbSplitPayload(n.data)) return n
    return {
      ...n,
      data: { kind: 'ab_split' as const, weightA: Math.max(0, weightA), weightB: Math.max(0, weightB) },
    }
  })
  return normalizeFlowDefinition({ ...flow, nodes })
}
