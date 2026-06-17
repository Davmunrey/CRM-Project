import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Building2, Filter, X, Trash2, Download, LayoutGrid, LayoutList, Search } from 'lucide-react'
import { useCompaniesStore } from '../store/companiesStore'
import { useContactsStore } from '../store/contactsStore'
import { useDealsStore } from '../store/dealsStore'
import { Button } from '../components/ui/Button'
import { Badge, type BadgeVariant } from '../components/ui/Badge'
import { Avatar } from '../components/ui/Avatar'
import { SearchBar } from '../components/shared/SearchBar'
import { SmartViewBar } from '../components/shared/SmartViewBar'
import { EntityListsToolbar } from '../components/shared/EntityListsToolbar'
import { EmptyState } from '../components/shared/EmptyState'
import { SlideOver, ConfirmDialog } from '../components/ui/Modal'
import { CompanyForm } from '../components/companies/CompanyForm'
import { Select } from '../components/ui/Select'
import { Toolbar } from '../components/ui/Toolbar'
import { PageHeader } from '../components/ui/PageHeader'
import { SkeletonRow, SkeletonCard } from '../components/ui/SkeletonRow'
import { toast } from '../store/toastStore'
import { COMPANY_SIZE_OPTIONS } from '../utils/constants'
import type { Company, CompanyStatus, SmartViewFilter } from '../types'
import { PermissionGate } from '../components/auth/PermissionGate'
import { useLocalizedCompanies, useTranslations, useUiLanguage } from '../i18n'
import { getIndustryLabel, getIndustryOptions } from '../lib/industries'
import { rowActivationKeyDown } from '../utils/a11y'
import { mergeCompanyFiltersForSave } from '../lib/entityListFilters'
import { useDistributionListsStore } from '../store/distributionListsStore'
import { findDuplicateCompanies } from '../utils/duplicateDetection'

const STATUS_COLORS: Record<string, BadgeVariant> = {
  prospect: 'warning',
  customer: 'success',
  partner: 'accent',
  churned: 'danger',
}

export function Companies() {
  const t = useTranslations()
  const uiLang = useUiLanguage()
  const navigate = useNavigate()
  const companies = useCompaniesStore((s) => s.companies)
  const addCompany = useCompaniesStore((s) => s.addCompany)
  const updateCompany = useCompaniesStore((s) => s.updateCompany)
  const deleteCompany = useCompaniesStore((s) => s.deleteCompany)
  const isLoading = useCompaniesStore((s) => s.isLoading)
  const listError = useCompaniesStore((s) => s.error)
  const localizedCompanies = useLocalizedCompanies(companies)
  const contacts = useContactsStore((s) => s.contacts)
  const deals = useDealsStore((s) => s.deals)

  const statusLabel = (status: string) => (t.companies.statusLabels as Record<string, string>)[status] ?? status

  const [search, setSearch] = useState('')
  const [industryFilter, setIndustryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sizeFilter, setSizeFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editCompany, setEditCompany] = useState<Company | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [viewFilters, setViewFilters] = useState<SmartViewFilter[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [bulkCompanyStatus, setBulkCompanyStatus] = useState('')
  const [distributionListId, setDistributionListId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [sortBy, setSortBy] = useState<'name' | 'industry' | 'updatedAt'>('name')
  const [showDuplicates, setShowDuplicates] = useState(false)

  const distributionLists = useDistributionListsStore((s) => s.lists)

  const distMemberSet = useMemo(() => {
    if (!distributionListId) return null
    const list = distributionLists.find(
      (l) => l.id === distributionListId && l.entityType === 'company',
    )
    if (!list) return null
    return new Set(list.memberIds)
  }, [distributionListId, distributionLists])

  useEffect(() => {
    if (!distributionListId) return
    if (!distributionLists.some((l) => l.id === distributionListId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: clears stale distributionListId when the selected list is removed from the store
      setDistributionListId(null)
    }
  }, [distributionListId, distributionLists])

  const applyViewFiltersFromBar = useCallback((filters: SmartViewFilter[]) => {
    setViewFilters(filters)
    setIndustryFilter('')
    setStatusFilter('')
    setSizeFilter('')
  }, [])

  const companyDuplicates = useMemo(() => findDuplicateCompanies(companies), [companies])

  const filtered = useMemo(() => {
    const list = localizedCompanies.filter((c) => {
      if (distMemberSet && !distMemberSet.has(c.id)) return false
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
      if (industryFilter && c.industry !== industryFilter) return false
      if (statusFilter && c.status !== statusFilter) return false
      if (sizeFilter && c.size !== sizeFilter) return false
      for (const vf of viewFilters) {
        const fieldValue = (c as unknown as Record<string, unknown>)[vf.field]
        if (vf.operator === 'eq' && fieldValue !== vf.value) return false
        if (vf.operator === 'neq' && fieldValue === vf.value) return false
        if (vf.operator === 'contains' && typeof fieldValue === 'string' && !fieldValue.toLowerCase().includes(String(vf.value).toLowerCase())) return false
      }
      return true
    })
    const sorted = list.slice().sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      if (sortBy === 'industry') {
        return getIndustryLabel(a.industry, uiLang).localeCompare(getIndustryLabel(b.industry, uiLang), undefined, { sensitivity: 'base' })
      }
      return b.updatedAt.localeCompare(a.updatedAt)
    })
    return sorted
  }, [localizedCompanies, distMemberSet, search, industryFilter, statusFilter, sizeFilter, viewFilters, sortBy, uiLang])

  const exportCSV = () => {
    const rows = [
      [t.companies.name, t.companies.industry, t.companies.size, t.companies.country, t.common.status, t.companies.domain],
      ...filtered.map((c) => [
        c.name,
        getIndustryLabel(c.industry, uiLang),
        c.size,
        c.country,
        statusLabel(c.status),
        c.domain || c.website || '',
      ]),
    ]
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'companies.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`${t.common.export} ${t.common.csv}`)
  }

  const hasFilters = industryFilter || statusFilter || sizeFilter

  const industryFilterOptions = useMemo(
    () => [{ value: '', label: t.common.all }, ...getIndustryOptions(uiLang)],
    [t.common.all, uiLang],
  )

  const handleCreate = (data: Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'contacts' | 'deals' | 'tags'>) => {
    addCompany({ ...data, contacts: [], deals: [], tags: [] })
    setIsFormOpen(false)
    toast.success(t.companies.created)
  }

  const handleEdit = (data: Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'contacts' | 'deals' | 'tags'>) => {
    if (!editCompany) return
    updateCompany(editCompany.id, data)
    setEditCompany(undefined)
    toast.success(t.companies.updated)
  }

  const handleDelete = (id: string) => {
    deleteCompany(id)
    toast.success(t.companies.deleted)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filtered.map(c => c.id)))
  }

  const handleBulkDelete = () => {
    selectedIds.forEach(id => useCompaniesStore.getState().deleteCompany(id))
    toast.success(`${selectedIds.size} ${t.companies.bulkDeleted}`)
    setSelectedIds(new Set())
    setShowBulkDelete(false)
  }

  return (
    <div className="crm-page space-y-4">
      <PageHeader
        showTitle={false}
        title={t.companies.title}
      />
      {listError && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
          {listError}
        </div>
      )}

      <Toolbar panel>
      <div className="flex items-center gap-3 flex-wrap w-full">
        <SearchBar value={search} onChange={setSearch} placeholder={t.common.searchPlaceholder} className="w-72" />
        <Button
          variant={showFilters ? 'secondary' : 'ghost'}
          size="sm"
          leftIcon={<Filter size={14} />}
          onClick={() => setShowFilters((v) => !v)}
        >
          {t.common.filters} {hasFilters ? '·' : ''}
        </Button>
        <div className="ml-auto flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <span className="text-xs text-fg-subtle">{selectedIds.size} {t.common.selected}</span>

              <div className="min-w-[10rem] max-w-[14rem]">
                <Select
                  ariaLabel={t.common.changeStatus}
                  value={bulkCompanyStatus}
                  onChange={(e) => {
                    const status = e.target.value as CompanyStatus
                    if (!status) return
                    selectedIds.forEach((id) => useCompaniesStore.getState().updateCompany(id, { status }))
                    toast.success(`${selectedIds.size} ${t.nav.companies.toLowerCase()} ${t.common.changeStatus.toLowerCase()} ${statusLabel(status)}`)
                    setSelectedIds(new Set())
                    setBulkCompanyStatus('')
                  }}
                  options={[
                    { value: '', label: `${t.common.changeStatus}...` },
                    { value: 'prospect', label: t.companies.statusLabels.prospect },
                    { value: 'customer', label: t.companies.statusLabels.customer },
                    { value: 'partner', label: t.companies.statusLabels.partner },
                    { value: 'churned', label: t.companies.statusLabels.churned },
                  ]}
                  listMaxHeightClass="max-h-48"
                />
              </div>

              <PermissionGate permission="companies:delete">
                <Button variant="danger" size="sm" leftIcon={<Trash2 size={14} />}
                  onClick={() => setShowBulkDelete(true)}>
                  {t.common.delete}
                </Button>
              </PermissionGate>
            </>
          )}
          <PermissionGate permission="companies:export">
            <Button variant="ghost" size="sm" leftIcon={<Download size={14} />} onClick={exportCSV}>
              {t.common.csv}
            </Button>
          </PermissionGate>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Search size={14} />}
            onClick={() => {
              if (companyDuplicates.length > 0) {
                setShowDuplicates(true)
              } else {
                toast.info(t.companies.noDuplicates)
              }
            }}
          >
            {t.companies.duplicates}
          </Button>
          <div className="flex rounded-xl border border-fg/10 bg-fg/[0.05] overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-label={`${t.common.view} ${t.nav.companies}`}
              className={`p-1.5 ${viewMode === 'table' ? 'bg-accent-600 text-fg' : 'text-fg-subtle hover:text-fg-muted'} transition-colors`}
            >
              <LayoutList size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label={`${t.common.view} grid`}
              className={`p-1.5 ${viewMode === 'grid' ? 'bg-accent-600 text-fg' : 'text-fg-subtle hover:text-fg-muted'} transition-colors`}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
          <PermissionGate permission="companies:create">
            <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setIsFormOpen(true)}>
              {t.companies.newCompany}
            </Button>
          </PermissionGate>
        </div>
      </div>
      </Toolbar>

      {/* Smart Views + saved / distribution lists */}
      <div className="space-y-3">
        <SmartViewBar entityType="company" onFiltersChange={applyViewFiltersFromBar} />
        <EntityListsToolbar
          entityType="company"
          getSavableFilters={() =>
            mergeCompanyFiltersForSave(viewFilters, {
              industryFilter,
              statusFilter,
              sizeFilter,
            })
          }
          distributionListId={distributionListId}
          onDistributionListIdChange={setDistributionListId}
          selectionIds={selectedIds}
          currentResultIds={filtered.map((c) => c.id)}
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex gap-3 flex-wrap items-center glass p-4">
          <Select
            options={industryFilterOptions}
            placeholder={t.companies.industry}
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            listMaxHeightClass="max-h-64"
          />
          <Select
            options={[
              { value: 'prospect', label: t.companies.statusLabels.prospect },
              { value: 'customer', label: t.companies.statusLabels.customer },
              { value: 'partner', label: t.companies.statusLabels.partner },
              { value: 'churned', label: t.companies.statusLabels.churned },
            ]}
            placeholder={t.common.status}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
          <Select
            options={COMPANY_SIZE_OPTIONS.map((s) => ({ value: s, label: s }))}
            placeholder={t.companies.size}
            value={sizeFilter}
            onChange={(e) => setSizeFilter(e.target.value)}
          />
          {hasFilters && (
            <Button
              variant="ghost" size="sm" leftIcon={<X size={14} />}
              onClick={() => { setIndustryFilter(''); setStatusFilter(''); setSizeFilter('') }}
            >
              {t.common.clear}
            </Button>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-xs text-fg-subtle">{filtered.length} {t.nav.companies.toLowerCase()}</p>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-fg-subtle">{t.common.filters}:</span>
          {(['name', 'industry', 'updatedAt'] as const).map((opt) => (
            <button
              type="button"
              key={opt}
              onClick={() => setSortBy(opt)}
              className={`text-xs px-2 py-0.5 rounded transition-colors ${
                sortBy === opt
                  ? 'bg-accent-600/30 text-accent-300 font-medium'
                  : 'text-fg-subtle hover:text-fg-muted'
              }`}
            >
              {opt === 'name' ? t.common.name : opt === 'industry' ? t.companies.sortIndustry : t.companies.sortUpdated}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'table' && (isLoading || filtered.length > 0) ? (
        <div className="glass overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{t.nav.companies}</caption>
            <thead>
              <tr className="contacts-table-head border-b border-fg/8">
                <th scope="col" className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                    aria-label={t.common.selectAll}
                    title={t.common.selectAll}
                    className="rounded border-fg/12 bg-fg/6 text-accent-500 focus:ring-accent-500"
                  />
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-fg-subtle uppercase tracking-wider">{t.companies.title}</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-fg-subtle uppercase tracking-wider">{t.companies.industry}</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-fg-subtle uppercase tracking-wider">{t.companies.size}</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-fg-subtle uppercase tracking-wider">{t.companies.country}</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-fg-subtle uppercase tracking-wider">{t.nav.contacts}</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-fg-subtle uppercase tracking-wider">{t.nav.deals}</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-fg-subtle uppercase tracking-wider">{t.common.status}</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-fg-subtle uppercase tracking-wider">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {isLoading ? (
                <SkeletonRow cols={9} rows={8} />
              ) : filtered.map((company) => {
                const contactCount = contacts.filter((c) => c.companyId === company.id).length
                const dealCount = deals.filter((d) => d.companyId === company.id).length
                return (
                  <tr
                    key={company.id}
                    tabIndex={0}
                    className="hover:bg-fg/4 cursor-pointer transition-colors"
                    onClick={() => navigate(`/companies/${company.id}`)}
                    onKeyDown={(e) =>
                      rowActivationKeyDown(e, () => navigate(`/companies/${company.id}`))
                    }
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(company.id)}
                        onChange={() => toggleSelect(company.id)}
                        aria-label={`${t.common.select} ${company.name}`}
                        title={`${t.common.select} ${company.name}`}
                        className="rounded border-fg/12 bg-fg/6 text-accent-500 focus:ring-accent-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={company.name} size="sm" />
                        <div>
                          <p className="font-medium text-fg">{company.name}</p>
                          <p className="text-xs text-fg-subtle">{company.domain || company.website}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-fg-muted text-xs">
                      {getIndustryLabel(company.industry, uiLang)}
                    </td>
                    <td className="px-4 py-3 text-fg-muted text-xs">{company.size || '-'}</td>
                    <td className="px-4 py-3 text-fg-muted text-xs">{company.country || '-'}</td>
                    <td className="px-4 py-3 text-fg-muted text-xs">{contactCount}</td>
                    <td className="px-4 py-3 text-fg-muted text-xs">{dealCount}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_COLORS[company.status]}>
                        {statusLabel(company.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <PermissionGate permission="companies:update">
                          <Button
                            variant="secondary" size="xs"
                            onClick={() => { setEditCompany(companies.find((c) => c.id === company.id) ?? company); setIsFormOpen(true) }}
                          >
                            {t.common.edit}
                          </Button>
                        </PermissionGate>
                        <PermissionGate permission="companies:delete">
                          <Button
                            variant="danger" size="xs"
                            onClick={() => setDeleteId(company.id)}
                          >
                            {t.common.delete}
                          </Button>
                        </PermissionGate>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
      ) : viewMode === 'grid' && (isLoading || filtered.length > 0) ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            : filtered.map((company) => {
                const contactCount = contacts.filter((c) => c.companyId === company.id).length
                const dealCount = deals.filter((d) => d.companyId === company.id).length
                return (
                  <div
                    key={company.id}
                    role="button"
                    tabIndex={0}
                    className="glass p-4 hover:border-fg/12 cursor-pointer transition relative"
                    onClick={() => navigate(`/companies/${company.id}`)}
                    onKeyDown={(e) =>
                      rowActivationKeyDown(e, () => navigate(`/companies/${company.id}`))
                    }
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar name={company.name} size="md" />
                      <div className="flex-1 min-w-0 pr-8">
                        <p className="font-semibold text-fg text-sm truncate">{company.name}</p>
                        <p className="text-xs text-fg-subtle truncate">{company.domain || company.website || t.common.emptyCell}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Badge variant={STATUS_COLORS[company.status]}>{statusLabel(company.status)}</Badge>
                      <p className="text-xs text-fg-subtle">{getIndustryLabel(company.industry, uiLang)}</p>
                      <p className="text-xs text-fg-muted">
                        {contactCount} {t.companies.contactCount.toLowerCase()} · {dealCount} {t.companies.dealCount.toLowerCase()}
                      </p>
                    </div>
                  </div>
                )
              })}
        </div>
      ) : !isLoading && filtered.length === 0 ? (
        <EmptyState
          icon={<Building2 size={28} />}
          title={t.companies.emptyTitle}
          action={{ label: t.companies.newCompany, onClick: () => setIsFormOpen(true) }}
        />
      ) : null}

      <SlideOver
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditCompany(undefined) }}
        title={editCompany ? t.companies.editCompany : t.companies.newCompany}
      >
        <CompanyForm
          company={editCompany}
          onSubmit={editCompany ? handleEdit : handleCreate}
          onCancel={() => { setIsFormOpen(false); setEditCompany(undefined) }}
        />
      </SlideOver>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) handleDelete(deleteId) }}
        title={`${t.common.delete} ${t.companies.title.toLowerCase()}`}
        message={t.common.bulkDeleteConfirm}
        confirmLabel={t.common.delete}
        danger
      />
      <ConfirmDialog
        isOpen={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title={`${t.common.delete} ${selectedIds.size} ${t.nav.companies.toLowerCase()}`}
        message={t.common.bulkDeleteConfirm}
        confirmLabel={t.common.delete}
        danger
      />

      {showDuplicates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDuplicates(false)} />
          <div className="relative w-full max-w-3xl max-h-[80vh] overflow-y-auto glass border border-fg/8 rounded-2xl shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-fg/8 bg-surface-2 rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-fg">{t.companies.duplicatesFound}</h2>
                <p className="text-xs text-fg-subtle mt-0.5">
                  {companyDuplicates.length} {t.companies.duplicates.toLowerCase()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDuplicates(false)}
                title={t.common.close}
                aria-label={t.common.close}
                className="p-2 rounded-lg text-fg-subtle hover:text-fg-muted hover:bg-fg/6 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">
              {companyDuplicates.map((group, groupIndex) => {
                const matchLabel =
                  group.matchType === 'domain' ? t.companies.domain : t.common.name
                const matchColor =
                  group.matchType === 'domain'
                    ? 'bg-info/15 text-info border-info/20'
                    : 'bg-warning/15 text-warning border-warning/20'
                return (
                  <div key={groupIndex} className="glass border border-fg/8 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${matchColor}`}>
                          {matchLabel}
                        </span>
                        <span className="text-xs text-fg-subtle">{group.confidence}%</span>
                      </div>
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => toast.info(`${t.companies.merge}...`)}
                      >
                        {t.companies.merge}
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {group.companies.map((company) => (
                        <div
                          key={company.id}
                          className="bg-fg/4 border border-fg/6 rounded-lg p-3 space-y-1.5"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar name={company.name} size="sm" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-fg truncate">{company.name}</p>
                              <p className="text-xs text-fg-subtle truncate">{company.domain || company.website || t.common.emptyCell}</p>
                            </div>
                          </div>
                          <div className="space-y-0.5 pl-8">
                            <Badge variant={STATUS_COLORS[company.status]}>{statusLabel(company.status)}</Badge>
                            <p className="text-xs text-fg-muted truncate">{getIndustryLabel(company.industry, uiLang)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
