import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useContactsStore } from '../store/contactsStore'
import { useCompaniesStore } from '../store/companiesStore'
import { useDealsStore } from '../store/dealsStore'
import { useActivitiesStore } from '../store/activitiesStore'
import { useNotificationsStore } from '../store/notificationsStore'
import { useGoalsStore } from '../store/goalsStore'
import { useSequencesStore } from '../store/sequencesStore'
import { useAutomationsStore } from '../store/automationsStore'
import { useTemplateStore } from '../store/templateStore'
import { useProductsStore } from '../store/productsStore'
import { useAuditStore } from '../store/auditStore'
import { useCustomFieldsStore } from '../store/customFieldsStore'
import { useLeadsStore } from '../store/leadsStore'
import { useNavigationPrefsStore } from '../store/navigationPrefsStore'
import { initRealtimeSubscriptions } from '../lib/realtimeSubscriptions'

/**
 * Fetches all core data on mount and sets up Realtime subscriptions.
 * Call this inside a component that only renders for authenticated users.
 */
export function useDataInit() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    // For !isSupabaseConfigured we still want seed data loaded
    if (!currentUser) return

    didInit.current = true

    // Kick off all fetches in parallel
    useContactsStore.getState().fetchContacts()
    useCompaniesStore.getState().fetchCompanies()
    useDealsStore.getState().fetchDeals()
    useActivitiesStore.getState().fetchActivities()
    useNotificationsStore.getState().fetchNotifications()
    useGoalsStore.getState().fetchGoals()
    useSequencesStore.getState().fetchSequences()
    useAutomationsStore.getState().fetchRules()
    useTemplateStore.getState().fetchTemplates()
    useTemplateStore.getState().fetchQuickReplies()
    useProductsStore.getState().fetchProducts()
    useAuditStore.getState().fetchEntries()
    useCustomFieldsStore.getState().fetchCustomFields()
    useLeadsStore.getState().fetchLeads()
    useNavigationPrefsStore.getState().loadPreferences()

    const cleanup = initRealtimeSubscriptions()
    const runServerMaintenance = () => {
      useLeadsStore.getState().runScheduledScoreMaintenance()
    }

    const maintenanceInterval = window.setInterval(() => {
      runServerMaintenance()
    }, 30 * 60 * 1000)
    const dealsSyncInterval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      useDealsStore.getState().fetchDeals({ silent: true })
    }, 20 * 1000)
    const handleBackOnline = () => {
      useDealsStore.getState().fetchDeals({ silent: true })
    }
    window.addEventListener('online', handleBackOnline)

    window.setTimeout(() => {
      runServerMaintenance()
    }, 15000)
    return () => {
      cleanup()
      window.clearInterval(maintenanceInterval)
      window.clearInterval(dealsSyncInterval)
      window.removeEventListener('online', handleBackOnline)
      didInit.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per auth session, guarded by didInit ref
  }, [currentUser])
}
