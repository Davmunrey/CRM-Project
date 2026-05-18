import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../lib/api'

export type OnboardingStepId = 'importContacts' | 'firstDeal' | 'firstSequence'

export interface OrgOnboardingFlags {
  importContacts: boolean
  firstDeal: boolean
  firstSequence: boolean
  homeBannerDismissedAt?: string
}

export const EMPTY_ORG_ONBOARDING: OrgOnboardingFlags = {
  importContacts: false,
  firstDeal: false,
  firstSequence: false,
}

const empty = EMPTY_ORG_ONBOARDING

interface OnboardingState {
  byOrg: Record<string, OrgOnboardingFlags>
  getFlags: (orgId: string | undefined) => OrgOnboardingFlags
  loadForOrg: (orgId: string | undefined) => Promise<void>
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

      loadForOrg: async (orgId) => {
        if (!orgId) return
        try {
          const res = await api.get<{ onboarding: Partial<OrgOnboardingFlags> }>('/preferences/me')
          if (res.onboarding && Object.keys(res.onboarding).length > 0) {
            set((s) => ({
              byOrg: { ...s.byOrg, [orgId]: { ...empty, ...s.byOrg[orgId], ...res.onboarding } },
            }))
          }
        } catch {
          // keep local data
        }
      },

      setStep(orgId, step, done) {
        if (!orgId) return
        const next = { ...empty, ...get().byOrg[orgId], [step]: done }
        set((s) => ({ byOrg: { ...s.byOrg, [orgId]: next } }))
        api.patch('/preferences/me/onboarding', next).catch(() => undefined)
      },

      dismissHomeBanner(orgId) {
        if (!orgId) return
        const now = new Date().toISOString()
        const next = { ...empty, ...get().byOrg[orgId], homeBannerDismissedAt: now }
        set((s) => ({ byOrg: { ...s.byOrg, [orgId]: next } }))
        api.patch('/preferences/me/onboarding', next).catch(() => undefined)
      },

      resetOrg(orgId) {
        if (!orgId) return
        set((s) => {
          const next = { ...s.byOrg }
          delete next[orgId]
          return { byOrg: next }
        })
        api.patch('/preferences/me/onboarding', {}).catch(() => undefined)
      },
    }),
    { name: 'crm_onboarding_v1' },
  ),
)
