import type { SmartViewFilter } from '../types'

/** Merge Smart View chips + toolbar filters into a single filter list for saving as a Smart View. */
export function mergeContactFiltersForSave(
  viewFilters: SmartViewFilter[],
  opts: {
    statusFilter: string
    sourceFilter: string
    assignedFilter: string
    myDataOnly: boolean
    currentUserName?: string
  },
): SmartViewFilter[] {
  const map = new Map<string, SmartViewFilter>()
  for (const f of viewFilters) {
    map.set(f.field, f)
  }
  if (opts.statusFilter) {
    map.set('status', { field: 'status', operator: 'eq', value: opts.statusFilter })
  }
  if (opts.sourceFilter) {
    map.set('source', { field: 'source', operator: 'eq', value: opts.sourceFilter })
  }
  if (opts.myDataOnly && opts.currentUserName) {
    map.set('assignedTo', { field: 'assignedTo', operator: 'eq', value: opts.currentUserName })
  } else if (opts.assignedFilter) {
    map.set('assignedTo', { field: 'assignedTo', operator: 'eq', value: opts.assignedFilter })
  }
  return Array.from(map.values())
}

export function mergeCompanyFiltersForSave(
  viewFilters: SmartViewFilter[],
  opts: {
    industryFilter: string
    statusFilter: string
    sizeFilter: string
  },
): SmartViewFilter[] {
  const map = new Map<string, SmartViewFilter>()
  for (const f of viewFilters) {
    map.set(f.field, f)
  }
  if (opts.industryFilter) {
    map.set('industry', { field: 'industry', operator: 'eq', value: opts.industryFilter })
  }
  if (opts.statusFilter) {
    map.set('status', { field: 'status', operator: 'eq', value: opts.statusFilter })
  }
  if (opts.sizeFilter) {
    map.set('size', { field: 'size', operator: 'eq', value: opts.sizeFilter })
  }
  return Array.from(map.values())
}
