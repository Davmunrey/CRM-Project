import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Trash2, AtSign } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { useTranslations } from '../../i18n'
import { formatRelativeDate } from '../../utils/formatters'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'
import { toast } from '../../store/toastStore'

export type UpdateEntityType = 'contact' | 'company' | 'deal' | 'lead'

interface UpdateRow {
  id: string
  parentId: string | null
  authorId: string | null
  authorName: string | null
  authorAvatar: string | null
  body: string
  mentions: string[]
  createdAt: string
}

const MENTION_TOKEN_SRC = '@\\[([^\\]]+)\\]\\(([0-9a-fA-F-]{36})\\)'

/** Render body text, turning `@[Name](id)` tokens into styled @Name chips. */
function renderBody(body: string): ReactNode[] {
  const parts: ReactNode[] = []
  const re = new RegExp(MENTION_TOKEN_SRC, 'g')
  let last = 0
  let key = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(body)) !== null) {
    if (m.index > last) parts.push(body.slice(last, m.index))
    parts.push(
      <span key={`m${key++}`} className="text-accent-400 font-medium">
        @{m[1]}
      </span>,
    )
    last = m.index + m[0].length
  }
  if (last < body.length) parts.push(body.slice(last))
  return parts
}

function Composer({
  placeholder,
  submitLabel,
  autoFocus,
  onCancel,
  onSubmit,
}: {
  placeholder: string
  submitLabel: string
  autoFocus?: boolean
  onCancel?: () => void
  onSubmit: (body: string) => Promise<void>
}) {
  const t = useTranslations()
  const members = useAuthStore((s) => s.users)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState<string | null>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  const matches = useMemo(() => {
    if (query === null) return []
    const q = query.toLowerCase()
    return members.filter((u) => u.isActive && u.name.toLowerCase().includes(q)).slice(0, 6)
  }, [query, members])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    setText(v)
    const caret = e.target.selectionStart ?? v.length
    const m = /@(\w*)$/.exec(v.slice(0, caret))
    setQuery(m ? (m[1] ?? '') : null)
  }

  const insertMention = (u: { id: string; name: string }) => {
    const ta = taRef.current
    const caret = ta?.selectionStart ?? text.length
    const head = text.slice(0, caret).replace(/@(\w*)$/, `@[${u.name}](${u.id}) `)
    setText(head + text.slice(caret))
    setQuery(null)
    requestAnimationFrame(() => ta?.focus())
  }

  const submit = async () => {
    const body = text.trim()
    if (!body || busy) return
    setBusy(true)
    try {
      await onSubmit(body)
      setText('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={taRef}
        value={text}
        onChange={handleChange}
        placeholder={placeholder}
        rows={3}
        autoFocus={autoFocus}
        className="w-full rounded-xl border border-fg/10 bg-surface-1 px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent-500/40 resize-y"
      />
      {query !== null && matches.length > 0 && (
        <div className="absolute z-10 mt-1 w-64 rounded-xl border border-fg/10 bg-surface-2 shadow-lg overflow-hidden">
          <p className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-fg-subtle">{t.updates.mentionLabel}</p>
          {matches.map((u) => (
            <button
              key={u.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                insertMention(u)
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg hover:bg-fg/5"
            >
              <Avatar name={u.name} size="xs" imageUrl={u.avatar} />
              {u.name}
            </button>
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2">
        <Button type="button" size="sm" onClick={() => void submit()} loading={busy} disabled={!text.trim()}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            {t.updates.cancel}
          </Button>
        )}
      </div>
    </div>
  )
}

function UpdateItem({
  u,
  canDelete,
  onReply,
  onDelete,
  children,
}: {
  u: UpdateRow
  canDelete: boolean
  onReply?: () => void
  onDelete: () => void
  children?: ReactNode
}) {
  const t = useTranslations()
  return (
    <div className="flex gap-3">
      <Avatar name={u.authorName ?? '?'} size="sm" imageUrl={u.authorAvatar ?? undefined} />
      <div className="min-w-0 flex-1">
        <div className="rounded-xl border border-fg/8 bg-surface-1 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-fg">{u.authorName ?? '—'}</span>
            <span className="text-[11px] text-fg-subtle">{formatRelativeDate(u.createdAt)}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-fg-muted">{renderBody(u.body)}</p>
        </div>
        <div className="mt-1 flex items-center gap-3 pl-1">
          {onReply && (
            <button type="button" onClick={onReply} className="text-xs text-fg-subtle hover:text-accent-400">
              {t.updates.reply}
            </button>
          )}
          {canDelete && (
            <button type="button" onClick={onDelete} className="text-xs text-fg-subtle hover:text-danger inline-flex items-center gap-1">
              <Trash2 size={12} aria-hidden /> {t.updates.delete}
            </button>
          )}
        </div>
        {children && <div className="mt-2 space-y-2">{children}</div>}
      </div>
    </div>
  )
}

export function UpdatesPanel({ entityType, entityId }: { entityType: UpdateEntityType; entityId: string }) {
  const t = useTranslations()
  const currentUser = useAuthStore((s) => s.currentUser)
  // Backend enforces delete (author or owner/admin/manager); this only gates the button.
  const role = currentUser?.role as string | undefined
  const elevated = role === 'owner' || role === 'admin' || role === 'manager'
  const [items, setItems] = useState<UpdateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [replyTo, setReplyTo] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ data: UpdateRow[] }>(
        `/updates?entityType=${entityType}&entityId=${encodeURIComponent(entityId)}`,
      )
      setItems(res?.data ?? [])
    } catch {
      toast.error(t.updates.loadError)
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId, t.updates.loadError])

  useEffect(() => {
    void load()
  }, [load])

  const post = async (body: string, parentId?: string) => {
    try {
      await api.post('/updates', parentId ? { entityType, entityId, body, parentId } : { entityType, entityId, body })
      setReplyTo(null)
      await load()
    } catch {
      toast.error(t.updates.postError)
    }
  }

  const remove = async (id: string) => {
    if (!window.confirm(t.updates.deleteConfirm)) return
    try {
      await api.delete(`/updates/${id}`)
      await load()
    } catch {
      toast.error(t.updates.postError)
    }
  }

  const canDelete = (u: UpdateRow) => elevated || (currentUser?.id != null && u.authorId === currentUser.id)
  const topLevel = items.filter((u) => !u.parentId)
  const repliesOf = (id: string) => items.filter((u) => u.parentId === id)

  return (
    <div className="space-y-4">
      <Composer placeholder={t.updates.composerPlaceholder} submitLabel={t.updates.post} onSubmit={(b) => post(b)} />

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : topLevel.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-fg-subtle">
          <AtSign size={20} aria-hidden />
          {t.updates.empty}
        </div>
      ) : (
        <div className="space-y-4">
          {topLevel.map((u) => (
            <UpdateItem key={u.id} u={u} canDelete={canDelete(u)} onReply={() => setReplyTo(replyTo === u.id ? null : u.id)} onDelete={() => void remove(u.id)}>
              {repliesOf(u.id).map((r) => (
                <UpdateItem key={r.id} u={r} canDelete={canDelete(r)} onDelete={() => void remove(r.id)} />
              ))}
              {replyTo === u.id && (
                <Composer
                  placeholder={t.updates.replyPlaceholder}
                  submitLabel={t.updates.reply}
                  autoFocus
                  onCancel={() => setReplyTo(null)}
                  onSubmit={(b) => post(b, u.id)}
                />
              )}
            </UpdateItem>
          ))}
        </div>
      )}
    </div>
  )
}
