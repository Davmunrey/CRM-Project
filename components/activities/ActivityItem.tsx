import {
  Phone, Mail, Users, FileText, CheckSquare, Linkedin,
  Check, Clock, X, Edit2,
} from 'lucide-react'
import type { Activity, ActivityType } from '../../types'
import { formatDate, formatRelativeDate } from '../../utils/formatters'
import { useTranslations } from '../../i18n'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

const TYPE_ICONS: Record<ActivityType, React.ReactNode> = {
  call: <Phone size={14} />,
  email: <Mail size={14} />,
  meeting: <Users size={14} />,
  note: <FileText size={14} />,
  task: <CheckSquare size={14} />,
  linkedin: <Linkedin size={14} />,
}

const TYPE_COLORS: Record<ActivityType, string> = {
  call: 'bg-info/15 text-info',
  email: 'bg-accent-500/15 text-accent-300',
  meeting: 'bg-success/15 text-success',
  note: 'bg-warning/15 text-warning',
  task: 'bg-accent-600/15 text-accent-400',
  linkedin: 'bg-info/18 text-info',
}

interface ActivityItemProps {
  activity: Activity
  onComplete?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  showActions?: boolean
}

export function ActivityItem({ activity, onComplete, onEdit, onDelete, showActions = true }: ActivityItemProps) {
  const t = useTranslations()
  const isOverdue = activity.status === 'pending' && activity.dueDate &&
    activity.dueDate < new Date().toISOString().split('T')[0]

  return (
    <div className={`flex gap-3 p-3 rounded-xl ${isOverdue ? 'bg-danger/5 border border-danger/20' : 'hover:bg-fg/[0.04]'} transition-colors`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${TYPE_COLORS[activity.type]}`}>
        {TYPE_ICONS[activity.type]}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-fg truncate">{activity.subject}</p>
            <p className="text-xs text-fg-subtle mt-0.5 line-clamp-2">{activity.description}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {activity.status === 'completed' ? (
              <Badge variant="success"><Check size={10} className="mr-0.5" />{t.activities.statusLabels.completed}</Badge>
            ) : activity.status === 'cancelled' ? (
              <Badge variant="neutral">{t.activities.statusLabels.cancelled}</Badge>
            ) : (
              <Badge variant={isOverdue ? 'danger' : 'warning'}>
                <Clock size={10} className="mr-0.5" />
                {isOverdue ? t.activities.overdue : t.activities.statusLabels.pending}
              </Badge>
            )}
          </div>
        </div>

        {activity.outcome && (
          <p className="text-xs text-fg-muted mt-1 italic">&quot;{activity.outcome}&quot;</p>
        )}

        <div className="flex items-center gap-3 mt-2">
          <span className="text-[10px] text-fg-subtle">{t.activities.typeLabels[activity.type]}</span>
          {activity.dueDate && (
            <span className={`text-[10px] ${isOverdue ? 'text-danger' : 'text-fg-subtle'}`}>
              {formatDate(activity.dueDate)}
            </span>
          )}
          <span className="text-[10px] text-fg-subtle">{activity.createdBy}</span>
          <span className="text-[10px] text-fg-subtle ml-auto">{formatRelativeDate(activity.createdAt)}</span>
        </div>
      </div>

      {showActions && (
        <div className="flex items-start gap-1 flex-shrink-0">
          {activity.status === 'pending' && onComplete && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onComplete(activity.id)}
              aria-label={t.activities.completed}
              className="p-1 text-success hover:text-success/80"
            >
              <Check size={14} />
            </Button>
          )}
          {onEdit && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onEdit(activity.id)}
              aria-label={t.common.edit}
              className="p-1 text-fg-muted hover:text-fg"
            >
              <Edit2 size={14} />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onDelete(activity.id)}
              aria-label={t.common.delete}
              className="p-1 text-danger hover:text-danger/80"
            >
              <X size={14} />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
