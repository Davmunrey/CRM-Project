import { useState, useId, useEffect, useRef } from 'react'
import {
  ListFilter,
  ListPlus,
  ChevronDown,
  Trash2,
  BookmarkPlus,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { ConfirmDialog } from '../ui/Modal'
import { useTranslations } from '../../i18n'
import { useAuthStore } from '../../store/authStore'
import { useViewsStore } from '../../store/viewsStore'
import {
  useDistributionListsStore,
  type DistributionListEntity,
} from '../../store/distributionListsStore'
import type { SmartViewFilter } from '../../types'
import { toast } from '../../store/toastStore'

interface EntityListsToolbarProps {
  entityType: DistributionListEntity
  getSavableFilters: () => SmartViewFilter[]
  distributionListId: string | null
  onDistributionListIdChange: (id: string | null) => void
  selectionIds: Set<string>
  currentResultIds: string[]
}

export function EntityListsToolbar({
  entityType,
  getSavableFilters,
  distributionListId,
  onDistributionListIdChange,
  selectionIds,
  currentResultIds,
}: EntityListsToolbarProps) {
  const t = useTranslations()
  const currentUser = useAuthStore((s) => s.currentUser)
  const lists = useDistributionListsStore((s) => s.lists)
  const addDistributionList = useDistributionListsStore((s) => s.addList)
  const deleteDistributionList = useDistributionListsStore((s) => s.deleteList)

  const entityLists = lists.filter((l) => l.entityType === entityType)

  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [pinSavedView, setPinSavedView] = useState(true)
  const [distMenuOpen, setDistMenuOpen] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [deleteListId, setDeleteListId] = useState<string | null>(null)
  const distMenuRef = useRef<HTMLDivElement>(null)

  const saveTitleId = useId()
  const distTitleId = useId()

  useEffect(() => {
    if (!distMenuOpen) return
    const close = (e: MouseEvent) => {
      if (distMenuRef.current && !distMenuRef.current.contains(e.target as Node)) {
        setDistMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [distMenuOpen])

  const handleSaveFilteredList = () => {
    const name = saveName.trim()
    if (!name) {
      toast.error(t.entityLists.nameRequired)
      return
    }
    const filters = getSavableFilters()
    useViewsStore.getState().addView({
      name,
      entityType,
      filters,
      sortField: entityType === 'contact' ? 'updatedAt' : 'name',
      sortDirection: 'desc',
      isPinned: pinSavedView,
      icon: 'bookmark',
      color: 'blue',
      createdBy: currentUser?.name ?? 'User',
    })
    toast.success(t.entityLists.filteredListSaved)
    setSaveOpen(false)
    setSaveName('')
  }

  const handleCreateDistributionList = (ids: string[]) => {
    const name = newListName.trim()
    if (!name) {
      toast.error(t.entityLists.nameRequired)
      return
    }
    const unique = Array.from(new Set(ids.filter(Boolean)))
    if (unique.length === 0) {
      toast.error(t.entityLists.noMembersSelected)
      return
    }
    addDistributionList({ name, entityType, memberIds: unique })
    toast.success(t.entityLists.distributionListCreated)
    setNewListName('')
    setDistMenuOpen(false)
  }

  const handleDeleteDistributionList = () => {
    if (!deleteListId) return
    deleteDistributionList(deleteListId)
    if (distributionListId === deleteListId) {
      onDistributionListIdChange(null)
    }
    toast.success(t.entityLists.distributionListDeleted)
    setDeleteListId(null)
  }

  const distOptions = [
    { value: '', label: t.entityLists.noDistributionList },
    ...entityLists.map((l) => ({ value: l.id, label: l.name })),
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        leftIcon={<BookmarkPlus size={14} />}
        onClick={() => setSaveOpen(true)}
      >
        {t.entityLists.saveFilteredList}
      </Button>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 min-w-[12rem] max-w-[20rem]">
          <ListFilter size={14} className="text-fg-subtle shrink-0" aria-hidden />
          <Select
            ariaLabel={t.entityLists.distributionList}
            value={distributionListId ?? ''}
            onChange={(e) => onDistributionListIdChange(e.target.value || null)}
            options={distOptions}
            listMaxHeightClass="max-h-56"
          />
        </div>
        {distributionListId && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<Trash2 size={14} />}
            onClick={() => setDeleteListId(distributionListId)}
            aria-label={t.entityLists.deleteDistributionList}
          >
            {t.common.delete}
          </Button>
        )}

        <div className="relative" ref={distMenuRef}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<ListPlus size={14} />}
            rightIcon={<ChevronDown size={14} />}
            onClick={() => setDistMenuOpen((v) => !v)}
          >
            {t.entityLists.newDistributionList}
          </Button>
          {distMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" aria-hidden onClick={() => setDistMenuOpen(false)} />
              <div
                className="absolute top-full left-0 mt-1 z-50 min-w-[17rem] rounded-xl border border-fg/10 bg-surface-2 shadow-2xl p-3 space-y-3"
                role="dialog"
                aria-labelledby={distTitleId}
              >
                <p id={distTitleId} className="text-xs font-medium text-fg-muted">
                  {t.entityLists.name}
                </p>
                <Input
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder={t.entityLists.listNamePlaceholder}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setDistMenuOpen(false)
                  }}
                />
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={selectionIds.size === 0}
                    onClick={() => handleCreateDistributionList(Array.from(selectionIds))}
                  >
                    {t.entityLists.createFromSelection}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={currentResultIds.length === 0}
                    onClick={() => handleCreateDistributionList(currentResultIds)}
                  >
                    {t.entityLists.createFromCurrentResults}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {saveOpen && (
        <>
          <div className="fixed inset-0 z-modal bg-black/50" aria-hidden onClick={() => setSaveOpen(false)} />
          <div
            className="fixed z-modal inset-0 flex items-center justify-center p-4 pointer-events-none"
            role="presentation"
          >
            <div
              className="pointer-events-auto w-full max-w-md rounded-xl border border-fg/10 bg-surface-2 shadow-2xl p-6 space-y-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby={saveTitleId}
            >
              <h2 id={saveTitleId} className="text-base font-semibold text-fg">
                {t.entityLists.saveFilteredList}
              </h2>
              <Input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder={t.entityLists.filteredListNamePlaceholder}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveFilteredList()
                  if (e.key === 'Escape') setSaveOpen(false)
                }}
              />
              <label className="flex items-center gap-2 text-sm text-fg-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={pinSavedView}
                  onChange={(e) => setPinSavedView(e.target.checked)}
                  className="rounded border-fg/12 bg-fg/6 text-accent-500 focus:ring-accent-500"
                />
                {t.entityLists.pinToBar}
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setSaveOpen(false)}>
                  {t.common.cancel}
                </Button>
                <Button type="button" onClick={handleSaveFilteredList}>
                  {t.common.save}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={deleteListId !== null}
        onClose={() => setDeleteListId(null)}
        onConfirm={handleDeleteDistributionList}
        title={t.entityLists.deleteDistributionList}
        message={t.entityLists.deleteDistributionListConfirm}
        danger
        confirmLabel={t.common.delete}
      />
    </div>
  )
}
