import { Mail, Send, Inbox as InboxIcon, Loader2, Wifi, WifiOff, Clock, Plus } from 'lucide-react'
import { useTranslations } from '../../i18n'
import { PermissionGate } from '../../components/auth/PermissionGate'

export type FolderNavFolder = 'inbox' | 'sent' | 'scheduled' | 'drafts' | 'snoozed'

type FolderCounts = {
  total: number
  unread: number
}

export function FolderNav({
  folder,
  folderNav,
  gmailAddress,
  connected,
  connecting,
  disconnecting,
  onSelectFolder,
  onCompose,
  onConnect,
  onDisconnect,
}: {
  folder: FolderNavFolder
  folderNav: {
    inbox: FolderCounts
    sent: FolderCounts
    scheduled: FolderCounts
    drafts: FolderCounts
    snoozed: FolderCounts
  }
  gmailAddress: string | null
  connected: boolean
  connecting: boolean
  disconnecting: boolean
  onSelectFolder: (f: FolderNavFolder) => void
  onCompose: () => void
  onConnect: () => void
  onDisconnect: () => void
}) {
  const t = useTranslations()

  const FOLDERS = [
    { id: 'inbox' as const, label: t.inbox.title, icon: <InboxIcon size={15} />, ...folderNav.inbox },
    { id: 'sent' as const, label: t.inbox.sent, icon: <Send size={15} />, ...folderNav.sent },
    { id: 'scheduled' as const, label: t.email.sendLater, icon: <Clock size={15} />, ...folderNav.scheduled },
    { id: 'drafts' as const, label: t.inbox.drafts, icon: <Mail size={15} />, ...folderNav.drafts },
    { id: 'snoozed' as const, label: t.inbox.snoozed, icon: <Clock size={15} />, ...folderNav.snoozed },
  ]

  return (
    <nav
      className="w-full min-h-0 lg:w-[228px] lg:flex-shrink-0 border border-fg/10 rounded-xl lg:rounded-2xl overflow-hidden flex flex-col bg-surface-2/55 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
      aria-label={t.inbox.foldersNavLabel}
    >
      <div className="p-3 border-b border-fg/10 bg-surface-1/30">
        <PermissionGate permission="email:send">
          <button type="button"
            onClick={onCompose}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl btn-gradient text-fg text-xs font-semibold"
          >
            <Plus size={13} />
            {t.inbox.compose}
          </button>
        </PermissionGate>
      </div>

      <div className="px-3 py-2 border-b border-fg/10">
        {connected ? (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-success/10 border border-success/20">
            <Wifi size={11} className="text-success" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium text-success truncate">{gmailAddress ?? 'Gmail'}</p>
            </div>
            <button type="button"
              onClick={onDisconnect}
              disabled={disconnecting}
              className="text-fg-subtle hover:text-danger transition-colors"
              title={t.settings.disconnect}
              aria-label={t.settings.disconnect}
            >
              {disconnecting ? <Loader2 size={10} className="animate-spin" /> : <WifiOff size={10} />}
            </button>
          </div>
        ) : (
          <button type="button"
            onClick={onConnect}
            disabled={connecting}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-fg/4 hover:bg-accent-600/15 border border-fg/8 hover:border-accent-500/30 text-fg-subtle hover:text-accent-400 transition-colors text-[10px] font-medium"
          >
            {connecting ? <Loader2 size={11} className="animate-spin" /> : <Mail size={11} />}
            {t.settings.connect} Gmail
          </button>
        )}
      </div>

      <div className="flex-1 p-2 space-y-0.5 min-h-0 overflow-y-auto">
        {FOLDERS.map((f) => (
          <button type="button"
            key={f.id}
            onClick={() => onSelectFolder(f.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              folder === f.id
                ? 'nav-active text-fg font-semibold shadow-sm bg-fg/[0.06]'
                : 'text-fg-muted hover:text-fg hover:bg-fg/[0.05] font-medium'
            }`}
          >
            {f.icon}
            <span className="flex-1 text-left">{f.label}</span>
            <span className="flex items-center gap-1 shrink-0">
              {f.unread > 0 && (
                <span
                  className="inline-flex min-w-5 h-5 px-1 items-center justify-center rounded-full bg-accent-500/20 border border-accent-500/30 text-[10px] font-semibold text-accent-300"
                  title={t.inbox.folderUnreadTooltip}
                >
                  {f.unread}
                </span>
              )}
              <span
                className="text-[11px] tabular-nums font-medium text-fg-muted min-w-[1.1rem] text-right"
                title={t.inbox.folderTotalTooltip}
              >
                {f.total}
              </span>
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}
