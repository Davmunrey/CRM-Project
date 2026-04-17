import { Bell, Search, LogOut, User, ChevronDown, Check } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { DropdownMenuItem } from '../ui/DropdownMenu'
import { ThemeSwitcher } from '../ui/ThemeSwitcher'
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActivitiesStore } from '../../store/activitiesStore'
import { useCompaniesStore } from '../../store/companiesStore'
import { useContactsStore } from '../../store/contactsStore'
import { useNotificationsStore } from '../../store/notificationsStore'
import { getFollowUpReminders } from '../../utils/followUpEngine'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
// ROLE_LABELS removed — using t.team.roleLabels instead
import { formatRelativeDate } from '../../utils/formatters'
import { useTranslations } from '../../i18n'
import type { Activity, CRMNotification } from '../../types'
import type { FollowUpReminder } from '../../types'

interface TopbarProps {
  title: string
  onOpenCommandPalette?: () => void
}

/**
 * Uses manual store subscriptions via useState + useEffect to avoid the
 * Zustand v5 `useSyncExternalStore` + React StrictMode `getSnapshot` error
 * that occurs when persist middleware rehydrates between StrictMode passes.
 */
export function Topbar({ title, onOpenCommandPalette }: TopbarProps) {
  const t = useTranslations()
  const [showNotifs, setShowNotifs] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [branding, setBranding] = useState(useSettingsStore.getState().settings.branding)
  const navigate = useNavigate()

  // Auth – manual getState to avoid getSnapshot issues
  const [currentUser, setCurrentUser] = useState(useAuthStore.getState().currentUser)
  useEffect(() => {
    const unsub = useAuthStore.subscribe((s) => setCurrentUser(s.currentUser))
    return unsub
  }, [])
  useEffect(() => {
    const unsub = useSettingsStore.subscribe((s) => {
      setBranding(s.settings.branding)
    })
    return unsub
  }, [])

  // ── Manual subscriptions to avoid getSnapshot caching issue ────────────
  const [overdueActivities, setOverdue] = useState<Activity[]>([])
  const [urgentFollowUps, setUrgent] = useState<FollowUpReminder[]>([])
  const [recentNotifs, setRecentNotifs] = useState<CRMNotification[]>([])
  const [unreadNotifCount, setUnreadNotifCount] = useState(0)

  const computeNotifications = useCallback(() => {
    const activities = useActivitiesStore.getState().activities
    const contacts = useContactsStore.getState().contacts
    const companies = useCompaniesStore.getState().companies
    const now = new Date().toISOString()

    const overdue = activities.filter(
      (a) => a.status === 'pending' && a.dueDate && a.dueDate < now,
    )
    setOverdue(overdue)

    const reminders = getFollowUpReminders(contacts, activities, companies)
    setUrgent(reminders.filter((r) => r.urgency === 'critical' || r.urgency === 'high'))
  }, [])

  const computeNotifStore = useCallback(() => {
    const state = useNotificationsStore.getState()
    setRecentNotifs(state.notifications.slice(0, 5))
    setUnreadNotifCount(state.getUnreadCount())
  }, [])

  useEffect(() => {
    // Initial compute
    computeNotifications()
    computeNotifStore()

    // Subscribe to all stores
    const unsub1 = useActivitiesStore.subscribe(computeNotifications)
    const unsub2 = useContactsStore.subscribe(computeNotifications)
    const unsub3 = useCompaniesStore.subscribe(computeNotifications)
    const unsub4 = useNotificationsStore.subscribe(computeNotifStore)

    return () => { unsub1(); unsub2(); unsub3(); unsub4() }
  }, [computeNotifications, computeNotifStore])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotifs(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <header className="topbar-surface h-16 flex items-center gap-4 px-6 border-b border-fg/6 bg-surface-1 flex-shrink-0 relative z-30">
      <h1 className="text-base font-semibold text-fg mr-auto tracking-tight">
        <span className="text-fg-subtle mr-1">{branding.appName} ·</span> {title}
      </h1>

      <ThemeSwitcher variant="inline" />

      {/* Command palette trigger */}
      <button
        type="button"
        onClick={onOpenCommandPalette}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-2/90 border border-fg/8 hover:bg-fg/6 hover:border-fg/12 transition-all duration-150 text-fg-subtle hover:text-fg-muted text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
      >
        <Search size={13} />
        <span>{t.common.search}...</span>
        <kbd className="ml-2 px-1.5 py-0.5 rounded-md bg-fg/8 text-[10px] font-medium text-fg-subtle">⌘K</kbd>
      </button>

      {/* Notification bell */}
      <div className="relative">
        <button
          type="button"
          aria-label={t.nav.notifications}
          aria-expanded={showNotifs}
          onClick={() => setShowNotifs((v) => !v)}
          className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-fg-muted hover:text-fg hover:bg-fg/6 transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
        >
          <Bell size={17} />
          {(overdueActivities.length > 0 || urgentFollowUps.length > 0 || unreadNotifCount > 0) && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full bg-accent-500 shadow-brand-sm flex items-center justify-center">
              <span className="text-[9px] font-bold text-fg px-1">
                {Math.min(unreadNotifCount + overdueActivities.length, 99)}
              </span>
            </span>
          )}
        </button>

        {showNotifs && (
          <div className="popover-surface absolute right-0 top-full mt-2 w-96 border border-fg/10 rounded-2xl shadow-float overflow-hidden animate-scale-in z-50 bg-surface-1">
            <div className="px-4 py-3 border-b border-fg/6 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-fg">{t.nav.notifications}</p>
                {unreadNotifCount > 0 && (
                  <p className="text-xs text-accent-400 mt-0.5">{unreadNotifCount}</p>
                )}
              </div>
              <button type="button"
                onClick={() => { setShowNotifs(false); navigate('/notifications') }}
                className="text-xs text-accent-400 hover:text-accent-300 font-medium"
              >
                {t.common.view}
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {/* Store notifications */}
              {recentNotifs.length > 0 && recentNotifs.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-fg/4 hover:bg-fg/4 transition-colors cursor-pointer ${n.isRead ? 'opacity-50' : ''}`}
                  onClick={() => {
                    useNotificationsStore.getState().markAsRead(n.id)
                    setShowNotifs(false)
                    if (n.entityType === 'deal') navigate('/deals')
                    else if (n.entityType === 'lead' && n.entityId) navigate(`/leads/${n.entityId}`)
                    else if (n.entityType === 'contact' && n.entityId) navigate(`/contacts/${n.entityId}`)
                    else if (n.entityType === 'goal') navigate('/goals')
                    else navigate('/notifications')
                  }}
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-fg truncate flex-1">{n.title}</p>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-accent-500 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-fg-subtle mt-0.5 truncate">{n.message}</p>
                  <p className="text-[10px] text-fg-subtle mt-0.5">{formatRelativeDate(n.createdAt)}</p>
                </div>
              ))}

              {/* Overdue activities */}
              {overdueActivities.length > 0 && (
                <>
                  <div className="px-4 py-2 border-b border-fg/6 bg-danger/5">
                    <p className="text-xs font-semibold text-danger">
                      {overdueActivities.length} {t.activities.overdue}
                    </p>
                  </div>
                  {overdueActivities.slice(0, 3).map((act) => (
                    <div key={act.id} className="px-4 py-3 border-b border-fg/4 hover:bg-fg/4 transition-colors cursor-pointer"
                      onClick={() => { setShowNotifs(false); navigate('/activities') }}
                    >
                      <p className="text-sm text-fg truncate">{act.subject}</p>
                      <p className="text-xs text-danger mt-0.5">{formatRelativeDate(act.dueDate ?? '')}</p>
                    </div>
                  ))}
                </>
              )}

              {/* Follow-ups */}
              {urgentFollowUps.length > 0 && (
                <>
                  <div className="px-4 py-2 border-b border-fg/6 bg-warning/5">
                    <p className="text-xs font-semibold text-warning">{t.nav.followUps}</p>
                  </div>
                  {urgentFollowUps.slice(0, 3).map((fu) => (
                    <div
                      key={fu.contactId}
                      className="px-4 py-3 border-b border-fg/4 hover:bg-fg/4 transition-colors cursor-pointer"
                      onClick={() => { setShowNotifs(false); navigate(`/contacts/${fu.contactId}`) }}
                    >
                      <p className="text-sm text-fg truncate">{fu.contactName}</p>
                      <p className="text-xs text-warning mt-0.5">{fu.daysSinceContact}d</p>
                    </div>
                  ))}
                </>
              )}

              {recentNotifs.length === 0 && overdueActivities.length === 0 && urgentFollowUps.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-fg-subtle">{t.common.noResults}</div>
              )}
            </div>

            {/* Footer */}
            {unreadNotifCount > 0 && (
              <div className="px-4 py-2 border-t border-fg/6 text-center">
              <button
                type="button"
                aria-label={t.notifications.markAllRead}
                title={t.notifications.markAllRead}
                onClick={() => { useNotificationsStore.getState().markAllAsRead() }}
                className="inline-flex items-center justify-center min-h-9 min-w-9 rounded-lg text-fg-muted hover:text-fg hover:bg-fg/8 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
              >
                <Check size={16} strokeWidth={2.5} aria-hidden />
              </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showNotifs && (
        <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
      )}

      {/* User menu */}
      <div className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={showUserMenu}
          onClick={() => setShowUserMenu((v) => !v)}
          className="flex items-center gap-2.5 pl-4 border-l border-fg/8 hover:bg-fg/4 -ml-2 px-3 py-1.5 rounded-xl transition-colors min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
        >
          <Avatar name={currentUser?.name || ''} size="sm" />
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-fg">{currentUser?.name || ''}</p>
            <p className="text-[10px] text-fg-subtle">{currentUser ? t.team.roleLabels[currentUser.role] : ''}</p>
          </div>
          <ChevronDown size={12} className="text-fg-subtle hidden sm:block" />
        </button>

        {showUserMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
            <div className="popover-surface absolute right-0 top-full mt-2 w-56 border border-fg/10 rounded-xl shadow-float z-50 py-1 animate-scale-in bg-surface-1">
              <div className="px-3 py-2 border-b border-fg/6">
                <p className="text-xs font-semibold text-fg">{currentUser?.name}</p>
                <p className="text-[10px] text-fg-subtle">{currentUser?.email}</p>
              </div>
              <button type="button"
                onClick={() => { setShowUserMenu(false); navigate('/profile') }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-fg-muted hover:text-fg hover:bg-fg/6 transition-colors"
              >
                <User size={13} /> {t.auth.profile}
              </button>
              <div className="border-t border-fg/6 my-1" />
              <button type="button"
                onClick={() => { void useAuthStore.getState().logout().then(() => navigate('/login')) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-danger hover:bg-danger/10 transition-colors"
              >
                <LogOut size={13} /> {t.auth.logout}
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
