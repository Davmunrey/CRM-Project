import { describe, expect, it } from 'vitest'
import type { EmailSequence, SequenceStep } from '../src/types'
import {
  createDefaultFlowDefinition,
  flowHasCycle,
  flowPrimaryPathToSteps,
  getEntryNodeId,
  linearStepsToFlow,
  resolveFlowDefinition,
} from '../src/features/sequences-flow/sequenceFlowConverters'

describe('sequenceFlowConverters', () => {
  it('linearStepsToFlow preserves order and chains edges', () => {
    const steps: SequenceStep[] = [
      { id: 'a', order: 0, type: 'email', delayDays: 0, subject: 'S1', bodyTemplate: 'B1' },
      { id: 'b', order: 1, type: 'wait', delayDays: 2 },
    ]
    const flow = linearStepsToFlow(steps)
    expect(flow.nodes).toHaveLength(2)
    expect(flow.edges).toHaveLength(1)
    expect(flow.edges[0]!.source).toBe('a')
    expect(flow.edges[0]!.target).toBe('b')
    expect(getEntryNodeId(flow)).toBe('a')
  })

  it('flowPrimaryPathToSteps reverses a simple chain', () => {
    const steps: SequenceStep[] = [
      { id: 'x', order: 0, type: 'email', delayDays: 0 },
      { id: 'y', order: 1, type: 'email', delayDays: 1 },
    ]
    const flow = linearStepsToFlow(steps)
    const back = flowPrimaryPathToSteps(flow)
    expect(back.map((s) => s.id)).toEqual(['x', 'y'])
  })

  it('resolveFlowDefinition derives from steps when flowDefinition is absent', () => {
    const seq: EmailSequence = {
      id: '1',
      name: 'T',
      description: '',
      steps: [{ id: 'n1', order: 0, type: 'wait', delayDays: 1 }],
      createdBy: 'u',
      createdAt: '2020-01-01',
      isActive: true,
      enrolledCount: 0,
    }
    const flow = resolveFlowDefinition(seq)
    expect(flow.nodes).toHaveLength(1)
    expect(flow.nodes[0]!.id).toBe('n1')
  })

  it('createDefaultFlowDefinition yields one email node', () => {
    const flow = createDefaultFlowDefinition()
    expect(flow.nodes).toHaveLength(1)
    expect(flow.nodes[0]!.type).toBe('email')
  })

  it('flowHasCycle detects a loop', () => {
    const flow = linearStepsToFlow([
      { id: '1', order: 0, type: 'email', delayDays: 0 },
      { id: '2', order: 1, type: 'email', delayDays: 0 },
    ])
    const cyclic = {
      ...flow,
      edges: [...flow.edges, { id: 'e-back', source: '2', target: '1' }],
    }
    expect(flowHasCycle(flow)).toBe(false)
    expect(flowHasCycle(cyclic)).toBe(true)
  })
})
