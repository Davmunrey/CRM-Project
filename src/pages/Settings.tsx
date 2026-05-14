import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Plus, Trash2, Download, Upload, RotateCcw, Tag, Mail, Wifi, WifiOff, FileSpreadsheet, SlidersHorizontal, Pencil, X, Check,
  Globe, Activity, RefreshCw, ShieldAlert, Lock, ChevronUp, ChevronDown,
} from 'lucide-react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import { useSettingsStore } from '../store/settingsStore'
import { useContactsStore } from '../store/contactsStore'
import { useCompaniesStore } from '../store/companiesStore'
import { useDealsStore } from '../store/dealsStore'
import { useActivitiesStore } from '../store/activitiesStore'
import { useEmailStore } from '../store/emailStore'
import { useCustomFieldsStore } from '../store/customFieldsStore'
import { Button } from '../components/ui/Button'
import { Checkbox } from '../components/ui/Checkbox'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Select } from '../components/ui/Select'
import { PageHeader } from '../components/ui/PageHeader'
import { Toolbar } from '../components/ui/Toolbar'
import { Tabs } from '../components/ui/Tabs'
import { ConfirmDialog } from '../components/ui/Modal'
import { Avatar } from '../components/ui/Avatar'
import { toast } from '../store/toastStore'
import { CSVImport } from '../components/import/CSVImport'
import { PermissionGate } from '../components/auth/PermissionGate'
import { useNotificationsStore, ALL_NOTIFICATION_TYPES } from '../store/notificationsStore'
import { useTranslations, useI18nStore, LANGUAGE_LABELS, LANGUAGE_FLAGS } from '../i18n'
import { disconnectGoogleIntegration } from '../services/googleIntegrationService'
import { useAuthStore } from '../store/authStore'
import { useOnboardingStore } from '../store/onboardingStore'
import { getUxActionCount, trackUxAction } from '../lib/uxMetrics'
import { useAuditStore } from '../store/auditStore'
import { useNavigationPrefsStore } from '../store/navigationPrefsStore'
import type { SidebarBuiltinItemId, SidebarCustomGroup, SidebarIconKey, SidebarSectionId } from '../types/navigation'
import { createDefaultNavigationPreferences } from '../config/navigationDefaults'
import type { Language } from '../i18n'
import type { DealCurrency, CustomFieldEntityType, CustomFieldType, PipelineStage } from '../types'
import type { Permission, UserRole } from '../types/auth'
import { ALL_PERMISSIONS } from '../utils/permissionProfiles'
import { SettingsWebhooksPanel } from '../components/settings/SettingsWebhooksPanel'
import { SettingsIntegrationsPanel } from '../components/settings/SettingsIntegrationsPanel'
import { SettingsMfaPanel } from '../components/settings/SettingsMfaPanel'
import { SettingsSsoScimPanel } from '../components/settings/SettingsSsoScimPanel'
import { SettingsSmtpPanel } from '../components/settings/SettingsSmtpPanel'
import { SettingsPipelinesPanel } from '../components/settings/SettingsPipelinesPanel'
import { SignatureRichEditor } from '../components/settings/SignatureRichEditor'
const ENTITY_TABS: CustomFieldEntityType[] = ['contact', 'company', 'deal']

const FIELD_TYPES: CustomFieldType[] = [
  'text', 'number', 'date', 'select', 'multiselect',
  'checkbox', 'url', 'email', 'currency', 'textarea',
]

type SettingsTab =
  | 'general'
  | 'onboarding'
  | 'branding'
  | 'pipeline'
  | 'pipelines'
  | 'email'
  | 'permissions'
  | 'security'
  | 'data'
  | 'navigation'
  | 'webhooks'
  | 'integrations'
  | 'advanced'

export function Settings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const t = useTranslations()
  const SETTINGS_TABS: Array<{ id: SettingsTab; label: string }> = [
    { id: 'general', label: t.settings.tabGeneral },
    { id: 'onboarding', label: t.settings.tabOnboarding },
    { id: 'branding', label: t.settings.tabBranding },
    { id: 'pipeline', label: t.settings.tabPipeline },
    { id: 'pipelines', label: t.settings.tabPipelines },
    { id: 'email', label: t.settings.tabEmail },
    { id: 'permissions', label: t.settings.tabPermissions },
    { id: 'security', label: t.settings.tabSecurity },
    { id: 'data', label: t.settings.tabData },
    { id: 'navigation', label: t.settings.tabNavigation },
    { id: 'webhooks', label: t.settings.tabWebhooks },
    { id: 'integrations', label: t.settings.tabIntegrations },
    { id: 'advanced', label: t.settings.tabAdvanced },
  ]
  const { language, setLanguage, languageMode, setLanguageMode } = useI18nStore()
  const resolvedLanguageMode = languageMode ?? 'manual'
  const { settings, updateThemePreference, updateUiDensity, updateCurrency, updateLeadSlaHours, updatePermissionProfile, updateBranding, addTag, removeTag, resetToDefaults, reorderStages, addPipelineStage, updateEmailIdentity } = useSettingsStore()
  const { disabledTypes, toggleType } = useNotificationsStore()
  const contactsStore = useContactsStore()
  const companiesStore = useCompaniesStore()
  const dealsStore = useDealsStore()
  const activitiesStore = useActivitiesStore()
  const { isGmailConnected, gmailAddress, disconnectGmail, syncState, threadsLastSyncedAt, lastSyncErrorMessage } = useEmailStore()
  const orgUsers = useAuthStore((s) => s.users)
  const organizationId = useAuthStore((s) => s.organizationId)
  const onboardingGetFlags = useOnboardingStore((s) => s.getFlags)
  const onboardingSetStep = useOnboardingStore((s) => s.setStep)
  const onboardingResetOrg = useOnboardingStore((s) => s.resetOrg)
  const onboardingFlags = onboardingGetFlags(organizationId ?? undefined)
  const navPrefs = useNavigationPrefsStore((s) => s.preferences)
  const updateNavPrefs = useNavigationPrefsStore((s) => s.updatePreferences)
  const resetNavPrefs = useNavigationPrefsStore((s) => s.resetPreferences)
  const activeTab = (searchParams.get('tab') as SettingsTab | null) ?? 'general'
  const setActiveTab = (tab: SettingsTab) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', tab)
    setSearchParams(next, { replace: true })
  }

  // ── Custom Fields state (manual subscription - persisted store) ────────────
  const [, setCfDefinitions] = useState(() => useCustomFieldsStore.getState().definitions)
  useEffect(() => useCustomFieldsStore.subscribe((s) => setCfDefinitions(s.definitions)), [])

  const [cfActiveEntity, setCfActiveEntity] = useState<CustomFieldEntityType>('contact')
  const [cfShowForm, setCfShowForm] = useState(false)
  const [cfEditingId, setCfEditingId] = useState<string | null>(null)
  const [cfDeleteId, setCfDeleteId] = useState<string | null>(null)

  // Form fields
  const [cfLabel, setCfLabel] = useState('')
  const [cfFieldType, setCfFieldType] = useState<CustomFieldType>('text')
  const [cfOptions, setCfOptions] = useState('')
  const [cfPlaceholder, setCfPlaceholder] = useState('')
  const [cfRequired, setCfRequired] = useState(false)
  const [cfIsActive, setCfIsActive] = useState(true)

  const cfEntityDefs = useCustomFieldsStore.getState().getDefinitionsForEntity(cfActiveEntity)

  const cfResetForm = () => {
    setCfLabel('')
    setCfFieldType('text')
    setCfOptions('')
    setCfPlaceholder('')
    setCfRequired(false)
    setCfIsActive(true)
    setCfEditingId(null)
    setCfShowForm(false)
  }

  const cfOpenNew = () => {
    cfResetForm()
    setCfShowForm(true)
  }

  const cfOpenEdit = (id: string) => {
    const localizedDefs = useCustomFieldsStore.getState().getDefinitionsForEntity(cfActiveEntity)
    const def = localizedDefs.find((d) => d.id === id)
    if (!def) return
    setCfLabel(def.label)
    setCfFieldType(def.fieldType)
    setCfOptions(def.options?.join('\n') ?? '')
    setCfPlaceholder(def.placeholder ?? '')
    setCfRequired(def.required)
    setCfIsActive(def.isActive)
    setCfEditingId(id)
    setCfShowForm(true)
  }

  const cfHandleSave = () => {
    const trimmedLabel = cfLabel.trim()
    if (!trimmedLabel) { toast.error(`${t.settings.fieldName} ${t.settings.required}`); return }

    const optionsArray = ['select', 'multiselect'].includes(cfFieldType)
      ? cfOptions.split('\n').map((o) => o.trim()).filter(Boolean)
      : undefined

    if (['select', 'multiselect'].includes(cfFieldType) && (!optionsArray || optionsArray.length === 0)) {
      toast.error(`${t.settings.options} ${t.settings.required}`)
      return
    }

    if (cfEditingId) {
      useCustomFieldsStore.getState().updateDefinition(cfEditingId, {
        ...(language === 'en' ? {
          label: trimmedLabel,
          options: optionsArray,
          placeholder: cfPlaceholder.trim() || undefined,
        } : {}),
        fieldType: cfFieldType,
        required: cfRequired,
        isActive: cfIsActive,
      })
      if (language !== 'en') {
        // Non-English edits update localized presentation metadata for the active locale.
        useCustomFieldsStore.getState().upsertTranslation(cfEditingId, language, {
          label: trimmedLabel,
          placeholder: cfPlaceholder.trim() || undefined,
          options: optionsArray,
        })
      }
      toast.success(t.common.save + ' ✓')
    } else {
      useCustomFieldsStore.getState().addDefinition({
        entityType: cfActiveEntity,
        label: trimmedLabel,
        fieldType: cfFieldType,
        options: optionsArray,
        placeholder: cfPlaceholder.trim() || undefined,
        required: cfRequired,
        isActive: cfIsActive,
      })
      toast.success(t.common.create + ' ✓')
    }
    cfResetForm()
  }

  const cfHandleDelete = (id: string) => {
    useCustomFieldsStore.getState().deleteDefinition(id)
    toast.success(t.common.delete + ' ✓')
    setCfDeleteId(null)
  }

  const cfToggleActive = (id: string, current: boolean) => {
    useCustomFieldsStore.getState().updateDefinition(id, { isActive: !current })
  }

  const cfToggleRequired = (id: string, current: boolean) => {
    useCustomFieldsStore.getState().updateDefinition(id, { required: !current })
  }

  // ────────────────────────────────────────────────────────────────────────────

  const [newTag, setNewTag] = useState('')
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [disconnectingGmail, setDisconnectingGmail] = useState(false)
  const [showCSVImport, setShowCSVImport] = useState(false)
  const [pipelineDraft, setPipelineDraft] = useState<PipelineStage[]>(settings.pipelineStages)
  const [rbacRole, setRbacRole] = useState<UserRole>('manager')
  const [brandingDraft, setBrandingDraft] = useState(settings.branding)

  useEffect(() => {
    setPipelineDraft(settings.pipelineStages)
  }, [settings.pipelineStages])
  useEffect(() => {
    setBrandingDraft(settings.branding)
  }, [settings.branding])
  const [maintenanceRuns] = useState<Array<{
    id: string
    status: 'running' | 'success' | 'error'
    mode: 'single_org' | 'all_orgs'
    processed: number
    error_message: string | null
    started_at: string
    finished_at: string | null
  }>>([])
  const [loadingMaintenanceRuns, setLoadingMaintenanceRuns] = useState(false)
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState<'all' | 'success' | 'running' | 'error'>('all')
  const [signatureName, setSignatureName] = useState('')
  const [signatureHtml, setSignatureHtml] = useState('')
  const [editingSignatureId, setEditingSignatureId] = useState<string | null>(null)
  const PIPELINE_STAGE_COLORS = ['#3b82f6', '#8b5cf6', '#14b8a6', '#f59e0b', '#f97316', '#ec4899']

  const connected = isGmailConnected()
  const currentUser = useAuthStore((s) => s.currentUser)
  const currentIdentity = currentUser?.id ? settings.emailIdentities?.[currentUser.id] : undefined
  const currentSignatures = currentIdentity?.signatures ?? []
  const currentDefaultSignatureId = currentIdentity?.defaultSignatureId ?? currentSignatures[0]?.id
  const usersForSettings = orgUsers.length > 0
    ? orgUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: t.team.roleLabels[user.role],
    }))
    : settings.users

  const handleAddTag = () => {
    const trimmed = newTag.trim()
    if (!trimmed) return
    if (settings.tags.includes(trimmed)) {
      toast.error(t.errors.duplicateTag)
      return
    }
    addTag(trimmed)
    setNewTag('')
    toast.success(t.common.add + ' ✓')
  }

  const handlePipelineStageChange = (stageId: string, patch: Partial<PipelineStage>) => {
    setPipelineDraft((prev) => prev.map((stage) => (stage.id === stageId ? { ...stage, ...patch } : stage)))
  }

  const handlePipelineDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const from = result.source.index
    const to = result.destination.index
    if (from === to) return
    setPipelineDraft((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next.map((stage, index) => ({ ...stage, order: index }))
    })
  }

  const handleAddPipelineStage = () => {
    const nextIndex = settings.pipelineStages.length + 1
    const id = `stage_${Date.now().toString(36)}`
    const color = PIPELINE_STAGE_COLORS[settings.pipelineStages.length % PIPELINE_STAGE_COLORS.length]
    const stageName = `${t.deals.stage} ${nextIndex}`
    const newStage: PipelineStage = {
      id,
      name: stageName,
      color,
      order: settings.pipelineStages.length,
      probability: 40,
    }
    addPipelineStage(newStage)
    setPipelineDraft((prev) => [...prev, newStage])
    toast.success(t.common.create + ' ✓')
  }

  const PIPELINE_STAGE_DELETE_BLOCKED = new Set(['closed_won', 'closed_lost'])

  const handleRemovePipelineStage = (stageId: string) => {
    if (PIPELINE_STAGE_DELETE_BLOCKED.has(stageId)) {
      toast.error(t.settings.pipelineStageProtected)
      return
    }
    const sorted = [...pipelineDraft].sort((a, b) => a.order - b.order)
    const index = sorted.findIndex((s) => s.id === stageId)
    if (index === -1) return
    const fallback = sorted[index - 1]?.id ?? sorted[index + 1]?.id
    if (!fallback) {
      toast.error(t.errors.generic)
      return
    }
    const { deals, updateDeal } = useDealsStore.getState()
    for (const d of deals) {
      if (d.stage === stageId) updateDeal(d.id, { stage: fallback })
    }
    const nextStages = sorted.filter((s) => s.id !== stageId).map((s, i) => ({ ...s, order: i }))
    setPipelineDraft(nextStages)
    reorderStages(nextStages)
    toast.success(t.common.delete + ' ✓')
  }

  const handleSavePipelineConfig = () => {
    const normalized = pipelineDraft.map((stage, index) => ({
      ...stage,
      name: stage.name.trim() || settings.pipelineStages[index]?.name || stage.id,
      probability: Math.max(0, Math.min(100, Number.isFinite(stage.probability) ? stage.probability : 0)),
      order: index,
    }))
    reorderStages(normalized)
    toast.success(t.common.save + ' ✓')
  }

  const rolePermissions = settings.permissionProfiles?.[rbacRole] ?? []
  const permissionGroups = useMemo(() => {
    const preferredOrder = ['contacts', 'companies', 'deals', 'activities', 'email', 'reports', 'templates', 'sequences', 'products', 'automations', 'goals', 'users', 'custom_fields', 'settings', 'audit', 'import', 'ai']
    const grouped = new Map<string, Permission[]>()
    for (const permission of ALL_PERMISSIONS) {
      const [resource] = permission.split(':')
      const list = grouped.get(resource) ?? []
      list.push(permission)
      grouped.set(resource, list)
    }
    const labels: Record<string, string> = {
      contacts: t.nav.contacts,
      companies: t.nav.companies,
      deals: t.nav.deals,
      activities: t.nav.activities,
      email: t.nav.inbox,
      reports: t.nav.reports,
      templates: t.nav.templates,
      sequences: t.nav.sequences,
      products: t.nav.products,
      automations: t.nav.automations,
      goals: t.nav.goals,
      users: t.settings.users,
      custom_fields: t.settings.customFields,
      settings: t.nav.settings,
      audit: t.nav.audit,
      import: t.settings.importExport,
      ai: t.nav.aiAssistant,
    }
    return Array.from(grouped.entries())
      .sort((a, b) => {
        const ai = preferredOrder.indexOf(a[0])
        const bi = preferredOrder.indexOf(b[0])
        if (ai === -1 && bi === -1) return a[0].localeCompare(b[0])
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      })
      .map(([resource, permissions]) => ({
        resource,
        label: labels[resource] ?? resource.replace('_', ' '),
        permissions,
      }))
  }, [t])

  const handleTogglePermission = (permission: Permission) => {
    const current = settings.permissionProfiles?.[rbacRole] ?? []
    const next = current.includes(permission)
      ? current.filter((p) => p !== permission)
      : [...current, permission]
    updatePermissionProfile(rbacRole, next)
    useAuditStore.getState().logAction(
      'permission_profile_updated',
      'settings',
      `permission-profile-${rbacRole}`,
      rbacRole,
      `${rbacRole} permissions updated (${next.length} grants)`
    )
    toast.success(t.settings.permissionsUpdated)
  }

  const handleSaveBranding = () => {
    updateBranding({
      appName: brandingDraft.appName.trim() || t.brand.defaultAppName,
      primaryColor: brandingDraft.primaryColor || '#7c3aed',
      logoUrl: brandingDraft.logoUrl?.trim() || undefined,
      customDomain: brandingDraft.customDomain?.trim() || undefined,
      privacyUrl: brandingDraft.privacyUrl?.trim() || undefined,
      termsUrl: brandingDraft.termsUrl?.trim() || undefined,
      legalName: brandingDraft.legalName?.trim() || undefined,
      taxId: brandingDraft.taxId?.trim() || undefined,
      addressLine1: brandingDraft.addressLine1?.trim() || undefined,
      postalCode: brandingDraft.postalCode?.trim() || undefined,
      city: brandingDraft.city?.trim() || undefined,
      country: brandingDraft.country?.trim() || undefined,
      billingEmail: brandingDraft.billingEmail?.trim() || undefined,
      billingPhone: brandingDraft.billingPhone?.trim() || undefined,
      quoteFooter: brandingDraft.quoteFooter?.trim() || undefined,
    })
    toast.success(t.common.save + ' ✓')
  }

  const handleSaveSignature = () => {
    if (!currentUser?.id) {
      toast.error(t.errors.generic)
      return
    }
    const sigId = useSettingsStore.getState().upsertEmailSignature(currentUser.id, {
      id: editingSignatureId ?? undefined,
      name: signatureName.trim() || 'Signature',
      html: signatureHtml.trim(),
    })
    if (!currentDefaultSignatureId) {
      useSettingsStore.getState().setDefaultEmailSignature(currentUser.id, sigId)
    }
    setSignatureName('')
    setSignatureHtml('')
    setEditingSignatureId(null)
    toast.success(t.settings.signatureSaved)
  }

  const handleResetBranding = () => {
    setBrandingDraft({ appName: t.brand.defaultAppName, primaryColor: '#4f46e5' })
    updateBranding({
      appName: t.brand.defaultAppName,
      primaryColor: '#4f46e5',
      logoUrl: undefined,
      customDomain: undefined,
      privacyUrl: undefined,
      termsUrl: undefined,
      legalName: undefined,
      taxId: undefined,
      addressLine1: undefined,
      postalCode: undefined,
      city: undefined,
      country: undefined,
      billingEmail: undefined,
      billingPhone: undefined,
      quoteFooter: undefined,
    })
    toast.success(t.settings.resetBranding)
  }

  const handleExportJSON = () => {
    const data = {
      contacts: contactsStore.contacts,
      companies: companiesStore.companies,
      deals: dealsStore.deals,
      activities: activitiesStore.activities,
      settings,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `crm-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(t.settings.exportData + ' ✓')
  }

  const handleImportJSON = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string) as {
            contacts?: Parameters<typeof contactsStore.addContact>[0][]
            companies?: Parameters<typeof companiesStore.addCompany>[0][]
            deals?: Parameters<typeof dealsStore.addDeal>[0][]
            activities?: Parameters<typeof activitiesStore.addActivity>[0][]
          }
          if (data.contacts) {
            contactsStore.bulkDelete(contactsStore.contacts.map((c) => c.id))
            data.contacts.forEach((c) => contactsStore.addContact(c))
          }
          if (data.companies) {
            companiesStore.companies.forEach((c) => companiesStore.deleteCompany(c.id))
            data.companies.forEach((c) => companiesStore.addCompany(c))
          }
          if (data.deals) {
            dealsStore.deals.forEach((d) => dealsStore.deleteDeal(d.id))
            data.deals.forEach((d) => dealsStore.addDeal(d))
          }
          if (data.activities) {
            activitiesStore.activities.forEach((a) => activitiesStore.deleteActivity(a.id))
            data.activities.forEach((a) => activitiesStore.addActivity(a))
          }
          toast.success(t.settings.importData + ' ✓')
        } catch {
          toast.error(t.errors.generic)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleDisconnectGmail = async () => {
    setDisconnectingGmail(true)
    try {
      await disconnectGoogleIntegration()
      disconnectGmail()
      toast.success(t.settings.gmailDisconnected)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.errors.gmailConnectionError)
    } finally {
      setDisconnectingGmail(false)
    }
  }

  const handleReset = () => {
    contactsStore.bulkDelete(contactsStore.contacts.map((c) => c.id))
    companiesStore.companies.forEach((c) => companiesStore.deleteCompany(c.id))
    dealsStore.deals.forEach((d) => dealsStore.deleteDeal(d.id))
    activitiesStore.activities.forEach((a) => activitiesStore.deleteActivity(a.id))
    resetToDefaults()
    toast.success(t.settings.resetData + ' ✓')
  }

  const loadMaintenanceRuns = async () => {
    // lead_score_maintenance_runs is not available in velo-api
    setLoadingMaintenanceRuns(false)
  }

  useEffect(() => {
    loadMaintenanceRuns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const lastSuccessRun = maintenanceRuns.find((run) => run.status === 'success')
  const lastSuccessAt = lastSuccessRun?.finished_at ?? lastSuccessRun?.started_at
  const staleSlaHours = 8
  const staleSlaMs = staleSlaHours * 60 * 60 * 1000
  const isSlaBreached = !lastSuccessAt || Date.now() - new Date(lastSuccessAt).getTime() > staleSlaMs
  const recentErrors = maintenanceRuns.filter((run) => run.status === 'error').slice(0, 3)
  const visibleMaintenanceRuns = maintenanceStatusFilter === 'all'
    ? maintenanceRuns
    : maintenanceRuns.filter((run) => run.status === maintenanceStatusFilter)

  const formatAgo = (iso?: string | null) => {
    if (!iso) return t.settings.leadOpsNotAvailable
    const diffMs = Date.now() - new Date(iso).getTime()
    if (diffMs < 60_000) return t.settings.leadOpsJustNow
    const mins = Math.floor(diffMs / 60_000)
    if (mins < 60) return `${mins}${t.settings.leadOpsMinsAgo}`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}${t.settings.leadOpsHoursAgo}`
    const days = Math.floor(hours / 24)
    return `${days}${t.settings.leadOpsDaysAgo}`
  }

  const tabVisible = (...tabs: SettingsTab[]) => tabs.includes(activeTab)
  const authLoginAttempts = getUxActionCount('auth_login_attempt')
  const authLoginSuccesses = getUxActionCount('auth_login_success')
  const orgSetupAttempts = getUxActionCount('onboarding_org_setup_submit_attempt')
  const orgSetupSuccesses = getUxActionCount('onboarding_org_setup_submit_success')
  const resetCompleteAttempts = getUxActionCount('auth_password_reset_complete_attempt')
  const resetCompleteSuccesses = getUxActionCount('auth_password_reset_complete_success')

  const pct = (ok: number, total: number) => (total > 0 ? Math.round((ok / total) * 100) : 0)
  const loginRate = pct(authLoginSuccesses, authLoginAttempts)
  const orgSetupRate = pct(orgSetupSuccesses, orgSetupAttempts)
  const resetRate = pct(resetCompleteSuccesses, resetCompleteAttempts)

  const activationInputs = [authLoginAttempts, orgSetupAttempts, resetCompleteAttempts]
  const activationCompletions = [authLoginSuccesses, orgSetupSuccesses, resetCompleteSuccesses]
  const totalAttempts = activationInputs.reduce((sum, item) => sum + item, 0)
  const totalSuccesses = activationCompletions.reduce((sum, item) => sum + item, 0)
  const activationHealth = pct(totalSuccesses, totalAttempts)

  const sectionOptions: Array<{ id: SidebarSectionId; label: string }> = [
    { id: 'main', label: t.navSections.main },
    { id: 'sales', label: t.navSections.sales },
    { id: 'comms', label: t.navSections.comms },
    { id: 'config', label: t.navSections.config },
  ]

  const ICON_OPTIONS: SidebarIconKey[] = ['bookmark', 'flame', 'handshake', 'cloud', 'trending-up', 'settings', 'workflow', 'bar-chart-3']

  const moveSection = (sectionId: SidebarSectionId, direction: -1 | 1) => {
    void updateNavPrefs((current) => {
      const idx = current.sectionOrder.indexOf(sectionId)
      if (idx < 0) return current
      const nextIndex = idx + direction
      if (nextIndex < 0 || nextIndex >= current.sectionOrder.length) return current
      const nextOrder = [...current.sectionOrder]
      const [moved] = nextOrder.splice(idx, 1)
      nextOrder.splice(nextIndex, 0, moved)
      return { ...current, sectionOrder: nextOrder }
    })
  }

  const moveBuiltinItem = (section: SidebarSectionId, itemId: SidebarBuiltinItemId, direction: -1 | 1) => {
    void updateNavPrefs((current) => {
      const source = current.itemOrderBySection[section]
      const idx = source.indexOf(itemId)
      if (idx < 0) return current
      const nextIndex = idx + direction
      if (nextIndex < 0 || nextIndex >= source.length) return current
      const nextOrder = [...source]
      const [moved] = nextOrder.splice(idx, 1)
      nextOrder.splice(nextIndex, 0, moved)
      return {
        ...current,
        itemOrderBySection: { ...current.itemOrderBySection, [section]: nextOrder },
      }
    })
  }

  const addCustomGroup = () => {
    void updateNavPrefs((current) => {
      const group: SidebarCustomGroup = {
        id: `grp-${Date.now().toString(36)}`,
        label: t.settings.navNewGroup,
        iconKey: 'bookmark',
        order: current.customGroups.length,
        items: [],
      }
      return { ...current, customGroups: [...current.customGroups, group] }
    })
  }

  const activeTabLabel = SETTINGS_TABS.find((tab) => tab.id === activeTab)?.label ?? t.settings.title
  /** Inner cards / rows - same surface as permission groups & list pages */
  const innerSurface = 'rounded-xl border border-border-subtle bg-surface-1'

  return (
    <div className="crm-page space-y-5">
      <PageHeader
        showTitle={false}
        title={t.nav.settings}
        subtitle={activeTabLabel}
      />
      <Toolbar panel>
        <Tabs
          tabs={SETTINGS_TABS.map((tab) => ({ id: tab.id, label: tab.label }))}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as SettingsTab)}
          className="min-w-0"
        />
      </Toolbar>

      <section className={`crm-surface-section p-6 ${tabVisible('onboarding') ? '' : 'hidden'}`}>
        <h2 className="text-base font-semibold text-fg mb-1">{t.settings.onboardingTitle}</h2>
        <p className="text-xs text-fg-subtle mb-4">{t.settings.onboardingIntro}</p>
        <ul className="space-y-4">
          <li className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 ${innerSurface}`}>
            <div>
              <p className="text-sm font-medium text-fg">{t.settings.onboardingStepImport}</p>
              <Link to="/contacts" className="text-xs text-accent-400 hover:underline mt-1 inline-block">
                {t.settings.onboardingGoContacts}
              </Link>
            </div>
            <Button
              type="button"
              size="sm"
              variant={onboardingFlags.importContacts ? 'secondary' : 'primary'}
              onClick={() => {
                const next = !onboardingFlags.importContacts
                onboardingSetStep(organizationId ?? undefined, 'importContacts', next)
                trackUxAction('onboarding_checklist_toggle', { step: 'importContacts', done: next })
              }}
            >
              {onboardingFlags.importContacts ? t.settings.onboardingMarkTodo : t.settings.onboardingMarkDone}
            </Button>
          </li>
          <li className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 ${innerSurface}`}>
            <div>
              <p className="text-sm font-medium text-fg">{t.settings.onboardingStepDeal}</p>
              <Link to="/deals" className="text-xs text-accent-400 hover:underline mt-1 inline-block">
                {t.settings.onboardingGoDeals}
              </Link>
            </div>
            <Button
              type="button"
              size="sm"
              variant={onboardingFlags.firstDeal ? 'secondary' : 'primary'}
              onClick={() => {
                const next = !onboardingFlags.firstDeal
                onboardingSetStep(organizationId ?? undefined, 'firstDeal', next)
                trackUxAction('onboarding_checklist_toggle', { step: 'firstDeal', done: next })
              }}
            >
              {onboardingFlags.firstDeal ? t.settings.onboardingMarkTodo : t.settings.onboardingMarkDone}
            </Button>
          </li>
          <li className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 ${innerSurface}`}>
            <div>
              <p className="text-sm font-medium text-fg">{t.settings.onboardingStepSequence}</p>
              <Link to="/sequences" className="text-xs text-accent-400 hover:underline mt-1 inline-block">
                {t.settings.onboardingGoSequences}
              </Link>
            </div>
            <Button
              type="button"
              size="sm"
              variant={onboardingFlags.firstSequence ? 'secondary' : 'primary'}
              onClick={() => {
                const next = !onboardingFlags.firstSequence
                onboardingSetStep(organizationId ?? undefined, 'firstSequence', next)
                trackUxAction('onboarding_checklist_toggle', { step: 'firstSequence', done: next })
              }}
            >
              {onboardingFlags.firstSequence ? t.settings.onboardingMarkTodo : t.settings.onboardingMarkDone}
            </Button>
          </li>
        </ul>
        <div className="mt-4">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              onboardingResetOrg(organizationId ?? undefined)
              trackUxAction('onboarding_checklist_reset', {})
            }}
          >
            {t.settings.onboardingReset}
          </Button>
        </div>
        <div className={`mt-5 p-4 ${innerSurface}`}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-semibold text-fg">{t.settings.activationFunnelTitle}</p>
              <p className="text-xs text-fg-subtle">{t.settings.activationFunnelSubtitle}</p>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded-full border ${
                activationHealth >= 80
                  ? 'bg-success/15 text-success border-success/30'
                  : activationHealth >= 60
                    ? 'bg-warning/15 text-warning border-warning/30'
                    : 'bg-danger/15 text-danger border-danger/30'
              }`}
            >
              {t.settings.activationHealthLabel}: {activationHealth}%
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className={`${innerSurface} p-3`}>
              <p className="text-xs text-fg-subtle mb-1">{t.settings.activationLoginLabel}</p>
              <p className="text-sm text-fg">
                {authLoginSuccesses}/{authLoginAttempts} - {loginRate}%
              </p>
            </div>
            <div className={`${innerSurface} p-3`}>
              <p className="text-xs text-fg-subtle mb-1">{t.settings.activationOrgSetupLabel}</p>
              <p className="text-sm text-fg">
                {orgSetupSuccesses}/{orgSetupAttempts} - {orgSetupRate}%
              </p>
            </div>
            <div className={`${innerSurface} p-3`}>
              <p className="text-xs text-fg-subtle mb-1">{t.settings.activationResetLabel}</p>
              <p className="text-sm text-fg">
                {resetCompleteSuccesses}/{resetCompleteAttempts} - {resetRate}%
              </p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-fg-subtle">{t.settings.activationFunnelHint}</p>
        </div>
      </section>

      {/* ── Language Selector ──────────────────────────────────────────── */}
      <section className={`crm-surface-section p-6 ${tabVisible('general') ? '' : 'hidden'}`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-info/20 flex items-center justify-center">
            <Globe size={14} className="text-info" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-fg">{t.settings.language}</h2>
            <p className="text-xs text-fg-subtle">{t.settings.general}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 md:gap-3">
          {(['en', 'es', 'pt', 'fr', 'de', 'it'] as Language[]).map((lang) => (
            <button
              type="button"
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`focus-ring inline-flex shrink-0 items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-colors ${
                language === lang
                  ? 'bg-accent-500/20 text-accent-400 border-accent-500/30'
                  : 'bg-fg/5 text-fg-muted border-fg/8 hover:bg-fg/8 hover:text-fg'
              }`}
            >
              <span className="text-base leading-none">{LANGUAGE_FLAGS[lang]}</span>
              <span>{LANGUAGE_LABELS[lang]}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-2">
          <p className="text-xs font-medium text-fg-muted">{t.settings.languageModeHelp}</p>
          <Tabs
            tabs={[
              { id: 'browser', label: t.settings.languageModeBrowser },
              { id: 'manual', label: t.settings.languageModeManual },
            ]}
            activeId={resolvedLanguageMode}
            onChange={(id) => setLanguageMode(id as 'browser' | 'manual')}
          />
        </div>

        <div className="mt-4 max-w-xs space-y-4">
          <Select
            label={t.settings.theme}
            value={settings.themePreference}
            onChange={(e) => updateThemePreference(e.target.value as 'system' | 'light' | 'dark')}
            options={[
              { value: 'system', label: t.settings.themeSystem },
              { value: 'light', label: t.settings.themeLight },
              { value: 'dark', label: t.settings.themeDark },
            ]}
          />
          <Select
            label={t.settings.uiDensity}
            value={settings.uiDensity}
            onChange={(e) => updateUiDensity(e.target.value as 'comfortable' | 'compact')}
            options={[
              { value: 'comfortable', label: t.settings.uiDensityComfortable },
              { value: 'compact', label: t.settings.uiDensityCompact },
            ]}
            hint={t.settings.uiDensityHelp}
          />
        </div>
      </section>

      <section className={`crm-surface-section p-6 ${tabVisible('email') ? '' : 'hidden'}`}>
        <h2 className="text-base font-semibold text-fg mb-3">{t.settings.emailProviderHealth}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className={`${innerSurface} p-3`}>
            <p className="text-xs text-fg-subtle mb-1">{t.settings.emailSyncState}</p>
            <p className="text-sm text-fg">{syncState}</p>
          </div>
          <div className={`${innerSurface} p-3`}>
            <p className="text-xs text-fg-subtle mb-1">{t.settings.emailLastSync}</p>
            <p className="text-sm text-fg">{threadsLastSyncedAt ? formatAgo(threadsLastSyncedAt) : t.settings.leadOpsNotAvailable}</p>
          </div>
          <div className={`${innerSurface} p-3`}>
            <p className="text-xs text-fg-subtle mb-1">{t.settings.emailLastError}</p>
            <p className="text-sm text-fg">{lastSyncErrorMessage ?? t.settings.leadOpsNotAvailable}</p>
          </div>
        </div>
      </section>

      {/* ── Gmail Configuration ──────────────────────────────────────────── */}
      <section className={`crm-surface-section p-6 ${tabVisible('email') ? '' : 'hidden'}`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-danger/20 flex items-center justify-center">
            <Mail size={14} className="text-danger" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-fg">{t.settings.gmailIntegration}</h2>
            <p className="text-xs text-fg-subtle">{t.email.gmailApiLabel}</p>
          </div>
        </div>

        {connected ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-success/10 border border-success/20">
              <div className="flex items-center gap-2">
                <Wifi size={14} className="text-success" />
                <div>
                  <p className="text-sm font-medium text-fg">{gmailAddress ?? t.settings.gmailConnected}</p>
                  <p className="text-xs text-success">{t.settings.gmailConnectionActive}</p>
                </div>
              </div>
              <Button variant="danger" size="sm" loading={disconnectingGmail} leftIcon={disconnectingGmail ? undefined : <WifiOff size={12} />} onClick={handleDisconnectGmail}>
                {t.settings.disconnect}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-w-lg">
            <p className="text-sm text-fg">{t.settings.gmailConnectViaIntegrations}</p>
            <Link
              to="/settings/integrations"
              className="inline-flex items-center justify-center gap-1.5 btn-gradient text-fg font-semibold px-3.5 py-1.5 text-sm rounded-full min-h-control"
            >
              <Mail size={14} className="shrink-0" aria-hidden />
              {t.settings.gmailOpenIntegrations}
            </Link>
          </div>
        )}
      </section>

      {/* ── BYO-SMTP Configuration ───────────────────────────────────────── */}
      <section className={`crm-surface-section p-6 ${tabVisible('email') ? '' : 'hidden'}`}>
        <SettingsSmtpPanel />
      </section>

      <section className={`crm-surface-section p-6 ${tabVisible('email') ? '' : 'hidden'}`}>
        <h2 className="text-base font-semibold text-fg mb-3">{t.settings.emailSignatures}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="space-y-2 max-w-xl">
              <Select
                label={t.settings.composerSignatureDefaultLabel}
                value={currentIdentity?.composerSignatureDefault ?? 'include_default'}
                onChange={(e) => {
                  if (!currentUser?.id) return
                  const v = e.target.value === 'none_by_default' ? 'none_by_default' : 'include_default'
                  updateEmailIdentity(currentUser.id, { composerSignatureDefault: v })
                }}
                options={[
                  { value: 'include_default', label: t.settings.composerSignatureDefaultAutomatic },
                  { value: 'none_by_default', label: t.settings.composerSignatureDefaultManual },
                ]}
                disabled={!currentUser?.id}
              />
              <p className="text-[11px] text-fg-subtle leading-relaxed">{t.settings.composerSignatureDefaultHelp}</p>
            </div>
            <Input
              label={t.settings.signatureName}
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder={t.settings.signatureNamePlaceholder}
            />
            <SignatureRichEditor
              id="settings-email-signature"
              label={t.settings.signatureHtml}
              placeholder={t.settings.placeholderEmailSignatureHtml}
              value={signatureHtml}
              onChange={setSignatureHtml}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveSignature}>{editingSignatureId ? t.common.save : t.common.create}</Button>
              {editingSignatureId && <Button size="sm" variant="ghost" onClick={() => { setEditingSignatureId(null); setSignatureName(''); setSignatureHtml('') }}>{t.common.cancel}</Button>}
            </div>
          </div>
          <div className="space-y-2">
            {currentSignatures.length === 0 && (
              <p className="text-xs text-fg-subtle">{t.common.noResults}</p>
            )}
            {currentSignatures.map((sig) => (
              <div key={sig.id} className={`${innerSurface} p-3`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-sm text-fg font-medium">{sig.name}</div>
                  {sig.id === currentDefaultSignatureId ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-500/15 border border-accent-500/30 text-accent-300">{t.settings.signatureDefault}</span>
                  ) : (
                    <Button
                      type="button"
                      size="xs"
                      variant="secondary"
                      onClick={() => currentUser?.id && useSettingsStore.getState().setDefaultEmailSignature(currentUser.id, sig.id)}
                    >
                      {t.settings.signatureSetDefault}
                    </Button>
                  )}
                </div>
                <div className="text-xs text-fg-muted mb-2 line-clamp-2">{sig.html.replace(/<[^>]+>/g, ' ')}</div>
                <div className="flex gap-2">
                  <Button size="xs" variant="secondary" onClick={() => { setEditingSignatureId(sig.id); setSignatureName(sig.name); setSignatureHtml(sig.html) }}>{t.common.edit}</Button>
                  <Button size="xs" variant="ghost" onClick={() => {
                    if (!currentUser?.id) return
                    useSettingsStore.getState().deleteEmailSignature(currentUser.id, sig.id)
                    toast.success(t.settings.signatureDeleted)
                  }}>{t.common.delete}</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Custom Fields ────────────────────────────────────────────────────── */}
      <section className={`crm-surface-section p-6 ${tabVisible('data') ? '' : 'hidden'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent-500/20 flex items-center justify-center">
              <SlidersHorizontal size={14} className="text-accent-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-fg">{t.settings.customFields}</h2>
              <p className="text-xs text-fg-subtle">{t.settings.entityLabels.contact}, {t.settings.entityLabels.company}, {t.settings.entityLabels.deal}</p>
            </div>
          </div>
          <PermissionGate permission="custom_fields:update">
            <Button size="sm" leftIcon={<Plus size={13} />} onClick={cfOpenNew}>
              {t.common.add}
            </Button>
          </PermissionGate>
        </div>

        <div className="mb-4">
          <Tabs
            tabs={ENTITY_TABS.map((et) => ({ id: et, label: t.settings.entityLabels[et] }))}
            activeId={cfActiveEntity}
            onChange={(id) => {
              setCfActiveEntity(id as CustomFieldEntityType)
              cfResetForm()
            }}
            className="w-full min-w-0 [&>div]:w-full [&>div]:flex-wrap"
          />
        </div>

        {/* Inline add / edit form */}
        {cfShowForm && (
          <div className="mb-4 p-4 rounded-xl border border-border-subtle bg-surface-2 space-y-3">
            <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide">
              {cfEditingId ? `${t.common.edit}` : `${t.common.add} - ${t.settings.entityLabels[cfActiveEntity]}`}
            </p>

            {/* Label + type row */}
            <div className="flex gap-3">
              <div className="flex-1 min-w-0">
                <Input
                  label={t.settings.fieldName}
                  value={cfLabel}
                  onChange={(e) => setCfLabel(e.target.value)}
                  placeholder={t.settings.fieldPlaceholderHint}
                />
              </div>
              <div className="w-44 min-w-0">
                <Select
                  label={t.settings.fieldType}
                  value={cfFieldType}
                  onChange={(e) => setCfFieldType(e.target.value as CustomFieldType)}
                  options={FIELD_TYPES.map((ft) => ({ value: ft, label: t.settings.fieldTypeLabels[ft] }))}
                  listMaxHeightClass="max-h-56"
                />
              </div>
            </div>

            {/* Options - only for select / multiselect */}
            {['select', 'multiselect'].includes(cfFieldType) && (
              <Textarea
                label={t.settings.options}
                value={cfOptions}
                onChange={(e) => setCfOptions(e.target.value)}
                placeholder={t.settings.optionsPlaceholder}
                rows={4}
              />
            )}

            {/* Placeholder */}
            {!['checkbox', 'date'].includes(cfFieldType) && (
              <Input
                label={t.settings.placeholder}
                value={cfPlaceholder}
                onChange={(e) => setCfPlaceholder(e.target.value)}
                placeholder={t.settings.valuePlaceholderHint}
              />
            )}

            {/* Toggles row */}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="xs"
                variant={cfRequired ? 'secondary' : 'ghost'}
                onClick={() => setCfRequired((v) => !v)}
                leftIcon={<span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfRequired ? 'bg-warning' : 'bg-fg-subtle'}`} aria-hidden />}
              >
                {t.settings.required}
              </Button>
              <Button
                type="button"
                size="xs"
                variant={cfIsActive ? 'secondary' : 'ghost'}
                onClick={() => setCfIsActive((v) => !v)}
                leftIcon={<span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfIsActive ? 'bg-success' : 'bg-fg-subtle'}`} aria-hidden />}
              >
                {t.common.active}
              </Button>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <Button size="sm" leftIcon={<Check size={13} />} onClick={cfHandleSave}>
                {cfEditingId ? t.common.save : t.common.create}
              </Button>
              <Button size="sm" variant="secondary" leftIcon={<X size={13} />} onClick={cfResetForm}>
                {t.common.cancel}
              </Button>
            </div>
          </div>
        )}

        {/* Field list */}
        {cfEntityDefs.length === 0 ? (
          <p className="text-sm text-fg-subtle text-center py-6">
            {t.settings.customFields} - {t.settings.entityLabels[cfActiveEntity]}
          </p>
        ) : (
          <div className="space-y-2">
            {cfEntityDefs.map((def) => (
              <div
                key={def.id}
                className={`flex items-center gap-3 p-3 ${innerSurface}`}
              >
                {/* Type badge */}
                <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent-500/15 text-accent-300 border border-accent-500/20 uppercase tracking-wide">
                  {t.settings.fieldTypeLabels[def.fieldType]}
                </span>

                {/* Label */}
                <span className="flex-1 text-sm text-fg truncate">{def.label}</span>

                {/* Required toggle */}
                <button type="button"
                  onClick={() => cfToggleRequired(def.id, def.required)}
                  title={def.required ? t.settings.requiredToggleOn : t.settings.requiredToggleOff}
                  className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                    def.required
                      ? 'bg-warning/15 border-warning/25 text-warning'
                      : 'bg-fg/5 border-fg/8 text-fg-subtle hover:text-fg-muted'
                  }`}
                >
                  {def.required ? t.settings.required : '-'}
                </button>

                {/* Active toggle */}
                <button type="button"
                  onClick={() => cfToggleActive(def.id, def.isActive)}
                  title={def.isActive ? t.settings.activeToggleOn : t.settings.activeToggleOff}
                  className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                    def.isActive
                      ? 'bg-success/15 border-success/25 text-success'
                      : 'bg-fg/5 border-fg/8 text-fg-subtle hover:text-fg-muted'
                  }`}
                >
                  {def.isActive ? t.common.active : t.common.inactive}
                </button>

                {/* Edit / Delete - gated */}
                <PermissionGate permission="custom_fields:update">
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={() => cfOpenEdit(def.id)}
                    title={t.settings.editField}
                    aria-label={t.settings.editField}
                    className="shrink-0 px-2"
                  >
                    <Pencil size={13} />
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={() => setCfDeleteId(def.id)}
                    title={t.settings.deleteField}
                    aria-label={t.settings.deleteField}
                    className="shrink-0 px-2 text-fg-subtle hover:text-danger"
                  >
                    <Trash2 size={13} />
                  </Button>
                </PermissionGate>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Currency */}
      <section className={`crm-surface-section p-6 ${tabVisible('general') ? '' : 'hidden'}`}>
        <h2 className="text-base font-semibold text-fg mb-4">{t.settings.currency}</h2>
        <Select
          label={t.settings.currency}
          options={[
            { value: 'EUR', label: t.settings.currencyLabels.eur },
            { value: 'USD', label: t.settings.currencyLabels.usd },
            { value: 'GBP', label: t.settings.currencyLabels.gbp },
          ]}
          value={settings.currency}
          onChange={(e) => updateCurrency(e.target.value as DealCurrency)}
          className="max-w-xs"
        />
      </section>

      {/* Branding */}
      <section className={`crm-surface-section p-6 ${tabVisible('branding') ? '' : 'hidden'}`}>
        <h2 className="text-base font-semibold text-fg mb-4">{t.settings.branding}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label={t.settings.appName}
            value={brandingDraft.appName}
            onChange={(e) => setBrandingDraft((prev) => ({ ...prev, appName: e.target.value }))}
          />
          <Input
            label={t.settings.primaryColor}
            type="color"
            value={brandingDraft.primaryColor}
            onChange={(e) => setBrandingDraft((prev) => ({ ...prev, primaryColor: e.target.value }))}
          />
          <Input
            label={t.settings.logoUrl}
            value={brandingDraft.logoUrl ?? ''}
            onChange={(e) => setBrandingDraft((prev) => ({ ...prev, logoUrl: e.target.value }))}
          />
          <Input
            label={t.settings.customDomain}
            value={brandingDraft.customDomain ?? ''}
            onChange={(e) => setBrandingDraft((prev) => ({ ...prev, customDomain: e.target.value }))}
            placeholder={t.settings.placeholderBrandingDomain}
          />
          <Input
            label={t.settings.privacyUrl}
            value={brandingDraft.privacyUrl ?? ''}
            onChange={(e) => setBrandingDraft((prev) => ({ ...prev, privacyUrl: e.target.value }))}
            placeholder={t.settings.placeholderPrivacyPolicyUrl}
          />
          <Input
            label={t.settings.termsUrl}
            value={brandingDraft.termsUrl ?? ''}
            onChange={(e) => setBrandingDraft((prev) => ({ ...prev, termsUrl: e.target.value }))}
            placeholder={t.settings.placeholderTermsUrl}
          />
          <Input
            label={t.settings.legalCompanyName}
            value={brandingDraft.legalName ?? ''}
            onChange={(e) => setBrandingDraft((prev) => ({ ...prev, legalName: e.target.value }))}
          />
          <Input
            label={t.settings.taxIdVat}
            value={brandingDraft.taxId ?? ''}
            onChange={(e) => setBrandingDraft((prev) => ({ ...prev, taxId: e.target.value }))}
          />
          <Input
            label={t.settings.addressLine1}
            value={brandingDraft.addressLine1 ?? ''}
            onChange={(e) => setBrandingDraft((prev) => ({ ...prev, addressLine1: e.target.value }))}
          />
          <Input
            label={t.settings.postalCode}
            value={brandingDraft.postalCode ?? ''}
            onChange={(e) => setBrandingDraft((prev) => ({ ...prev, postalCode: e.target.value }))}
          />
          <Input
            label={t.companies.city}
            value={brandingDraft.city ?? ''}
            onChange={(e) => setBrandingDraft((prev) => ({ ...prev, city: e.target.value }))}
          />
          <Input
            label={t.companies.country}
            value={brandingDraft.country ?? ''}
            onChange={(e) => setBrandingDraft((prev) => ({ ...prev, country: e.target.value }))}
          />
          <Input
            label={t.settings.billingEmail}
            value={brandingDraft.billingEmail ?? ''}
            onChange={(e) => setBrandingDraft((prev) => ({ ...prev, billingEmail: e.target.value }))}
          />
          <Input
            label={t.settings.billingPhone}
            value={brandingDraft.billingPhone ?? ''}
            onChange={(e) => setBrandingDraft((prev) => ({ ...prev, billingPhone: e.target.value }))}
          />
          <Input
            label={t.settings.quoteFooter}
            value={brandingDraft.quoteFooter ?? ''}
            onChange={(e) => setBrandingDraft((prev) => ({ ...prev, quoteFooter: e.target.value }))}
            placeholder={t.settings.quoteFooterPlaceholder}
          />
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={handleSaveBranding}>{t.common.save}</Button>
          <Button size="sm" variant="ghost" onClick={handleResetBranding}>{t.settings.resetBranding}</Button>
        </div>
      </section>

      {/* Pipeline Stages */}
      <section className={`crm-surface-section p-6 ${tabVisible('pipeline') ? '' : 'hidden'}`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-fg">{t.settings.pipeline}</h2>
          <Button size="sm" leftIcon={<Plus size={13} />} onClick={handleAddPipelineStage}>
            {t.common.add}
          </Button>
        </div>
        <DragDropContext onDragEnd={handlePipelineDragEnd}>
          <Droppable droppableId="pipeline-stages">
            {(dropProvided) => (
              <div
                className="space-y-3"
                ref={dropProvided.innerRef}
                {...dropProvided.droppableProps}
              >
                {pipelineDraft.map((stage, index) => (
                  <Draggable key={stage.id} draggableId={stage.id} index={index}>
                    {(dragProvided) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className={`p-3 ${innerSurface}`}
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <button
                            type="button"
                            {...dragProvided.dragHandleProps}
                            className="focus-ring mt-2 rounded-lg p-1 text-fg-subtle hover:text-fg-muted hover:bg-fg/6 cursor-grab active:cursor-grabbing shrink-0"
                            aria-label={`${t.common.edit} order`}
                            title={`${t.common.edit} order`}
                          >
                            <SlidersHorizontal size={14} />
                          </button>
                          <div className="w-3 h-3 rounded-full flex-shrink-0 mt-2.5" style={{ backgroundColor: stage.color }} />
                          <div className="min-w-0 flex-1 space-y-2">
                            <Input
                              label={t.common.name}
                              value={stage.name}
                              onChange={(e) => handlePipelineStageChange(stage.id, { name: e.target.value })}
                              className="w-full"
                            />
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                size="xs"
                                variant="ghost"
                                disabled={PIPELINE_STAGE_DELETE_BLOCKED.has(stage.id)}
                                onClick={() => handleRemovePipelineStage(stage.id)}
                                title={PIPELINE_STAGE_DELETE_BLOCKED.has(stage.id) ? t.settings.pipelineStageProtected : t.settings.pipelineStageDeleteHint}
                                aria-label={t.common.delete}
                                leftIcon={<Trash2 size={12} />}
                              >
                                {t.common.delete}
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-xs text-fg-muted w-28">{t.deals.probability}</label>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={stage.probability}
                            onChange={(e) => handlePipelineStageChange(stage.id, { probability: Number(e.target.value) })}
                            className="flex-1 accent-accent-600"
                          />
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={stage.probability}
                            onChange={(e) => handlePipelineStageChange(stage.id, { probability: Number(e.target.value) })}
                            className="crm-themed-input w-20 rounded-lg px-2 py-1 text-xs"
                          />
                          <span className="text-xs text-fg-subtle">%</span>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {dropProvided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        <div className="mt-4 max-w-xs">
          <Input
            label={t.settings.leadOpsSlaHours}
            type="number"
            min={1}
            value={settings.leadSlaHours ?? 8}
            onChange={(e) => updateLeadSlaHours(Number(e.target.value))}
          />
        </div>
        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={handleSavePipelineConfig}>
            {t.common.save}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPipelineDraft(settings.pipelineStages)}>
            {t.common.cancel}
          </Button>
        </div>
      </section>

      {/* Pipelines (multi-pipeline management) */}
      <section className={`crm-surface-section p-6 ${tabVisible('pipelines') ? '' : 'hidden'}`}>
        <SettingsPipelinesPanel />
      </section>

      {/* Tags */}
      <section className={`crm-surface-section p-6 ${tabVisible('general') ? '' : 'hidden'}`}>
        <h2 className="text-base font-semibold text-fg mb-4">{t.settings.tags}</h2>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder={t.settings.newTagPlaceholder}
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }}
            leftIcon={<Tag size={14} />}
            className="flex-1"
          />
          <Button size="sm" leftIcon={<Plus size={14} />} onClick={handleAddTag}>
            {t.common.add}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {settings.tags.map((tag) => (
            <div key={tag} className="flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-2 px-2 py-1 pl-3">
              <span className="text-xs text-fg-muted">{tag}</span>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={() => { removeTag(tag); toast.success(t.common.delete + ' ✓') }}
                aria-label={`${t.settings.deleteTagAriaLabel} ${tag}`}
                className="min-h-7 px-1.5 text-fg-subtle hover:text-danger"
              >
                <Trash2 size={11} />
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Users */}
      <section className={`crm-surface-section p-6 ${tabVisible('permissions') ? '' : 'hidden'}`}>
        <h2 className="text-base font-semibold text-fg mb-4">{t.settings.users}</h2>
        <div className="space-y-3">
          {usersForSettings.map((user) => (
            <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl border border-accent-500/25 bg-accent-500/5">
              <Avatar name={user.name} size="sm" />
              <div className="flex-1">
                <p className="text-sm font-medium text-fg">{user.name}</p>
                <p className="text-xs text-fg-subtle">{user.email} · {t.team.roleLabels[user.role as UserRole] ?? user.role}</p>
              </div>
              <span className="text-xs px-2 py-0.5 bg-accent-500/15 text-accent-400 rounded-full">{t.team.roleLabels[user.role as UserRole] ?? user.role}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-fg-subtle mt-3">{t.settings.usersAuthHint}</p>
      </section>

      {/* Permission Profiles */}
      <section className={`crm-surface-section p-6 ${tabVisible('permissions') ? '' : 'hidden'}`}>
        <h2 className="text-base font-semibold text-fg mb-2">{t.settings.permissionProfiles}</h2>
        <p className="text-xs text-fg-subtle mb-4">{t.settings.permissionProfilesHint}</p>
        <div className="max-w-xs mb-4">
          <Select
            label={t.team.role}
            value={rbacRole}
            onChange={(e) => setRbacRole(e.target.value as UserRole)}
            options={[
              { value: 'admin', label: t.team.roleLabels.admin },
              { value: 'manager', label: t.team.roleLabels.manager },
              { value: 'sales_rep', label: t.team.roleLabels.sales_rep },
              { value: 'viewer', label: t.team.roleLabels.viewer },
            ]}
          />
        </div>
        <div className="space-y-3">
          {permissionGroups.map((group) => (
            <div key={group.resource} className="rounded-xl border border-border-subtle bg-surface-1 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-fg">{group.label}</h3>
                <span className="text-[11px] text-fg-subtle">{group.permissions.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {group.permissions.map((permission) => {
                  const active = rolePermissions.includes(permission)
                  const [, action = permission] = permission.split(':')
                  const actionLabel = t.settings.permissionActionLabels[action as keyof typeof t.settings.permissionActionLabels]
                  return (
                    <label key={permission} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs transition-colors ${active ? 'border-accent-500/40 bg-accent-500/10 text-fg' : 'border-border-subtle bg-surface-2 text-fg-muted hover:bg-surface-1'}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <Checkbox
                          checked={active}
                          onChange={() => handleTogglePermission(permission)}
                          className="accent-accent-600"
                        />
                        <span className="truncate">{actionLabel ?? action.replace('_', ' ').toUpperCase()}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${active ? 'border-accent-500/40 text-accent-300 bg-accent-500/10' : 'border-border-subtle text-fg-subtle bg-surface-1'}`}>
                        {active ? t.common.enabled : t.common.disabled}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={`crm-surface-section p-6 ${tabVisible('security') ? '' : 'hidden'}`}>
        <SettingsMfaPanel />
        <div className="mt-6">
          <SettingsSsoScimPanel />
        </div>
      </section>

      {/* Data Management */}
      <section className={`crm-surface-section p-6 ${tabVisible('data') ? '' : 'hidden'}`}>
        <h2 className="text-base font-semibold text-fg mb-2">{t.settings.importExport}</h2>
        <p className="text-xs text-fg-subtle mb-4">{t.settings.exportData} / {t.settings.importData}</p>
        <div className="flex flex-wrap gap-3">
          <PermissionGate permission="contacts:export">
            <Button variant="secondary" leftIcon={<Download size={14} />} onClick={handleExportJSON}>
              {t.settings.exportData} JSON
            </Button>
          </PermissionGate>
          <PermissionGate permission="import:json">
            <Button variant="secondary" leftIcon={<Upload size={14} />} onClick={handleImportJSON}>
              {t.settings.importData} JSON
            </Button>
          </PermissionGate>
          <PermissionGate permission="import:csv">
            <Button variant="secondary" leftIcon={<FileSpreadsheet size={14} />} onClick={() => setShowCSVImport(true)}>
              {t.settings.importData} CSV
            </Button>
          </PermissionGate>
          <PermissionGate permission="settings:update">
            <Button variant="danger" leftIcon={<RotateCcw size={14} />} onClick={() => setShowResetConfirm(true)}>
              {t.settings.resetData}
            </Button>
          </PermissionGate>
        </div>
      </section>

      {/* Notification Preferences */}
      <section className={`crm-surface-section p-6 ${tabVisible('permissions') ? '' : 'hidden'}`}>
        <h2 className="text-base font-semibold text-fg mb-1">{t.settings.notifications}</h2>
        <p className="text-xs text-fg-subtle mb-4">{t.common.enabled} / {t.common.disabled}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ALL_NOTIFICATION_TYPES.map((type) => {
            const enabled = !disabledTypes.has(type)
            return (
              <button type="button"
                key={type}
                onClick={() => toggleType(type)}
                className={`focus-ring flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  enabled
                    ? 'bg-accent-500/10 border-accent-500/30 text-fg'
                    : 'bg-fg/3 border-fg/8 text-fg-subtle hover:text-fg-muted'
                }`}
              >
                <span>{t.settings.notifTypeLabels[type]}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  enabled ? 'bg-accent-500/20 text-accent-300' : 'bg-fg/8 text-fg-subtle'
                }`}>
                  {enabled ? t.common.enabled : t.common.disabled}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className={`crm-surface-section p-6 ${tabVisible('navigation') ? '' : 'hidden'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-fg">{t.settings.navEditorTitle}</h2>
            <p className="text-xs text-fg-subtle">{t.settings.navEditorSubtitle}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={addCustomGroup}>{t.settings.navNewGroup}</Button>
            <Button size="sm" variant="ghost" onClick={() => { void resetNavPrefs() }}>{t.settings.navReset}</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-fg-subtle">{t.settings.navBaseSections}</p>
            {sectionOptions.map((section) => {
              const hidden = navPrefs.hiddenSections.includes(section.id)
              return (
                <div key={section.id} className={`space-y-2 p-3 ${innerSurface}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-fg">{section.label}</p>
                    <div className="flex items-center gap-1">
                      <Button type="button" size="xs" variant="secondary" className="min-w-8 px-2" onClick={() => moveSection(section.id, -1)} aria-label={t.settings.navMoveUp} title={t.settings.navMoveUp}>
                        <ChevronUp size={14} />
                      </Button>
                      <Button type="button" size="xs" variant="secondary" className="min-w-8 px-2" onClick={() => moveSection(section.id, 1)} aria-label={t.settings.navMoveDown} title={t.settings.navMoveDown}>
                        <ChevronDown size={14} />
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant={hidden ? 'danger' : 'secondary'}
                        onClick={() => {
                          void updateNavPrefs((current) => ({
                            ...current,
                            hiddenSections: hidden
                              ? current.hiddenSections.filter((id) => id !== section.id)
                              : [...current.hiddenSections, section.id],
                          }))
                        }}
                      >
                        {hidden ? t.settings.navSectionHidden : t.settings.navSectionVisible}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {(navPrefs.itemOrderBySection[section.id] ?? createDefaultNavigationPreferences().itemOrderBySection[section.id]).map((itemId) => {
                      const itemHidden = navPrefs.hiddenBuiltinItems.includes(itemId)
                      return (
                        <div key={itemId} className="flex items-center justify-between text-xs text-fg-muted rounded-lg border border-border-subtle bg-surface-2 px-2 py-1.5">
                          <span>{itemId}</span>
                          <div className="flex gap-1">
                            <Button type="button" size="xs" variant="secondary" className="min-w-7 px-1.5" onClick={() => moveBuiltinItem(section.id, itemId, -1)} aria-label={t.settings.navMoveUp} title={t.settings.navMoveUp}>
                              <ChevronUp size={12} />
                            </Button>
                            <Button type="button" size="xs" variant="secondary" className="min-w-7 px-1.5" onClick={() => moveBuiltinItem(section.id, itemId, 1)} aria-label={t.settings.navMoveDown} title={t.settings.navMoveDown}>
                              <ChevronDown size={12} />
                            </Button>
                            <Button
                              type="button"
                              size="xs"
                              variant={itemHidden ? 'danger' : 'secondary'}
                              onClick={() => {
                                void updateNavPrefs((current) => ({
                                  ...current,
                                  hiddenBuiltinItems: itemHidden
                                    ? current.hiddenBuiltinItems.filter((id) => id !== itemId)
                                    : [...current.hiddenBuiltinItems, itemId],
                                }))
                              }}
                            >
                              {itemHidden ? t.common.disabled : t.common.enabled}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-fg-subtle">{t.settings.navCustomGroups}</p>
            {navPrefs.customGroups.length === 0 && (
              <p className="text-xs text-fg-subtle">{t.settings.navNoCustomGroups}</p>
            )}
            {navPrefs.customGroups.map((group, index) => (
              <div key={group.id} className={`space-y-2 p-3 ${innerSurface}`}>
                <Input
                  label={t.settings.navGroupName}
                  value={group.label}
                  onChange={(e) => {
                    const value = e.target.value
                    void updateNavPrefs((current) => ({
                      ...current,
                      customGroups: current.customGroups.map((g) => g.id === group.id ? { ...g, label: value } : g),
                    }))
                  }}
                />
                <Select
                  label={t.settings.navGroupIcon}
                  value={group.iconKey ?? 'bookmark'}
                  onChange={(e) => {
                    const value = e.target.value as SidebarIconKey
                    void updateNavPrefs((current) => ({
                      ...current,
                      customGroups: current.customGroups.map((g) => g.id === group.id ? { ...g, iconKey: value } : g),
                    }))
                  }}
                  options={ICON_OPTIONS.map((icon) => ({ value: icon, label: icon }))}
                />
                <div className="text-xs text-fg-muted">{t.settings.navItemsCount}: {group.items.length}</div>
                <div className="flex gap-2 flex-wrap">
                  <span className="text-[11px] text-fg-subtle w-full">{t.settings.navRoleRules}</span>
                  {(['admin', 'manager', 'sales_rep', 'viewer'] as UserRole[]).map((role) => {
                    const active = group.roleRules?.includes(role) ?? false
                    return (
                      <Button
                        type="button"
                        key={role}
                        size="xs"
                        variant={active ? 'secondary' : 'ghost'}
                        className={`text-[11px] ${active ? 'border border-accent-500/40' : 'border border-border-subtle'}`}
                        onClick={() => {
                          void updateNavPrefs((current) => ({
                            ...current,
                            customGroups: current.customGroups.map((g) => {
                              if (g.id !== group.id) return g
                              const roleRules = g.roleRules ?? []
                              return {
                                ...g,
                                roleRules: active ? roleRules.filter((r) => r !== role) : [...roleRules, role],
                              }
                            }),
                          }))
                        }}
                      >
                        {t.team.roleLabels[role]}
                      </Button>
                    )
                  })}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => {
                      void updateNavPrefs((current) => ({
                        ...current,
                        customGroups: current.customGroups.map((g) => g.id === group.id ? {
                          ...g,
                          items: [...g.items, { id: `item-${Date.now().toString(36)}`, label: t.settings.navAddLink, to: '/settings' }],
                        } : g),
                      }))
                    }}
                  >
                    {t.settings.navAddLink}
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      void updateNavPrefs((current) => ({
                        ...current,
                        customGroups: current.customGroups
                          .filter((g) => g.id !== group.id)
                          .map((g, idx) => ({ ...g, order: idx })),
                      }))
                    }}
                  >
                    {t.settings.navDeleteGroup}
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      if (index === 0) return
                      void updateNavPrefs((current) => {
                        const next = [...current.customGroups]
                        const [moved] = next.splice(index, 1)
                        next.splice(index - 1, 0, moved)
                        return { ...current, customGroups: next.map((g, idx) => ({ ...g, order: idx })) }
                      })
                    }}
                  >
                    {t.settings.navMoveUp}
                  </Button>
                </div>
                {group.items.map((item) => (
                  <div key={item.id} className="space-y-2 rounded-lg border border-border-subtle bg-surface-2 p-2">
                    <Input
                      label={t.settings.navLabel}
                      value={item.label}
                      onChange={(e) => {
                        const value = e.target.value
                        void updateNavPrefs((current) => ({
                          ...current,
                          customGroups: current.customGroups.map((g) => g.id === group.id
                            ? { ...g, items: g.items.map((it) => it.id === item.id ? { ...it, label: value } : it) }
                            : g),
                        }))
                      }}
                    />
                    <Input
                      label={t.settings.navRoute}
                      value={item.to ?? ''}
                      onChange={(e) => {
                        const value = e.target.value
                        void updateNavPrefs((current) => ({
                          ...current,
                          customGroups: current.customGroups.map((g) => g.id === group.id
                            ? { ...g, items: g.items.map((it) => it.id === item.id ? { ...it, to: value } : it) }
                            : g),
                        }))
                      }}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lead Maintenance Ops */}
      {activeTab === 'webhooks' && (
        <section className="crm-surface-section p-6">
          <SettingsWebhooksPanel />
        </section>
      )}

      {activeTab === 'integrations' && (
        <section className="crm-surface-section p-6">
          <SettingsIntegrationsPanel />
        </section>
      )}

      <section className={`crm-surface-section p-6 ${tabVisible('advanced') ? '' : 'hidden'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSlaBreached ? 'bg-warning/20' : 'bg-success/20'}`}>
              {isSlaBreached ? <ShieldAlert size={14} className="text-warning" /> : <Activity size={14} className="text-success" />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-fg">{t.settings.leadOpsTitle}</h2>
              <p className="text-xs text-fg-subtle">{t.settings.leadOpsSubtitle}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<RefreshCw size={13} />}
            loading={loadingMaintenanceRuns}
            onClick={loadMaintenanceRuns}
          >
            {t.leads.refresh}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div className={`${innerSurface} p-3`}>
            <p className="text-xs text-fg-subtle mb-1">{t.settings.leadOpsLastSuccess}</p>
            <p className="text-sm font-medium text-fg">{formatAgo(lastSuccessAt)}</p>
          </div>
          <div className={`${innerSurface} p-3`}>
            <p className="text-xs text-fg-subtle mb-1">{t.settings.leadOpsSlaLabel}</p>
            <p className={`text-sm font-medium ${isSlaBreached ? 'text-warning' : 'text-success'}`}>
              {isSlaBreached ? t.settings.leadOpsBreached : t.settings.leadOpsHealthy}
            </p>
          </div>
          <div className={`${innerSurface} p-3`}>
            <p className="text-xs text-fg-subtle mb-1">{t.settings.leadOpsRecentErrors}</p>
            <p className={`text-sm font-medium ${recentErrors.length > 0 ? 'text-danger' : 'text-fg'}`}>
              {recentErrors.length}
            </p>
          </div>
          <div className={`${innerSurface} border-success/25 bg-success/5 p-3`}>
            <p className="text-xs text-fg-subtle mb-1">{t.settings.leadOpsMailboxScope}</p>
            <p className="text-sm font-medium text-success flex items-center gap-1.5">
              <Lock size={13} />
              {t.settings.leadOpsMailboxPrivate}
            </p>
            <p className="mt-1 text-[11px] text-fg-subtle">{t.settings.leadOpsMailboxPrivateHint}</p>
          </div>
        </div>

        <div className="mb-4 min-w-0">
          <Tabs
            tabs={([
              { value: 'all', label: t.settings.leadOpsFilterAll },
              { value: 'success', label: t.settings.leadOpsFilterSuccess },
              { value: 'running', label: t.settings.leadOpsFilterRunning },
              { value: 'error', label: t.settings.leadOpsFilterError },
            ] as const).map((opt) => ({ id: opt.value, label: opt.label }))}
            activeId={maintenanceStatusFilter}
            onChange={(id) => setMaintenanceStatusFilter(id as 'all' | 'success' | 'running' | 'error')}
            className="w-full min-w-0 [&>div]:w-full [&>div]:flex-wrap"
          />
        </div>

        {visibleMaintenanceRuns.length === 0 ? (
          <p className="text-sm text-fg-subtle">{t.settings.leadOpsNoRuns}</p>
        ) : (
          <div className="space-y-2">
            {visibleMaintenanceRuns.map((run) => {
              const statusLabel = run.status === 'success'
                ? t.settings.leadOpsFilterSuccess
                : run.status === 'running'
                  ? t.settings.leadOpsFilterRunning
                  : t.settings.leadOpsFilterError
              return (
              <div key={run.id} className={`${innerSurface} p-3`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-fg-muted">
                    {run.mode === 'all_orgs' ? t.settings.leadOpsAllOrgs : t.settings.leadOpsSingleOrg} · {formatAgo(run.started_at)}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    run.status === 'success'
                      ? 'bg-success/15 text-success border-success/30'
                      : run.status === 'running'
                        ? 'bg-accent-500/15 text-accent-300 border-accent-500/30'
                        : 'bg-danger/15 text-danger border-danger/30'
                  }`}>
                    {statusLabel}
                  </span>
                </div>
                <div className="mt-1 text-xs text-fg-subtle">
                  {t.settings.leadOpsProcessed}: <span className="text-fg-muted">{run.processed}</span>
                </div>
                {run.error_message ? (
                  <p className="mt-1 text-xs text-danger">{run.error_message}</p>
                ) : null}
              </div>
              )
            })}
          </div>
        )}
      </section>

      <CSVImport isOpen={showCSVImport} onClose={() => setShowCSVImport(false)} />

      <ConfirmDialog
        isOpen={cfDeleteId !== null}
        onClose={() => setCfDeleteId(null)}
        onConfirm={() => cfDeleteId && cfHandleDelete(cfDeleteId)}
        title={t.common.delete}
        message={t.common.bulkDeleteConfirm}
        confirmLabel={t.common.delete}
        danger
      />

      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleReset}
        title={t.settings.resetData}
        message={t.settings.resetConfirm}
        confirmLabel={t.common.confirm}
        danger
      />
    </div>
  )
}
