import { ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { useTranslations } from '../../i18n'
import { useNavigationPrefsStore } from '../../store/navigationPrefsStore'
import { createDefaultNavigationPreferences } from '../../config/navigationDefaults'
import type { SidebarBuiltinItemId, SidebarCustomGroup, SidebarIconKey, SidebarSectionId } from '../../types/navigation'
import type { UserRole } from '../../types/auth'

const innerSurface = 'rounded-xl border border-border-subtle bg-surface-1'
const ICON_OPTIONS: SidebarIconKey[] = ['bookmark', 'flame', 'handshake', 'cloud', 'trending-up', 'settings', 'workflow', 'bar-chart-3']

export function NavigationSection() {
  const t = useTranslations()
  const navPrefs = useNavigationPrefsStore((s) => s.preferences)
  const updateNavPrefs = useNavigationPrefsStore((s) => s.updatePreferences)
  const resetNavPrefs = useNavigationPrefsStore((s) => s.resetPreferences)

  const sectionOptions: Array<{ id: SidebarSectionId; label: string }> = [
    { id: 'main', label: t.navSections.main },
    { id: 'sales', label: t.navSections.sales },
    { id: 'comms', label: t.navSections.comms },
    { id: 'config', label: t.navSections.config },
  ]

  const moveSection = (sectionId: SidebarSectionId, direction: -1 | 1) => {
    void updateNavPrefs((current) => {
      const idx = current.sectionOrder.indexOf(sectionId)
      if (idx < 0) return current
      const nextIndex = idx + direction
      if (nextIndex < 0 || nextIndex >= current.sectionOrder.length) return current
      const nextOrder = [...current.sectionOrder]
      const [moved] = nextOrder.splice(idx, 1)
      nextOrder.splice(nextIndex, 0, moved)
      return { ...current, sectionOrder: nextOrder }
    })
  }

  const moveBuiltinItem = (section: SidebarSectionId, itemId: SidebarBuiltinItemId, direction: -1 | 1) => {
    void updateNavPrefs((current) => {
      const source = current.itemOrderBySection[section]
      const idx = source.indexOf(itemId)
      if (idx < 0) return current
      const nextIndex = idx + direction
      if (nextIndex < 0 || nextIndex >= source.length) return current
      const nextOrder = [...source]
      const [moved] = nextOrder.splice(idx, 1)
      nextOrder.splice(nextIndex, 0, moved)
      return {
        ...current,
        itemOrderBySection: { ...current.itemOrderBySection, [section]: nextOrder },
      }
    })
  }

  const addCustomGroup = () => {
    void updateNavPrefs((current) => {
      const group: SidebarCustomGroup = {
        id: `grp-${Date.now().toString(36)}`,
        label: t.settings.navNewGroup,
        iconKey: 'bookmark',
        order: current.customGroups.length,
        items: [],
      }
      return { ...current, customGroups: [...current.customGroups, group] }
    })
  }

  return (
    <section className="crm-surface-section p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-fg">{t.settings.navEditorTitle}</h2>
          <p className="text-xs text-fg-subtle">{t.settings.navEditorSubtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={addCustomGroup}>{t.settings.navNewGroup}</Button>
          <Button size="sm" variant="ghost" onClick={() => { void resetNavPrefs() }}>{t.settings.navReset}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-fg-subtle">{t.settings.navBaseSections}</p>
          {sectionOptions.map((section) => {
            const hidden = navPrefs.hiddenSections.includes(section.id)
            return (
              <div key={section.id} className={`space-y-2 p-3 ${innerSurface}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-fg">{section.label}</p>
                  <div className="flex items-center gap-1">
                    <Button type="button" size="xs" variant="secondary" className="min-w-8 px-2" onClick={() => moveSection(section.id, -1)} aria-label={t.settings.navMoveUp} title={t.settings.navMoveUp}>
                      <ChevronUp size={14} />
                    </Button>
                    <Button type="button" size="xs" variant="secondary" className="min-w-8 px-2" onClick={() => moveSection(section.id, 1)} aria-label={t.settings.navMoveDown} title={t.settings.navMoveDown}>
                      <ChevronDown size={14} />
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant={hidden ? 'danger' : 'secondary'}
                      onClick={() => {
                        void updateNavPrefs((current) => ({
                          ...current,
                          hiddenSections: hidden
                            ? current.hiddenSections.filter((id) => id !== section.id)
                            : [...current.hiddenSections, section.id],
                        }))
                      }}
                    >
                      {hidden ? t.settings.navSectionHidden : t.settings.navSectionVisible}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  {(navPrefs.itemOrderBySection[section.id] ?? createDefaultNavigationPreferences().itemOrderBySection[section.id]).map((itemId) => {
                    const itemHidden = navPrefs.hiddenBuiltinItems.includes(itemId)
                    return (
                      <div key={itemId} className="flex items-center justify-between text-xs text-fg-muted rounded-lg border border-border-subtle bg-surface-2 px-2 py-1.5">
                        <span>{itemId}</span>
                        <div className="flex gap-1">
                          <Button type="button" size="xs" variant="secondary" className="min-w-7 px-1.5" onClick={() => moveBuiltinItem(section.id, itemId, -1)} aria-label={t.settings.navMoveUp} title={t.settings.navMoveUp}>
                            <ChevronUp size={12} />
                          </Button>
                          <Button type="button" size="xs" variant="secondary" className="min-w-7 px-1.5" onClick={() => moveBuiltinItem(section.id, itemId, 1)} aria-label={t.settings.navMoveDown} title={t.settings.navMoveDown}>
                            <ChevronDown size={12} />
                          </Button>
                          <Button
                            type="button"
                            size="xs"
                            variant={itemHidden ? 'danger' : 'secondary'}
                            onClick={() => {
                              void updateNavPrefs((current) => ({
                                ...current,
                                hiddenBuiltinItems: itemHidden
                                  ? current.hiddenBuiltinItems.filter((id) => id !== itemId)
                                  : [...current.hiddenBuiltinItems, itemId],
                              }))
                            }}
                          >
                            {itemHidden ? t.common.disabled : t.common.enabled}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-fg-subtle">{t.settings.navCustomGroups}</p>
          {navPrefs.customGroups.length === 0 && (
            <p className="text-xs text-fg-subtle">{t.settings.navNoCustomGroups}</p>
          )}
          {navPrefs.customGroups.map((group, index) => (
            <div key={group.id} className={`space-y-2 p-3 ${innerSurface}`}>
              <Input
                label={t.settings.navGroupName}
                value={group.label}
                onChange={(e) => {
                  const value = e.target.value
                  void updateNavPrefs((current) => ({
                    ...current,
                    customGroups: current.customGroups.map((g) => g.id === group.id ? { ...g, label: value } : g),
                  }))
                }}
              />
              <Select
                label={t.settings.navGroupIcon}
                value={group.iconKey ?? 'bookmark'}
                onChange={(e) => {
                  const value = e.target.value as SidebarIconKey
                  void updateNavPrefs((current) => ({
                    ...current,
                    customGroups: current.customGroups.map((g) => g.id === group.id ? { ...g, iconKey: value } : g),
                  }))
                }}
                options={ICON_OPTIONS.map((icon) => ({ value: icon, label: icon }))}
              />
              <div className="text-xs text-fg-muted">{t.settings.navItemsCount}: {group.items.length}</div>
              <div className="flex gap-2 flex-wrap">
                <span className="text-[11px] text-fg-subtle w-full">{t.settings.navRoleRules}</span>
                {(['admin', 'manager', 'sales_rep', 'viewer'] as UserRole[]).map((role) => {
                  const active = group.roleRules?.includes(role) ?? false
                  return (
                    <Button
                      type="button"
                      key={role}
                      size="xs"
                      variant={active ? 'secondary' : 'ghost'}
                      className={`text-[11px] ${active ? 'border border-accent-500/40' : 'border border-border-subtle'}`}
                      onClick={() => {
                        void updateNavPrefs((current) => ({
                          ...current,
                          customGroups: current.customGroups.map((g) => {
                            if (g.id !== group.id) return g
                            const roleRules = g.roleRules ?? []
                            return {
                              ...g,
                              roleRules: active ? roleRules.filter((r) => r !== role) : [...roleRules, role],
                            }
                          }),
                        }))
                      }}
                    >
                      {t.team.roleLabels[role]}
                    </Button>
                  )
                })}
              </div>
              <div className="flex gap-2">
                <Button
                  size="xs"
                  variant="secondary"
                  onClick={() => {
                    void updateNavPrefs((current) => ({
                      ...current,
                      customGroups: current.customGroups.map((g) => g.id === group.id ? {
                        ...g,
                        items: [...g.items, { id: `item-${Date.now().toString(36)}`, label: t.settings.navAddLink, to: '/settings' }],
                      } : g),
                    }))
                  }}
                >
                  {t.settings.navAddLink}
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    void updateNavPrefs((current) => ({
                      ...current,
                      customGroups: current.customGroups
                        .filter((g) => g.id !== group.id)
                        .map((g, idx) => ({ ...g, order: idx })),
                    }))
                  }}
                >
                  {t.settings.navDeleteGroup}
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    if (index === 0) return
                    void updateNavPrefs((current) => {
                      const next = [...current.customGroups]
                      const [moved] = next.splice(index, 1)
                      next.splice(index - 1, 0, moved)
                      return { ...current, customGroups: next.map((g, idx) => ({ ...g, order: idx })) }
                    })
                  }}
                >
                  {t.settings.navMoveUp}
                </Button>
              </div>
              {group.items.map((item) => (
                <div key={item.id} className="space-y-2 rounded-lg border border-border-subtle bg-surface-2 p-2">
                  <Input
                    label={t.settings.navLabel}
                    value={item.label}
                    onChange={(e) => {
                      const value = e.target.value
                      void updateNavPrefs((current) => ({
                        ...current,
                        customGroups: current.customGroups.map((g) => g.id === group.id
                          ? { ...g, items: g.items.map((it) => it.id === item.id ? { ...it, label: value } : it) }
                          : g),
                      }))
                    }}
                  />
                  <Input
                    label={t.settings.navRoute}
                    value={item.to ?? ''}
                    onChange={(e) => {
                      const value = e.target.value
                      void updateNavPrefs((current) => ({
                        ...current,
                        customGroups: current.customGroups.map((g) => g.id === group.id
                          ? { ...g, items: g.items.map((it) => it.id === item.id ? { ...it, to: value } : it) }
                          : g),
                      }))
                    }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
