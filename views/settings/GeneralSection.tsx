import { useState } from 'react'
import { Globe, Tag, Plus, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Tabs } from '../../components/ui/Tabs'
import { useTranslations, useI18nStore, LANGUAGE_LABELS, LANGUAGE_FLAGS } from '../../i18n'
import { useSettingsStore } from '../../store/settingsStore'
import { toast } from '../../store/toastStore'
import type { Language } from '../../i18n'
import type { DealCurrency } from '../../types'

export function GeneralSection() {
  const t = useTranslations()
  const { language, setLanguage, languageMode, setLanguageMode } = useI18nStore()
  const resolvedLanguageMode = languageMode ?? 'manual'
  const { settings, updateThemePreference, updateUiDensity, updateCurrency, addTag, removeTag } = useSettingsStore()

  const [newTag, setNewTag] = useState('')

  const handleAddTag = () => {
    const trimmed = newTag.trim()
    if (!trimmed) return
    if (settings.tags.includes(trimmed)) {
      toast.error(t.errors.duplicateTag)
      return
    }
    addTag(trimmed)
    setNewTag('')
    toast.success(t.common.add + ' ✓')
  }

  return (
    <>
      <section className="crm-surface-section p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-info/20 flex items-center justify-center">
            <Globe size={14} className="text-info" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-fg">{t.settings.language}</h2>
            <p className="text-xs text-fg-subtle">{t.settings.general}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 md:gap-3">
          {(['en', 'es', 'pt', 'fr', 'de', 'it'] as Language[]).map((lang) => (
            <button
              type="button"
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`focus-ring inline-flex shrink-0 items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-colors ${
                language === lang
                  ? 'bg-accent-500/20 text-accent-400 border-accent-500/30'
                  : 'bg-fg/5 text-fg-muted border-fg/8 hover:bg-fg/8 hover:text-fg'
              }`}
            >
              <span className="text-base leading-none">{LANGUAGE_FLAGS[lang]}</span>
              <span>{LANGUAGE_LABELS[lang]}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-2">
          <p className="text-xs font-medium text-fg-muted">{t.settings.languageModeHelp}</p>
          <Tabs
            tabs={[
              { id: 'browser', label: t.settings.languageModeBrowser },
              { id: 'manual', label: t.settings.languageModeManual },
            ]}
            activeId={resolvedLanguageMode}
            onChange={(id) => setLanguageMode(id as 'browser' | 'manual')}
          />
        </div>

        <div className="mt-4 max-w-xs space-y-4">
          <Select
            label={t.settings.theme}
            value={settings.themePreference}
            onChange={(e) => updateThemePreference(e.target.value as 'system' | 'light' | 'dark')}
            options={[
              { value: 'system', label: t.settings.themeSystem },
              { value: 'light', label: t.settings.themeLight },
              { value: 'dark', label: t.settings.themeDark },
            ]}
          />
          <Select
            label={t.settings.uiDensity}
            value={settings.uiDensity}
            onChange={(e) => updateUiDensity(e.target.value as 'comfortable' | 'compact')}
            options={[
              { value: 'comfortable', label: t.settings.uiDensityComfortable },
              { value: 'compact', label: t.settings.uiDensityCompact },
            ]}
            hint={t.settings.uiDensityHelp}
          />
        </div>
      </section>

      <section className="crm-surface-section p-6">
        <h2 className="text-base font-semibold text-fg mb-4">{t.settings.currency}</h2>
        <Select
          label={t.settings.currency}
          options={[
            { value: 'EUR', label: t.settings.currencyLabels.eur },
            { value: 'USD', label: t.settings.currencyLabels.usd },
            { value: 'GBP', label: t.settings.currencyLabels.gbp },
          ]}
          value={settings.currency}
          onChange={(e) => updateCurrency(e.target.value as DealCurrency)}
          className="max-w-xs"
        />
      </section>

      <section className="crm-surface-section p-6">
        <h2 className="text-base font-semibold text-fg mb-4">{t.settings.tags}</h2>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder={t.settings.newTagPlaceholder}
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }}
            leftIcon={<Tag size={14} />}
            className="flex-1"
          />
          <Button size="sm" leftIcon={<Plus size={14} />} onClick={handleAddTag}>
            {t.common.add}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {settings.tags.map((tag) => (
            <div key={tag} className="flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-2 px-2 py-1 pl-3">
              <span className="text-xs text-fg-muted">{tag}</span>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={() => { removeTag(tag); toast.success(t.common.delete + ' ✓') }}
                aria-label={`${t.settings.deleteTagAriaLabel} ${tag}`}
                className="min-h-7 px-1.5 text-fg-subtle hover:text-danger"
              >
                <Trash2 size={11} />
              </Button>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
