import type { Dispatch, SetStateAction } from 'react'
import { Filter, X, KanbanSquare } from 'lucide-react'
import { useTranslations, useLocalizedOrgUsers } from '../../i18n'
import { Button } from '../../components/ui/Button'
import { SearchBar } from '../../components/shared/SearchBar'
import { SmartViewBar } from '../../components/shared/SmartViewBar'
import { Select } from '../../components/ui/Select'
import { PipelineSelector } from '../../components/deals/PipelineSelector'
import type { SmartViewFilter } from '../../types'
import { useAuthStore } from '../../store/authStore'

export interface DealFiltersProps {
  search: string
  setSearch: Dispatch<SetStateAction<string>>
  assignedFilter: string
  setAssignedFilter: Dispatch<SetStateAction<string>>
  priorityFilter: string
  setPriorityFilter: Dispatch<SetStateAction<string>>
  myDataOnly: boolean
  setMyDataOnly: Dispatch<SetStateAction<boolean>>
  showFilters: boolean
  setShowFilters: Dispatch<SetStateAction<boolean>>
  onFiltersChange: (filters: SmartViewFilter[]) => void
}

export function DealFilters({
  search,
  setSearch,
  assignedFilter,
  setAssignedFilter,
  priorityFilter,
  setPriorityFilter,
  myDataOnly,
  setMyDataOnly,
  showFilters,
  setShowFilters,
  onFiltersChange,
}: DealFiltersProps) {
  const t = useTranslations()
  const orgUsers = useLocalizedOrgUsers(useAuthStore((s) => s.users))

  return (
    <>
      <div className="flex w-full flex-wrap items-center gap-3">
        <PipelineSelector />
        <SearchBar value={search} onChange={setSearch} placeholder={t.common.searchPlaceholder} className="w-64" />
        <Button
          variant={showFilters ? 'secondary' : 'ghost'}
          size="sm"
          leftIcon={<Filter size={14} />}
          onClick={() => setShowFilters((v) => !v)}
        >
          {t.common.filters}
        </Button>
        <button
          type="button"
          onClick={() => setMyDataOnly((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            myDataOnly
              ? 'bg-accent-500/20 border-accent-500/40 text-accent-300'
              : 'bg-fg/4 border-fg/10 text-fg-muted hover:text-fg'
          }`}
        >
          <KanbanSquare size={12} />
          {myDataOnly ? t.deals.title : t.common.all}
        </button>
      </div>

      <SmartViewBar entityType="deal" onFiltersChange={onFiltersChange} />

      {showFilters && (
        <div className="flex gap-3 flex-wrap items-center glass p-4">
          <Select
            options={orgUsers.map((u) => ({ value: u.name, label: u.name }))}
            placeholder={t.common.assignedTo}
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
          />
          <Select
            options={[
              { value: 'low', label: t.deals.priorityLabels.low },
              { value: 'medium', label: t.deals.priorityLabels.medium },
              { value: 'high', label: t.deals.priorityLabels.high },
            ]}
            placeholder={t.common.priority}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          />
          {(assignedFilter || priorityFilter) && (
            <Button variant="ghost" size="sm" leftIcon={<X size={14} />}
              onClick={() => { setAssignedFilter(''); setPriorityFilter('') }}>
              {t.common.clear}
            </Button>
          )}
        </div>
      )}
    </>
  )
}
