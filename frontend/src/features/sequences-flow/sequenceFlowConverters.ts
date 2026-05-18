import type { EmailSequence, SequenceFlowDefinition, SequenceFlowEdge, SequenceFlowNode, SequenceStep } from '../../types'
import { SEQUENCE_FLOW_VERSION, isAbSplitPayload } from '../../types'

/** Vertical stack: fixed column X, increasing Y for each step (top → bottom). */
const LINEAR_NODE_X = 120
const LINEAR_NODE_Y_START = 40
const LINEAR_NODE_Y_GAP = 108

export function parseFlowDefinition(raw: unknown): SequenceFlowDefinition | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.flowVersion !== SEQUENCE_FLOW_VERSION) return null
  if (!Array.isArray(o.nodes) || !Array.isArray(o.edges)) return null
  return raw as SequenceFlowDefinition
}

export function createDefaultFlowDefinition(): SequenceFlowDefinition {
  const id = `step-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const step: SequenceStep = {
    id,
    order: 0,
    type: 'email',
    delayDays: 0,
    emailThreadMode: 'new_thread',
    subject: '',
    bodyTemplate: '',
    useEmailSignature: true,
  }
  return {
    flowVersion: SEQUENCE_FLOW_VERSION,
    nodes: [
      {
        id,
        type: 'email',
        position: { x: LINEAR_NODE_X, y: LINEAR_NODE_Y_START },
        data: step,
      },
    ],
    edges: [],
  }
}

export function linearStepsToFlow(steps: SequenceStep[]): SequenceFlowDefinition {
  const ordered = [...steps].sort((a, b) => a.order - b.order)
  if (ordered.length === 0) return createDefaultFlowDefinition()

  const nodes: SequenceFlowNode[] = ordered.map((st, i) => ({
    id: st.id,
    type: st.type,
    position: { x: LINEAR_NODE_X, y: LINEAR_NODE_Y_START + i * LINEAR_NODE_Y_GAP },
    data: { ...st, order: i },
  }))

  const edges: SequenceFlowEdge[] = []
  for (let i = 0; i < ordered.length - 1; i += 1) {
    const a = ordered[i]!
    const b = ordered[i + 1]!
    edges.push({
      id: `e-${a.id}-${b.id}`,
      source: a.id,
      target: b.id,
    })
  }

  return { flowVersion: SEQUENCE_FLOW_VERSION, nodes, edges }
}

export function resolveFlowDefinition(sequence: EmailSequence): SequenceFlowDefinition {
  const parsed = sequence.flowDefinition ? parseFlowDefinition(sequence.flowDefinition) : null
  if (parsed) return normalizeFlowDefinition(parsed)
  return linearStepsToFlow(sequence.steps ?? [])
}

export function normalizeFlowDefinition(flow: SequenceFlowDefinition): SequenceFlowDefinition {
  const nodes = flow.nodes.map((n) => {
    if (n.type === 'ab_split' && isAbSplitPayload(n.data)) {
      const wA = Math.max(0, n.data.weightA)
      const wB = Math.max(0, n.data.weightB)
      const sum = wA + wB || 100
      return {
        ...n,
        data: { kind: 'ab_split' as const, weightA: (wA / sum) * 100, weightB: (wB / sum) * 100 },
      }
    }
    const st = n.data as SequenceStep
    return { ...n, id: n.id, data: { ...st, id: n.id } }
  })
  return { flowVersion: SEQUENCE_FLOW_VERSION, nodes, edges: flow.edges.map((e) => ({ ...e })) }
}

export function getEntryNodeId(flow: SequenceFlowDefinition): string {
  const targets = new Set(flow.edges.map((e) => e.target))
  const entry = flow.nodes.find((n) => !targets.has(n.id))
  return entry?.id ?? flow.nodes[0]?.id ?? ''
}

/** Follow the primary path: at branches prefer handle `a`, then lexicographic edge id. */
export function flowPrimaryPathToSteps(flow: SequenceFlowDefinition): SequenceStep[] {
  const normalized = normalizeFlowDefinition(flow)
  const entry = getEntryNodeId(normalized)
  if (!entry) return []

  const outMap = new Map<string, SequenceFlowEdge[]>()
  for (const e of normalized.edges) {
    if (!outMap.has(e.source)) outMap.set(e.source, [])
    outMap.get(e.source)!.push(e)
  }

  const sortOuts = (edges: SequenceFlowEdge[]) =>
    [...edges].sort((a, b) => {
      const ha = a.sourceHandle ?? ''
      const hb = b.sourceHandle ?? ''
      if (ha === 'b' && hb !== 'b') return 1
      if (ha !== 'b' && hb === 'b') return -1
      return a.id.localeCompare(b.id)
    })

  const visited = new Set<string>()
  let cur: string | null = entry
  const steps: SequenceStep[] = []
  let order = 0

  while (cur && !visited.has(cur)) {
    visited.add(cur)
    const node = normalized.nodes.find((n) => n.id === cur)
    if (!node) break

    if (node.type !== 'ab_split' && !isAbSplitPayload(node.data)) {
      const st = node.data as SequenceStep
      steps.push({ ...st, id: node.id, order: order++ })
    }

    const outs = sortOuts(outMap.get(cur) ?? [])
    if (outs.length === 0) break
    cur = outs[0]!.target
  }

  return steps
}

export function flowHasCycle(flow: SequenceFlowDefinition): boolean {
  const adj = new Map<string, string[]>()
  for (const e of flow.edges) {
    if (!adj.has(e.source)) adj.set(e.source, [])
    adj.get(e.source)!.push(e.target)
  }
  const visited = new Set<string>()
  const stack = new Set<string>()

  const dfs = (u: string): boolean => {
    if (stack.has(u)) return true
    if (visited.has(u)) return false
    visited.add(u)
    stack.add(u)
    for (const v of adj.get(u) ?? []) {
      if (dfs(v)) return true
    }
    stack.delete(u)
    return false
  }

  for (const n of flow.nodes) {
    if (dfs(n.id)) return true
  }
  return false
}

export function getPrimaryPathStepIndex(flow: SequenceFlowDefinition, nodeId: string): number {
  const path = flowPrimaryPathToSteps(flow)
  const i = path.findIndex((s) => s.id === nodeId)
  return i === -1 ? 0 : i
}
