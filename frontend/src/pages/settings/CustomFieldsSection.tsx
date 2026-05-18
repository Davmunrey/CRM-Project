import { useState, useEffect } from 'react'
import { Plus, Trash2, SlidersHorizontal, Pencil, X, Check } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Select } from '../../components/ui/Select'
import { Tabs } from '../../components/ui/Tabs'
import { ConfirmDialog } from '../../components/ui/Modal'
import { PermissionGate } from '../../components/auth/PermissionGate'
import { useTranslations } from '../../i18n'
import { useCustomFieldsStore } from '../../store/customFieldsStore'
import { toast } from '../../store/toastStore'
import { useI18nStore } from '../../i18n'
import type { CustomFieldEntityType, CustomFieldType } from '../../types'

const ENTITY_TABS: CustomFieldEntityType[] = ['contact', 'company', 'deal']

const FIELD_TYPES: CustomFieldType[] = [
  'text', 'number', 'date', 'select', 'multiselect',
  'checkbox', 'url', 'email', 'currency', 'textarea',
]

const innerSurface = 'rounded-xl border border-border-subtle bg-surface-1'

export function CustomFieldsSection() {
  const t = useTranslations()
  const { language } = useI18nStore()

  const [, setCfDefinitions] = useState(() => useCustomFieldsStore.getState().definitions)
  useEffect(() => useCustomFieldsStore.subscribe((s) => setCfDefinitions(s.definitions)), [])

  const [cfActiveEntity, setCfActiveEntity] = useState<CustomFieldEntityType>('contact')
  const [cfShowForm, setCfShowForm] = useState(false)
  const [cfEditingId, setCfEditingId] = useState<string | null>(null)
  const [cfDeleteId, setCfDeleteId] = useState<string | null>(null)

  const [cfLabel, setCfLabel] = useState('')
  const [cfFieldType, setCfFieldType] = useState<CustomFieldType>('text')
  const [cfOptions, setCfOptions] = useState('')
  const [cfPlaceholder, setCfPlaceholder] = useState('')
  const [cfRequired, setCfRequired] = useState(false)
  const [cfIsActive, setCfIsActive] = useState(true)

  const cfEntityDefs = useCustomFieldsStore.getState().getDefinitionsForEntity(cfActiveEntity)

  const cfResetForm = () => {
    setCfLabel('')
    setCfFieldType('text')
    setCfOptions('')
    setCfPlaceholder('')
    setCfRequired(false)
    setCfIsActive(true)
    setCfEditingId(null)
    setCfShowForm(false)
  }

  const cfOpenNew = () => {
    cfResetForm()
    setCfShowForm(true)
  }

  const cfOpenEdit = (id: string) => {
    const localizedDefs = useCustomFieldsStore.getState().getDefinitionsForEntity(cfActiveEntity)
    const def = localizedDefs.find((d) => d.id === id)
    if (!def) return
    setCfLabel(def.label)
    setCfFieldType(def.fieldType)
    setCfOptions(def.options?.join('\n') ?? '')
    setCfPlaceholder(def.placeholder ?? '')
    setCfRequired(def.required)
    setCfIsActive(def.isActive)
    setCfEditingId(id)
    setCfShowForm(true)
  }

  const cfHandleSave = () => {
    const trimmedLabel = cfLabel.trim()
    if (!trimmedLabel) { toast.error(`${t.settings.fieldName} ${t.settings.required}`); return }

    const optionsArray = ['select', 'multiselect'].includes(cfFieldType)
      ? cfOptions.split('\n').map((o) => o.trim()).filter(Boolean)
      : undefined

    if (['select', 'multiselect'].includes(cfFieldType) && (!optionsArray || optionsArray.length === 0)) {
      toast.error(`${t.settings.options} ${t.settings.required}`)
      return
    }

    if (cfEditingId) {
      useCustomFieldsStore.getState().updateDefinition(cfEditingId, {
        ...(language === 'en' ? {
          label: trimmedLabel,
          options: optionsArray,
          placeholder: cfPlaceholder.trim() || undefined,
        } : {}),
        fieldType: cfFieldType,
        required: cfRequired,
        isActive: cfIsActive,
      })
      if (language !== 'en') {
        // Non-English edits update localized presentation metadata for the active locale.
        useCustomFieldsStore.getState().upsertTranslation(cfEditingId, language, {
          label: trimmedLabel,
          placeholder: cfPlaceholder.trim() || undefined,
          options: optionsArray,
        })
      }
      toast.success(t.common.save + ' ✓')
    } else {
      useCustomFieldsStore.getState().addDefinition({
        entityType: cfActiveEntity,
        label: trimmedLabel,
        fieldType: cfFieldType,
        options: optionsArray,
        placeholder: cfPlaceholder.trim() || undefined,
        required: cfRequired,
        isActive: cfIsActive,
      })
      toast.success(t.common.create + ' ✓')
    }
    cfResetForm()
  }

  const cfHandleDelete = (id: string) => {
    useCustomFieldsStore.getState().deleteDefinition(id)
    toast.success(t.common.delete + ' ✓')
    setCfDeleteId(null)
  }

  const cfToggleActive = (id: string, current: boolean) => {
    useCustomFieldsStore.getState().updateDefinition(id, { isActive: !current })
  }

  const cfToggleRequired = (id: string, current: boolean) => {
    useCustomFieldsStore.getState().updateDefinition(id, { required: !current })
  }

  return (
    <>
      <section className="crm-surface-section p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent-500/20 flex items-center justify-center">
              <SlidersHorizontal size={14} className="text-accent-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-fg">{t.settings.customFields}</h2>
              <p className="text-xs text-fg-subtle">{t.settings.entityLabels.contact}, {t.settings.entityLabels.company}, {t.settings.entityLabels.deal}</p>
            </div>
          </div>
          <PermissionGate permission="custom_fields:update">
            <Button size="sm" leftIcon={<Plus size={13} />} onClick={cfOpenNew}>
              {t.common.add}
            </Button>
          </PermissionGate>
        </div>

        <div className="mb-4">
          <Tabs
            tabs={ENTITY_TABS.map((et) => ({ id: et, label: t.settings.entityLabels[et] }))}
            activeId={cfActiveEntity}
            onChange={(id) => {
              setCfActiveEntity(id as CustomFieldEntityType)
              cfResetForm()
            }}
            className="w-full min-w-0 [&>div]:w-full [&>div]:flex-wrap"
          />
        </div>

        {cfShowForm && (
          <div className="mb-4 p-4 rounded-xl border border-border-subtle bg-surface-2 space-y-3">
            <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide">
              {cfEditingId ? `${t.common.edit}` : `${t.common.add} - ${t.settings.entityLabels[cfActiveEntity]}`}
            </p>

            <div className="flex gap-3">
              <div className="flex-1 min-w-0">
                <Input
                  label={t.settings.fieldName}
                  value={cfLabel}
                  onChange={(e) => setCfLabel(e.target.value)}
                  placeholder={t.settings.fieldPlaceholderHint}
                />
              </div>
              <div className="w-44 min-w-0">
                <Select
                  label={t.settings.fieldType}
                  value={cfFieldType}
                  onChange={(e) => setCfFieldType(e.target.value as CustomFieldType)}
                  options={FIELD_TYPES.map((ft) => ({ value: ft, label: t.settings.fieldTypeLabels[ft] }))}
                  listMaxHeightClass="max-h-56"
                />
              </div>
            </div>

            {['select', 'multiselect'].includes(cfFieldType) && (
              <Textarea
                label={t.settings.options}
                value={cfOptions}
                onChange={(e) => setCfOptions(e.target.value)}
                placeholder={t.settings.optionsPlaceholder}
                rows={4}
              />
            )}

            {!['checkbox', 'date'].includes(cfFieldType) && (
              <Input
                label={t.settings.placeholder}
                value={cfPlaceholder}
                onChange={(e) => setCfPlaceholder(e.target.value)}
                placeholder={t.settings.valuePlaceholderHint}
              />
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="xs"
                variant={cfRequired ? 'secondary' : 'ghost'}
                onClick={() => setCfRequired((v) => !v)}
                leftIcon={<span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfRequired ? 'bg-warning' : 'bg-fg-subtle'}`} aria-hidden />}
              >
                {t.settings.required}
              </Button>
              <Button
                type="button"
                size="xs"
                variant={cfIsActive ? 'secondary' : 'ghost'}
                onClick={() => setCfIsActive((v) => !v)}
                leftIcon={<span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfIsActive ? 'bg-success' : 'bg-fg-subtle'}`} aria-hidden />}
              >
                {t.common.active}
              </Button>
            </div>

            <div className="flex gap-2 pt-1">
              <Button size="sm" leftIcon={<Check size={13} />} onClick={cfHandleSave}>
                {cfEditingId ? t.common.save : t.common.create}
              </Button>
              <Button size="sm" variant="secondary" leftIcon={<X size={13} />} onClick={cfResetForm}>
                {t.common.cancel}
              </Button>
            </div>
          </div>
        )}

        {cfEntityDefs.length === 0 ? (
          <p className="text-sm text-fg-subtle text-center py-6">
            {t.settings.customFields} - {t.settings.entityLabels[cfActiveEntity]}
          </p>
        ) : (
          <div className="space-y-2">
            {cfEntityDefs.map((def) => (
              <div
                key={def.id}
                className={`flex items-center gap-3 p-3 ${innerSurface}`}
              >
                <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent-500/15 text-accent-300 border border-accent-500/20 uppercase tracking-wide">
                  {t.settings.fieldTypeLabels[def.fieldType]}
                </span>

                <span className="flex-1 text-sm text-fg truncate">{def.label}</span>

                <button type="button"
                  onClick={() => cfToggleRequired(def.id, def.required)}
                  title={def.required ? t.settings.requiredToggleOn : t.settings.requiredToggleOff}
                  className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                    def.required
                      ? 'bg-warning/15 border-warning/25 text-warning'
                      : 'bg-fg/5 border-fg/8 text-fg-subtle hover:text-fg-muted'
                  }`}
                >
                  {def.required ? t.settings.required : '-'}
                </button>

                <button type="button"
                  onClick={() => cfToggleActive(def.id, def.isActive)}
                  title={def.isActive ? t.settings.activeToggleOn : t.settings.activeToggleOff}
                  className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                    def.isActive
                      ? 'bg-success/15 border-success/25 text-success'
                      : 'bg-fg/5 border-fg/8 text-fg-subtle hover:text-fg-muted'
                  }`}
                >
                  {def.isActive ? t.common.active : t.common.inactive}
                </button>

                <PermissionGate permission="custom_fields:update">
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={() => cfOpenEdit(def.id)}
                    title={t.settings.editField}
                    aria-label={t.settings.editField}
                    className="shrink-0 px-2"
                  >
                    <Pencil size={13} />
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={() => setCfDeleteId(def.id)}
                    title={t.settings.deleteField}
                    aria-label={t.settings.deleteField}
                    className="shrink-0 px-2 text-fg-subtle hover:text-danger"
                  >
                    <Trash2 size={13} />
                  </Button>
                </PermissionGate>
              </div>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        isOpen={cfDeleteId !== null}
        onClose={() => setCfDeleteId(null)}
        onConfirm={() => cfDeleteId && cfHandleDelete(cfDeleteId)}
        title={t.common.delete}
        message={t.common.bulkDeleteConfirm}
        confirmLabel={t.common.delete}
        danger
      />
    </>
  )
}
