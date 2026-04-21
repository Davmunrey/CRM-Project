import type { SeedAutomationId, SeedSequenceId } from '../i18n/types'

export type WorkflowTemplateCategoryKey = 'deal_motion' | 'nurture' | 'recovery'

export type WorkflowTemplateSituationKey =
  | 'proposalFollowUp'
  | 'dealWonNotify'
  | 'negotiationReview'
  | 'coldOutreach'
  | 'winback'
  | 'dealQualification'
  | 'executiveFastTrack'
  | 'lostDealDebrief'
  | 'pipelineReviewAlert'
  | 'customerKickoffPrep'
  | 'scopeResetRecycle'
  | 'negotiationRollback'
  | 'postDemoNurture'
  | 'accountExpansion'
  | 'noShowRecovery'

export type WorkflowCatalogEntry =
  | {
      id: string
      kind: 'automation'
      category: WorkflowTemplateCategoryKey
      situation: WorkflowTemplateSituationKey
      automationSeedId: SeedAutomationId
    }
  | {
      id: string
      kind: 'sequence'
      category: WorkflowTemplateCategoryKey
      situation: WorkflowTemplateSituationKey
      sequenceSeedId: SeedSequenceId
    }

/** Curated automation + sequence templates (Phase 1: static, i18n for labels). */
export const WORKFLOW_TEMPLATE_CATALOG: WorkflowCatalogEntry[] = [
  {
    id: 'wf-auto-proposal',
    kind: 'automation',
    category: 'deal_motion',
    situation: 'proposalFollowUp',
    automationSeedId: 'auto-seed-1',
  },
  {
    id: 'wf-auto-won',
    kind: 'automation',
    category: 'deal_motion',
    situation: 'dealWonNotify',
    automationSeedId: 'auto-seed-2',
  },
  {
    id: 'wf-auto-negotiation',
    kind: 'automation',
    category: 'deal_motion',
    situation: 'negotiationReview',
    automationSeedId: 'auto-seed-3',
  },
  {
    id: 'wf-auto-qualify',
    kind: 'automation',
    category: 'deal_motion',
    situation: 'dealQualification',
    automationSeedId: 'auto-seed-4',
  },
  {
    id: 'wf-auto-fasttrack',
    kind: 'automation',
    category: 'deal_motion',
    situation: 'executiveFastTrack',
    automationSeedId: 'auto-seed-5',
  },
  {
    id: 'wf-auto-lost-debrief',
    kind: 'automation',
    category: 'recovery',
    situation: 'lostDealDebrief',
    automationSeedId: 'auto-seed-6',
  },
  {
    id: 'wf-auto-lost-alert',
    kind: 'automation',
    category: 'recovery',
    situation: 'pipelineReviewAlert',
    automationSeedId: 'auto-seed-7',
  },
  {
    id: 'wf-auto-won-kickoff',
    kind: 'automation',
    category: 'nurture',
    situation: 'customerKickoffPrep',
    automationSeedId: 'auto-seed-8',
  },
  {
    id: 'wf-auto-recycle',
    kind: 'automation',
    category: 'deal_motion',
    situation: 'scopeResetRecycle',
    automationSeedId: 'auto-seed-9',
  },
  {
    id: 'wf-auto-proposal-refresh',
    kind: 'automation',
    category: 'deal_motion',
    situation: 'negotiationRollback',
    automationSeedId: 'auto-seed-10',
  },
  {
    id: 'wf-seq-outreach',
    kind: 'sequence',
    category: 'nurture',
    situation: 'coldOutreach',
    sequenceSeedId: 'seq-001',
  },
  {
    id: 'wf-seq-reengage',
    kind: 'sequence',
    category: 'recovery',
    situation: 'winback',
    sequenceSeedId: 'seq-002',
  },
  {
    id: 'wf-seq-post-demo',
    kind: 'sequence',
    category: 'nurture',
    situation: 'postDemoNurture',
    sequenceSeedId: 'seq-003',
  },
  {
    id: 'wf-seq-expand',
    kind: 'sequence',
    category: 'nurture',
    situation: 'accountExpansion',
    sequenceSeedId: 'seq-004',
  },
  {
    id: 'wf-seq-noshow',
    kind: 'sequence',
    category: 'recovery',
    situation: 'noShowRecovery',
    sequenceSeedId: 'seq-005',
  },
]
