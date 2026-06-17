import { useState, useMemo } from 'react'
import { Avatar } from '../../components/ui/Avatar'
import { Checkbox } from '../../components/ui/Checkbox'
import { Select } from '../../components/ui/Select'
import { useTranslations } from '../../i18n'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import { useNotificationsStore, ALL_NOTIFICATION_TYPES } from '../../store/notificationsStore'
import { useAuditStore } from '../../store/auditStore'
import { toast } from '../../store/toastStore'
import { ALL_PERMISSIONS } from '../../utils/permissionProfiles'
import type { Permission, UserRole } from '../../types/auth'

export function PermissionsSection() {
  const t = useTranslations()
  const { settings, updatePermissionProfile } = useSettingsStore()
  const orgUsers = useAuthStore((s) => s.users)
  const { disabledTypes, toggleType } = useNotificationsStore()
  const [rbacRole, setRbacRole] = useState<UserRole>('manager')

  const usersForSettings = orgUsers.length > 0
    ? orgUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: t.team.roleLabels[user.role],
    }))
    : settings.users

  const rolePermissions = settings.permissionProfiles?.[rbacRole] ?? []

  const permissionGroups = useMemo(() => {
    const preferredOrder = ['contacts', 'companies', 'deals', 'activities', 'email', 'reports', 'templates', 'sequences', 'products', 'automations', 'goals', 'users', 'custom_fields', 'settings', 'audit', 'import', 'ai']
    const grouped = new Map<string, Permission[]>()
    for (const permission of ALL_PERMISSIONS) {
      const [resource] = permission.split(':')
      const list = grouped.get(resource) ?? []
      list.push(permission)
      grouped.set(resource, list)
    }
    const labels: Record<string, string> = {
      contacts: t.nav.contacts,
      companies: t.nav.companies,
      deals: t.nav.deals,
      activities: t.nav.activities,
      email: t.nav.inbox,
      reports: t.nav.reports,
      templates: t.nav.templates,
      sequences: t.nav.sequences,
      products: t.nav.products,
      automations: t.nav.automations,
      goals: t.nav.goals,
      users: t.settings.users,
      custom_fields: t.settings.customFields,
      settings: t.nav.settings,
      audit: t.nav.audit,
      import: t.settings.importExport,
      ai: t.nav.aiAssistant,
    }
    return Array.from(grouped.entries())
      .sort((a, b) => {
        const ai = preferredOrder.indexOf(a[0])
        const bi = preferredOrder.indexOf(b[0])
        if (ai === -1 && bi === -1) return a[0].localeCompare(b[0])
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      })
      .map(([resource, permissions]) => ({
        resource,
        label: labels[resource] ?? resource.replace('_', ' '),
        permissions,
      }))
  }, [t])

  const handleTogglePermission = (permission: Permission) => {
    const current = settings.permissionProfiles?.[rbacRole] ?? []
    const next = current.includes(permission)
      ? current.filter((p) => p !== permission)
      : [...current, permission]
    updatePermissionProfile(rbacRole, next)
    useAuditStore.getState().logAction(
      'permission_profile_updated',
      'settings',
      `permission-profile-${rbacRole}`,
      rbacRole,
      `${rbacRole} permissions updated (${next.length} grants)`
    )
    toast.success(t.settings.permissionsUpdated)
  }

  return (
    <>
      <section className="crm-surface-section p-6">
        <h2 className="text-base font-semibold text-fg mb-4">{t.settings.users}</h2>
        <div className="space-y-3">
          {usersForSettings.map((user) => (
            <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl border border-accent-500/25 bg-accent-500/5">
              <Avatar name={user.name} size="sm" />
              <div className="flex-1">
                <p className="text-sm font-medium text-fg">{user.name}</p>
                <p className="text-xs text-fg-subtle">{user.email} · {t.team.roleLabels[user.role as UserRole] ?? user.role}</p>
              </div>
              <span className="text-xs px-2 py-0.5 bg-accent-500/15 text-accent-400 rounded-full">{t.team.roleLabels[user.role as UserRole] ?? user.role}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-fg-subtle mt-3">{t.settings.usersAuthHint}</p>
      </section>

      <section className="crm-surface-section p-6">
        <h2 className="text-base font-semibold text-fg mb-2">{t.settings.permissionProfiles}</h2>
        <p className="text-xs text-fg-subtle mb-4">{t.settings.permissionProfilesHint}</p>
        <div className="max-w-xs mb-4">
          <Select
            label={t.team.role}
            value={rbacRole}
            onChange={(e) => setRbacRole(e.target.value as UserRole)}
            options={[
              { value: 'admin', label: t.team.roleLabels.admin },
              { value: 'manager', label: t.team.roleLabels.manager },
              { value: 'sales_rep', label: t.team.roleLabels.sales_rep },
              { value: 'viewer', label: t.team.roleLabels.viewer },
            ]}
          />
        </div>
        <div className="space-y-3">
          {permissionGroups.map((group) => (
            <div key={group.resource} className="rounded-xl border border-border-subtle bg-surface-1 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-fg">{group.label}</h3>
                <span className="text-[11px] text-fg-subtle">{group.permissions.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {group.permissions.map((permission) => {
                  const active = rolePermissions.includes(permission)
                  const [, action = permission] = permission.split(':')
                  const actionLabel = t.settings.permissionActionLabels[action as keyof typeof t.settings.permissionActionLabels]
                  return (
                    <label key={permission} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs transition-colors ${active ? 'border-accent-500/40 bg-accent-500/10 text-fg' : 'border-border-subtle bg-surface-2 text-fg-muted hover:bg-surface-1'}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <Checkbox
                          checked={active}
                          onChange={() => handleTogglePermission(permission)}
                          className="accent-accent-600"
                        />
                        <span className="truncate">{actionLabel ?? action.replace('_', ' ').toUpperCase()}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${active ? 'border-accent-500/40 text-accent-300 bg-accent-500/10' : 'border-border-subtle text-fg-subtle bg-surface-1'}`}>
                        {active ? t.common.enabled : t.common.disabled}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="crm-surface-section p-6">
        <h2 className="text-base font-semibold text-fg mb-1">{t.settings.notifications}</h2>
        <p className="text-xs text-fg-subtle mb-4">{t.common.enabled} / {t.common.disabled}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ALL_NOTIFICATION_TYPES.map((type) => {
            const enabled = !disabledTypes.has(type)
            return (
              <button type="button"
                key={type}
                onClick={() => toggleType(type)}
                className={`focus-ring flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium transition ${
                  enabled
                    ? 'bg-accent-500/10 border-accent-500/30 text-fg'
                    : 'bg-fg/3 border-fg/8 text-fg-subtle hover:text-fg-muted'
                }`}
              >
                <span>{t.settings.notifTypeLabels[type]}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  enabled ? 'bg-accent-500/20 text-accent-300' : 'bg-fg/8 text-fg-subtle'
                }`}>
                  {enabled ? t.common.enabled : t.common.disabled}
                </span>
              </button>
            )
          })}
        </div>
      </section>
    </>
  )
}
