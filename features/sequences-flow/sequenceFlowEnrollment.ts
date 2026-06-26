import type { EmailSequence, SequenceStep } from '../../types'
import { isAbSplitPayload } from '../../types'
import {
  flowPrimaryPathToSteps,
  getEntryNodeId,
  resolveFlowDefinition,
} from './sequenceFlowConverters'

/**
 * Resolves the first actionable node for a new enrollment (skips through `ab_split`
 * by assigning a weighted branch). Used when creating enrollments against a flow.
 */
export function computeEnrollmentStart(sequence: EmailSequence): {
  currentNodeId: string | null
  abVariant: 'a' | 'b' | null
  delayDays: number
  currentStep: number
} {
  const flow = resolveFlowDefinition(sequence)
  const steps = flowPrimaryPathToSteps(flow)
  let cur: string | null = getEntryNodeId(flow)
  let abVariant: 'a' | 'b' | null = null
  let hops = 0
  const maxHops = flow.nodes.length + 4

  while (cur && hops < maxHops) {
    hops += 1
    const node = flow.nodes.find((n) => n.id === cur)
    if (!node) break

    if (node.type === 'ab_split' && isAbSplitPayload(node.data)) {
      const outs = flow.edges.filter((e) => e.source === cur)
      const tw = Math.max(0.0001, node.data.weightA + node.data.weightB)
      const pickA = Math.random() * tw < node.data.weightA
      const want: 'a' | 'b' = pickA ? 'a' : 'b'
      const edge =
        outs.find((e) => (e.sourceHandle ?? 'a') === want) ??
        outs.find((e) => (e.sourceHandle ?? 'a') === 'a') ??
        outs[0]
      if (!edge) break
      abVariant = want
      cur = edge.target
      continue
    }

    const step = node.data as SequenceStep
    const idx = steps.findIndex((s) => s.id === cur)
    return {
      currentNodeId: cur,
      abVariant,
      delayDays: step.delayDays ?? 0,
      currentStep: Math.max(0, idx),
    }
  }

  const first = steps[0]
  return {
    currentNodeId: first?.id ?? null,
    abVariant: null,
    delayDays: first?.delayDays ?? 0,
    currentStep: 0,
  }
}
