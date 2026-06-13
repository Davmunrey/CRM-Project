import { useState, useMemo, useCallback, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useLocalizedCompanies, useLocalizedContacts, useTranslations, getTranslations } from '../../i18n'
import { localizedActivity, localizedDeal } from '../../i18n/localizeSeed'
import {
  Plus, Trophy, XCircle, Edit2, Trash2, Mail,
} from 'lucide-react'
import { useDealsStore } from '../../store/dealsStore'
import { useContactsStore } from '../../store/contactsStore'
import { useCompaniesStore } from '../../store/companiesStore'
import { useActivitiesStore } from '../../store/activitiesStore'
import { DealForm } from '../../components/deals/DealForm'
import { ActivityForm } from '../../components/activities/ActivityForm'
import { ActivityItem } from '../../components/activities/ActivityItem'
import { Button } from '../../components/ui/Button'
import { SlideOver, ConfirmDialog } from '../../components/ui/Modal'
import { toast } from '../../store/toastStore'
import { formatCurrency, formatDate } from '../../utils/formatters'

import type { Deal, DealStage, SmartViewFilter } from '../../types'
import { PermissionGate } from '../../components/auth/PermissionGate'
import { PageHeader } from '../../components/ui/PageHeader'
import { Toolbar } from '../../components/ui/Toolbar'
import { EmailComposer } from '../../components/email/EmailComposer'
import { useAuthStore } from '../../store/authStore'
import { usePipelinesStore } from '../../store/pipelinesStore'
import { CustomFieldsForm } from '../../components/shared/CustomFieldRenderer'
import { AiInsight } from '../../components/ai/AiInsight'
import { useAiStore } from '../../store/aiStore'
import { DealFilters } from './DealFilters'
import { DealKanban } from './DealKanban'
import { DealListView } from './DealListView'
import { DealToolbar, type DealViewMode } from './DealToolbar'
import { DealCalendarView } from './DealCalendarView'
import { DealTimelineView } from './DealTimelineView'
import { QuoteBuilder } from './QuoteBuilder'
import { UpdatesPanel } from '../../components/shared/UpdatesPanel'

function getStageDurationDays(updatedAt: string): number {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000)
}

export function DealsPage() {
  const t = useTranslations()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const deals = useDealsStore((s) => s.deals)
  const addDeal = useDealsStore((s) => s.addDeal)
  const updateDeal = useDealsStore((s) => s.updateDeal)
  const deleteDeal = useDealsStore((s) => s.deleteDeal)
  const moveDeal = useDealsStore((s) => s.moveDeal)
  const contacts = useContactsStore((s) => s.contacts)
  const localizedContacts = useLocalizedContacts(contacts)
  const companies = useCompaniesStore((s) => s.companies)
  const localizedCompanies = useLocalizedCompanies(companies)
  const activities = useActivitiesStore((s) => s.activities)
  const addActivity = useActivitiesStore((s) => s.addActivity)
  const completeActivity = useActivitiesStore((s) => s.completeActivity)
  const deleteActivity = useActivitiesStore((s) => s.deleteActivity)
  const getActiveStages = usePipelinesStore((s) => s.getActiveStages)
  const activePipelineId = usePipelinesStore((s) => s.activePipelineId)
  const fetchDeals = useDealsStore((s) => s.fetchDeals)
  const pipelineStages = useMemo(() => getActiveStages(), [getActiveStages, activePipelineId]) // eslint-disable-line react-hooks/exhaustive-deps

  const currentUser = useAuthStore((s) => s.currentUser)
  const isSalesRep = currentUser?.role === 'sales_rep'

  const [search, setSearch] = useState('')
  const [assignedFilter, setAssignedFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [myDataOnly, setMyDataOnly] = useState(isSalesRep)
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<DealViewMode>('kanban')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isActivityOpen, setIsActivityOpen] = useState(false)
  const [isEmailOpen, setIsEmailOpen] = useState(false)
  const [emailDraft, setEmailDraft] = useState<{
    to: string
    subject: string
    body: string
    attachments: Array<{ name: string; mimeType: string; size: number; dataBase64: string }>
  } | null>(null)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [selectedDealIds, setSelectedDealIds] = useState<Set<string>>(new Set())
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [viewFilters, setViewFilters] = useState<SmartViewFilter[]>([])

  useEffect(() => {
    if (activePipelineId) fetchDeals({ silent: true, pipelineId: activePipelineId })
  }, [activePipelineId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: opens form/detail panel when ?create=1 or ?deal=id query params are present, then removes the params
      setIsFormOpen(true)
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('create')
        return next
      }, { replace: true })
      return
    }

    const dealId = searchParams.get('deal')
    if (!dealId) return
    const targetDeal = deals.find((d) => d.id === dealId)
    if (!targetDeal) return
    setSelectedDeal(targetDeal)
    setIsDetailOpen(true)
    setIsEditing(false)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('deal')
      return next
    }, { replace: true })
  }, [searchParams, setSearchParams, deals])

  const filtered = useMemo(() => {
    return deals.filter((d) => {
      if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false
      if (myDataOnly && currentUser) {
        if (d.assignedTo !== currentUser.name) return false
      } else if (assignedFilter && d.assignedTo !== assignedFilter) return false
      if (priorityFilter && d.priority !== priorityFilter) return false
      for (const vf of viewFilters) {
        const fieldValue = (d as unknown as Record<string, unknown>)[vf.field]
        if (vf.operator === 'eq' && fieldValue !== vf.value) return false
        if (vf.operator === 'neq' && fieldValue === vf.value) return false
        if (vf.operator === 'gte' && typeof fieldValue === 'number' && fieldValue < Number(vf.value)) return false
        if (vf.operator === 'lte' && typeof fieldValue === 'number' && fieldValue > Number(vf.value)) return false
        if (vf.operator === 'gt' && typeof fieldValue === 'number' && fieldValue <= Number(vf.value)) return false
        if (vf.operator === 'lt' && typeof fieldValue === 'number' && fieldValue >= Number(vf.value)) return false
        if (vf.operator === 'contains' && typeof fieldValue === 'string' && !fieldValue.toLowerCase().includes(String(vf.value).toLowerCase())) return false
      }
      return true
    })
  }, [deals, search, assignedFilter, priorityFilter, myDataOnly, currentUser, viewFilters])

  const getContact = useCallback((id: string) => localizedContacts.find((c) => c.id === id), [localizedContacts])
  const getCompany = useCallback((id: string) => localizedCompanies.find((c) => c.id === id), [localizedCompanies])
  const stageLabelsI18n = t.deals.stageLabels as Record<string, string>
  const stageLabelById = useMemo(
    () => Object.fromEntries(
      pipelineStages.map((stage) => [stage.id, stageLabelsI18n[stage.id] ?? stage.name]),
    ) as Record<DealStage, string>,
    [pipelineStages, stageLabelsI18n]
  )
  const sortedPipelineStages = useMemo(
    () => pipelineStages.slice().sort((a, b) => a.order - b.order),
    [pipelineStages]
  )
  const getStageLabel = useCallback(
    (stage: DealStage) => stageLabelById[stage] || stage,
    [stageLabelById]
  )

  const handleCreate = (data: Omit<Deal, 'id' | 'createdAt' | 'updatedAt' | 'activities'>) => {
    addDeal({ ...data, activities: [] })
    setIsFormOpen(false)
    toast.success(t.deals.created)
  }

  const handleEdit = (data: Omit<Deal, 'id' | 'createdAt' | 'updatedAt' | 'activities'>) => {
    if (!selectedDeal) return
    updateDeal(selectedDeal.id, data)
    setIsEditing(false)
    setSelectedDeal({ ...selectedDeal, ...data })
    toast.success(t.deals.updated)
  }

  const handleDelete = (id: string) => {
    deleteDeal(id)
    setIsDetailOpen(false)
    setSelectedDeal(null)
    toast.success(t.deals.deleted)
  }

  const handleMarkWon = () => {
    if (!selectedDeal) return
    updateDeal(selectedDeal.id, { stage: 'closed_won', probability: 100 })
    setIsDetailOpen(false)
    toast.success(`${t.deals.stageLabels.closed_won}! 🎉`)
  }

  const handleMarkLost = () => {
    if (!selectedDeal) return
    updateDeal(selectedDeal.id, { stage: 'closed_lost', probability: 0 })
    setIsDetailOpen(false)
    toast.success(t.deals.stageLabels.closed_lost)
  }

  const handleDealClick = (deal: Deal) => {
    setSelectedDeal(deal)
    setIsDetailOpen(true)
    setIsEditing(false)
  }

  const handleBulkAssign = (user: string) => {
    selectedDealIds.forEach((id) => updateDeal(id, { assignedTo: user }))
    toast.success(`${selectedDealIds.size} ${t.deals.title} → ${user}`)
    setSelectedDealIds(new Set())
  }

  const handleBulkStageChange = (stage: DealStage) => {
    selectedDealIds.forEach((id) => moveDeal(id, stage))
    toast.success(`${selectedDealIds.size} ${t.deals.title} → ${getStageLabel(stage)}`)
    setSelectedDealIds(new Set())
  }

  const handleBulkDeleteDeals = () => {
    selectedDealIds.forEach((id) => deleteDeal(id))
    toast.success(`${selectedDealIds.size} ${t.deals.deleted}`)
    setSelectedDealIds(new Set())
    setShowBulkDelete(false)
  }

  const handleAddActivity = (data: Omit<typeof activities[0], 'id' | 'createdAt'>) => {
    if (!selectedDeal) return
    addActivity({ ...data, dealId: selectedDeal.id })
    setIsActivityOpen(false)
    toast.success(t.activities.newActivity)
  }

  const displaySelectedDeal = useMemo(
    () => (selectedDeal ? localizedDeal(selectedDeal, getTranslations()) : null),
    [selectedDeal],
  )

  const dealActivities = useMemo(() => {
    if (!selectedDeal) return []
    const tr = getTranslations()
    return activities
      .filter((a) => a.dealId === selectedDeal.id)
      .map((a) => localizedActivity(a, tr))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [activities, selectedDeal])

  return (
    <div className="crm-page-full flex flex-col">
      <div className="shrink-0 space-y-4 px-4 pt-3 sm:px-6 lg:px-8">
        <PageHeader showTitle={false} title={t.nav.deals} />
        <Toolbar
          panel
          className="!flex-row flex-wrap items-center gap-3 py-3 shrink-0"
        >
          <DealFilters
            search={search}
            setSearch={setSearch}
            assignedFilter={assignedFilter}
            setAssignedFilter={setAssignedFilter}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            myDataOnly={myDataOnly}
            setMyDataOnly={setMyDataOnly}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            onFiltersChange={setViewFilters}
          />
          <DealToolbar
            viewMode={viewMode}
            onSetViewMode={setViewMode}
            onOpenForm={() => setIsFormOpen(true)}
          />
        </Toolbar>
      </div>

      {viewMode === 'kanban' && (
        <DealKanban
          filtered={filtered}
          sortedPipelineStages={sortedPipelineStages}
          getStageLabel={getStageLabel}
          onDealClick={handleDealClick}
        />
      )}

      {viewMode === 'list' && (
        <DealListView
          filtered={filtered}
          selectedDealIds={selectedDealIds}
          setSelectedDealIds={setSelectedDealIds}
          sortedPipelineStages={sortedPipelineStages}
          getStageLabel={getStageLabel}
          getCompany={getCompany}
          onDealClick={handleDealClick}
          onDeleteDeal={(id) => setDeleteId(id)}
          onOpenForm={() => setIsFormOpen(true)}
          onBulkAssign={handleBulkAssign}
          onBulkStageChange={handleBulkStageChange}
          onBulkDeleteRequest={() => setShowBulkDelete(true)}
        />
      )}

      {viewMode === 'calendar' && (
        <DealCalendarView filtered={filtered} getStageLabel={getStageLabel} onDealClick={handleDealClick} />
      )}

      {viewMode === 'timeline' && (
        <DealTimelineView filtered={filtered} getStageLabel={getStageLabel} onDealClick={handleDealClick} />
      )}

      {/* Create deal */}
      <SlideOver isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={t.deals.newDeal}>
        <DealForm onSubmit={handleCreate} onCancel={() => setIsFormOpen(false)} pipelineId={activePipelineId ?? undefined} />
      </SlideOver>

      {/* Deal detail */}
      <SlideOver isOpen={isDetailOpen && !isEditing} onClose={() => { setIsDetailOpen(false); setSelectedDeal(null) }} title={t.deals.editDeal} width="xl">
        {selectedDeal && (
          <div className="space-y-6">
            <div className="flex gap-2 flex-wrap">
              {selectedDeal.stage !== 'closed_won' && selectedDeal.stage !== 'closed_lost' && (
                <PermissionGate permission="deals:move">
                  <>
                    <Button size="sm" variant="secondary" leftIcon={<Trophy size={14} />} onClick={handleMarkWon}
                      className="text-success border-success/30 hover:bg-success/10">
                      {t.deals.won}
                    </Button>
                    <Button size="sm" variant="secondary" leftIcon={<XCircle size={14} />} onClick={handleMarkLost}
                      className="text-danger border-danger/30 hover:bg-danger/10">
                      {t.deals.lost}
                    </Button>
                  </>
                </PermissionGate>
              )}
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Mail size={14} />}
                onClick={() => {
                  setEmailDraft(null)
                  setIsEmailOpen(true)
                }}
              >
                {t.inbox.compose}
              </Button>
              <PermissionGate permission="deals:update">
                <Button size="sm" variant="secondary" leftIcon={<Edit2 size={14} />} onClick={() => setIsEditing(true)}>
                  {t.common.edit}
                </Button>
              </PermissionGate>
              <AiInsight
                label={t.ai.nextBestAction}
                loadingLabel={t.ai.analyzing}
                resultTitle={t.ai.nextBestActionTitle}
                run={() => useAiStore.getState().nextBestAction({ dealId: selectedDeal.id })}
                resetKey={selectedDeal.id}
              />
              <PermissionGate permission="deals:delete">
                <Button size="sm" variant="ghost" leftIcon={<Trash2 size={14} />}
                  className="text-danger hover:text-danger ml-auto"
                  onClick={() => setDeleteId(selectedDeal.id)}>
                  {t.common.delete}
                </Button>
              </PermissionGate>
            </div>

            <div className="bg-fg/4 rounded-xl p-4 space-y-1">
              <h2 className="text-lg font-bold text-fg mb-3">{displaySelectedDeal?.title ?? selectedDeal.title}</h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {[
                  { label: t.common.value, value: formatCurrency(selectedDeal.value, selectedDeal.currency) },
                  { label: t.deals.stage, value: getStageLabel(selectedDeal.stage) },
                  { label: t.deals.probability, value: `${selectedDeal.probability}%` },
                  { label: t.common.priority, value: t.deals.priorityLabels[selectedDeal.priority] },
                  { label: t.deals.expectedClose, value: formatDate(selectedDeal.expectedCloseDate) },
                  { label: t.common.assignedTo, value: selectedDeal.assignedTo },
                  { label: t.deals.company, value: getCompany(selectedDeal.companyId)?.name || '-' },
                  { label: t.deals.contact, value: (() => { const c = getContact(selectedDeal.contactId); return c ? `${c.firstName} ${c.lastName}` : '-' })() },
                  { label: t.deals.daysInStage, value: `${getStageDurationDays(selectedDeal.stageChangedAt ?? selectedDeal.updatedAt)} ${t.deals.aging} ${getStageLabel(selectedDeal.stage)}` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-fg-subtle">{label}</p>
                    <p className="text-sm text-fg font-medium">{value}</p>
                  </div>
                ))}
              </div>
              {(displaySelectedDeal?.notes ?? selectedDeal.notes) && (
                <div className="pt-3 border-t border-fg/6 mt-3">
                  <p className="text-xs text-fg-subtle mb-1">{t.common.notes}</p>
                  <p className="text-sm text-fg-muted">{displaySelectedDeal?.notes ?? selectedDeal.notes}</p>
                </div>
              )}
            </div>

            <div className="bg-fg/4 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-fg-muted">{t.common.details}</h3>
              <CustomFieldsForm entityId={selectedDeal.id} entityType="deal" />
            </div>

            <div className="bg-fg/4 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-fg-muted">{t.updates.title}</h3>
              <UpdatesPanel entityType="deal" entityId={selectedDeal.id} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-fg-muted">{t.nav.activities}</h3>
                <Button size="sm" variant="secondary" leftIcon={<Plus size={14} />}
                  onClick={() => setIsActivityOpen(true)}>
                  {t.common.add}
                </Button>
              </div>
              {dealActivities.length === 0 ? (
                <p className="text-xs text-fg-subtle py-4 text-center">{t.activities.emptyTitle}</p>
              ) : (
                <div className="space-y-1">
                  {dealActivities.map((a) => (
                    <ActivityItem key={a.id} activity={a} onComplete={completeActivity} onDelete={deleteActivity} />
                  ))}
                </div>
              )}
            </div>

            <div className="bg-fg/4 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-fg-muted">{t.deals.quoteBuilder}</h3>
              <QuoteBuilder
                dealId={selectedDeal.id}
                dealTitle={displaySelectedDeal?.title ?? selectedDeal.title}
                initialItems={selectedDeal.quoteItems ?? []}
                contactEmail={getContact(selectedDeal.contactId)?.email}
                companyName={getCompany(selectedDeal.companyId)?.name}
                currency={selectedDeal.currency}
                onComposeQuoteDraft={(draft) => {
                  setEmailDraft(draft)
                  setIsEmailOpen(true)
                }}
              />
            </div>
          </div>
        )}
      </SlideOver>

      {/* Edit deal */}
      <SlideOver isOpen={isEditing} onClose={() => setIsEditing(false)} title={t.deals.editDeal}>
        {selectedDeal && (
          <DealForm deal={selectedDeal} onSubmit={handleEdit} onCancel={() => setIsEditing(false)} pipelineId={selectedDeal.pipelineId ?? activePipelineId ?? undefined} />
        )}
      </SlideOver>

      {/* Add activity */}
      <SlideOver isOpen={isActivityOpen} onClose={() => setIsActivityOpen(false)} title={t.activities.newActivity}>
        {selectedDeal && (
          <ActivityForm
            defaultDealId={selectedDeal.id}
            defaultContactId={selectedDeal.contactId}
            onSubmit={handleAddActivity}
            onCancel={() => setIsActivityOpen(false)}
          />
        )}
      </SlideOver>

      {/* Email composer */}
      <SlideOver isOpen={isEmailOpen} onClose={() => setIsEmailOpen(false)} title={t.inbox.compose}>
        {selectedDeal && (
          <EmailComposer
            isOpen={isEmailOpen}
            onClose={() => {
              setIsEmailOpen(false)
              setEmailDraft(null)
            }}
            defaultTo={emailDraft?.to ?? ''}
            defaultSubject={emailDraft?.subject ?? ''}
            defaultBody={emailDraft?.body ?? ''}
            defaultAttachments={emailDraft?.attachments ?? []}
            dealId={selectedDeal.id}
            contactId={selectedDeal.contactId}
            onRequestGmailConnect={() => navigate('/settings?tab=email')}
          />
        )}
      </SlideOver>

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) handleDelete(deleteId) }}
        title={t.common.delete}
        message={t.common.bulkDeleteConfirm}
        confirmLabel={t.common.delete}
        danger
      />

      {/* Bulk delete confirm */}
      <ConfirmDialog
        isOpen={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={handleBulkDeleteDeals}
        title={`${t.common.delete} ${selectedDealIds.size} ${t.deals.title}`}
        message={t.common.bulkDeleteConfirm}
        confirmLabel={t.common.bulkDelete}
        danger
      />
    </div>
  )
}
