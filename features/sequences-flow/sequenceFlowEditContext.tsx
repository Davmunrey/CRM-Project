import { createContext, useContext } from 'react'
import type { SequenceStep } from '../../types'

export type PatchSequenceStepFn = (nodeId: string, patch: Partial<SequenceStep>) => void

export const SequenceFlowEditContext = createContext<{
  canEdit: boolean
  patchStep: PatchSequenceStepFn
} | null>(null)

export function useSequenceFlowEdit() {
  return useContext(SequenceFlowEditContext)
}
