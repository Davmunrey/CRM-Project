import { Plus, KanbanSquare, LayoutList } from 'lucide-react'
import { useTranslations } from '../../i18n'
import { Button } from '../../components/ui/Button'
import { PermissionGate } from '../../components/auth/PermissionGate'

export interface DealToolbarProps {
  viewMode: 'kanban' | 'list'
  onSetViewMode: (mode: 'kanban' | 'list') => void
  onOpenForm: () => void
}

export function DealToolbar({ viewMode, onSetViewMode, onOpenForm }: DealToolbarProps) {
  const t = useTranslations()

  return (
    <div className="ml-auto flex items-center gap-2">
      <div className="flex rounded-xl border border-fg/10 bg-fg/[0.05] overflow-hidden">
        <button
          type="button"
          onClick={() => onSetViewMode('kanban')}
          aria-label={t.deals.kanban}
          className={`p-1.5 ${viewMode === 'kanban' ? 'bg-accent-600 text-fg' : 'text-fg-subtle hover:text-fg-muted'} transition-colors`}
        >
          <KanbanSquare size={16} />
        </button>
        <button
          type="button"
          onClick={() => onSetViewMode('list')}
          aria-label={t.deals.list}
          className={`p-1.5 ${viewMode === 'list' ? 'bg-accent-600 text-fg' : 'text-fg-subtle hover:text-fg-muted'} transition-colors`}
        >
          <LayoutList size={16} />
        </button>
      </div>
      <PermissionGate permission="deals:create">
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={onOpenForm}>
          {t.deals.newDeal}
        </Button>
      </PermissionGate>
    </div>
  )
}
