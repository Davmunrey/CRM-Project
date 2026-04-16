import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type OnboardingStepId = 'importContacts' | 'firstDeal' | 'firstSequence'

export interface OrgOnboardingFlags {
  importContacts: boolean
  firstDeal: boolean
  firstSequence: boolean
  homeBannerDismissedAt?: string
}

const empty: OrgOnboardingFlags = {
  importContacts: false,
  firstDeal: false,
  firstSequence: false,
}

interface OnboardingState {
  byOrg: Record<string, OrgOnboardingFlags>
  getFlags: (orgId: string | undefined) => OrgOnboardingFlags
  setStep: (orgId: string | undefined, step: OnboardingStepId, done: boolean) => void
  dismissHomeBanner: (orgId: string | undefined) => void
  resetOrg: (orgId: string | undefined) => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      byOrg: {},
      getFlags(orgId) {
        if (!orgId) return { ...empty }
        return { ...empty, ...get().byOrg[orgId] }
      },
      setStep(orgId, step, done) {
        if (!orgId) return
        set((s) => ({
          byOrg: {
            ...s.byOrg,
            [orgId]: { ...empty, ...s.byOrg[orgId], [step]: done },
          },
        }))
      },
      dismissHomeBanner(orgId) {
        if (!orgId) return
        const now = new Date().toISOString()
        set((s) => ({
          byOrg: {
            ...s.byOrg,
            [orgId]: { ...empty, ...s.byOrg[orgId], homeBannerDismissedAt: now },
          },
        }))
      },
      resetOrg(orgId) {
        if (!orgId) return
        set((s) => {
          const next = { ...s.byOrg }
          delete next[orgId]
          return { byOrg: next }
        })
      },
    }),
    { name: 'crm_onboarding_v1' },
  ),
)
