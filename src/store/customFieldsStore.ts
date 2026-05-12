import { create } from 'zustand'
import type { CustomFieldDefinition, CustomFieldDefinitionI18n, CustomFieldEntityType, CustomFieldValue } from '../types'
import { api } from '../lib/api'
import { getTranslations, useI18nStore } from '../i18n'
import type { Language } from '../i18n'

interface CustomFieldsStore {
  definitions: CustomFieldDefinition[]
  translations: CustomFieldDefinitionI18n[]
  values: Record<string, CustomFieldValue[]>
  isLoading: boolean
  error: string | null
  fetchCustomFields: () => Promise<void>
  addDefinition: (def: Omit<CustomFieldDefinition, 'id' | 'order' | 'createdAt' | 'updatedAt'>) => void
  updateDefinition: (id: string, updates: Partial<CustomFieldDefinition>) => void
  deleteDefinition: (id: string) => void
  reorderDefinitions: (entityType: CustomFieldEntityType, orderedIds: string[]) => void
  setFieldValue: (entityId: string, fieldId: string, value: CustomFieldValue['value']) => void
  getFieldValues: (entityId: string) => CustomFieldValue[]
  getFieldValue: (entityId: string, fieldId: string) => CustomFieldValue['value']
  deleteEntityValues: (entityId: string) => void
  upsertTranslation: (fieldId: string, languageCode: Language, updates: { label: string; placeholder?: string; options?: string[] }) => void
  getDefinitionsForEntity: (entityType: CustomFieldEntityType) => CustomFieldDefinition[]
  getActiveDefinitionsForEntity: (entityType: CustomFieldEntityType) => CustomFieldDefinition[]
}

type ApiDef = Record<string, unknown>
type ApiVal = Record<string, unknown>
type ApiI18n = Record<string, unknown>

export const useCustomFieldsStore = create<CustomFieldsStore>()((set, get) => ({
  definitions: [],
  translations: [],
  values: {},
  isLoading: false,
  error: null,

  fetchCustomFields: async () => {
    set({ isLoading: true, error: null })
    try {
      const [defData, valData, i18nData] = await Promise.all([
        api.get<ApiDef[]>('/custom-fields'),
        api.get<ApiVal[]>('/custom-fields/values'),
        api.get<ApiI18n[]>('/custom-fields/i18n'),
      ])

      const definitions: CustomFieldDefinition[] = (defData ?? []).map((r) => ({
        id: r.id as string,
        entityType: ((r.entityType ?? r.entity_type) as CustomFieldEntityType),
        label: r.label as string,
        fieldType: ((r.fieldType ?? r.field_type) as import('../types').CustomFieldType),
        placeholder: (r.placeholder as string) ?? undefined,
        required: Boolean(r.required),
        order: (r.order as number) ?? 1,
        isActive: Boolean(r.isActive ?? r.is_active),
        options: (r.options as string[]) ?? undefined,
        createdAt: ((r.createdAt ?? r.created_at) as string),
        updatedAt: ((r.updatedAt ?? r.updated_at) as string),
      }))

      const values: Record<string, CustomFieldValue[]> = {}
      for (const r of (valData ?? [])) {
        const entityId = ((r.entityId ?? r.entity_id) as string)
        if (!values[entityId]) values[entityId] = []
        values[entityId].push({ fieldId: ((r.fieldId ?? r.field_id) as string), value: r.value as CustomFieldValue['value'] })
      }

      const translations: CustomFieldDefinitionI18n[] = (i18nData ?? []).map((r) => ({
        fieldId: ((r.fieldId ?? r.field_id) as string),
        languageCode: ((r.languageCode ?? r.language_code) as Language),
        label: r.label as string,
        placeholder: (r.placeholder as string) ?? undefined,
        options: (r.options as string[]) ?? undefined,
      }))

      set({ definitions, translations, values, isLoading: false })
    } catch (e: unknown) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  addDefinition: (defData) => {
    const ts = new Date().toISOString()
    const existing = get().definitions.filter((d) => d.entityType === defData.entityType)
    const def: CustomFieldDefinition = { ...defData, id: crypto.randomUUID(), order: existing.length + 1, createdAt: ts, updatedAt: ts }
    set((s) => ({ definitions: [...s.definitions, def] }))
    api.post<ApiDef>('/custom-fields', {
      entityType: def.entityType, label: def.label, fieldType: def.fieldType,
      placeholder: def.placeholder, required: def.required, order: def.order,
      isActive: def.isActive, options: def.options,
    }).then((created) => {
      set((s) => ({ definitions: s.definitions.map((d) => d.id === def.id ? { ...d, id: created.id as string } : d) }))
    }).catch(() => {})
  },

  updateDefinition: (id, updates) => {
    set((s) => ({
      definitions: s.definitions.map((d) => d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d),
    }))
    api.patch(`/custom-fields/${id}`, updates).catch(() => {})
  },

  deleteDefinition: (id) => {
    set((s) => {
      const newValues = { ...s.values }
      for (const entityId of Object.keys(newValues)) {
        newValues[entityId] = newValues[entityId].filter((v) => v.fieldId !== id)
      }
      return { definitions: s.definitions.filter((d) => d.id !== id), values: newValues }
    })
    api.delete(`/custom-fields/${id}`).catch(() => {})
  },

  reorderDefinitions: (entityType, orderedIds) => {
    set((s) => ({
      definitions: s.definitions.map((d) => {
        if (d.entityType !== entityType) return d
        const idx = orderedIds.indexOf(d.id)
        return idx >= 0 ? { ...d, order: idx + 1 } : d
      }),
    }))
    orderedIds.forEach((id, idx) => {
      api.patch(`/custom-fields/${id}`, { order: idx + 1 }).catch(() => {})
    })
  },

  setFieldValue: (entityId, fieldId, value) => {
    set((s) => {
      const existing = s.values[entityId] || []
      const idx = existing.findIndex((v) => v.fieldId === fieldId)
      const updated = idx >= 0
        ? existing.map((v, i) => (i === idx ? { fieldId, value } : v))
        : [...existing, { fieldId, value }]
      return { values: { ...s.values, [entityId]: updated } }
    })
    api.put('/custom-fields/values', { entityId, fieldId, value }).catch(() => {})
  },

  getFieldValues: (entityId) => get().values[entityId] || [],

  getFieldValue: (entityId, fieldId) => {
    const vals = get().values[entityId] || []
    return vals.find((v) => v.fieldId === fieldId)?.value ?? null
  },

  deleteEntityValues: (entityId) => {
    set((s) => {
      const newValues = { ...s.values }
      delete newValues[entityId]
      return { values: newValues }
    })
    api.delete(`/custom-fields/values/${entityId}`).catch(() => {})
  },

  upsertTranslation: (fieldId, languageCode, updates) => {
    set((s) => {
      const withoutFieldLang = s.translations.filter((t) => !(t.fieldId === fieldId && t.languageCode === languageCode))
      return {
        translations: [...withoutFieldLang, {
          fieldId, languageCode, label: updates.label,
          placeholder: updates.placeholder, options: updates.options,
        }],
      }
    })
    api.put('/custom-fields/i18n', { fieldId, languageCode, ...updates }).catch(() => {})
  },

  getDefinitionsForEntity: (entityType) => {
    const { definitions, translations } = get()
    const lang = useI18nStore.getState().language
    return definitions
      .filter((d) => d.entityType === entityType)
      .sort((a, b) => a.order - b.order)
      .map((def) => {
        const tx = findTranslation(translations, def.id, lang)
        if (tx) {
          return { ...def, label: tx.label || def.label, placeholder: tx.placeholder ?? def.placeholder, options: tx.options ?? def.options }
        }
        const seed = getTranslations().workflowLibrary.customFields[def.id]
        if (seed) {
          return { ...def, label: seed.label, placeholder: seed.placeholder ?? def.placeholder, options: seed.options ?? def.options }
        }
        return def
      })
  },

  getActiveDefinitionsForEntity: (entityType) =>
    get().getDefinitionsForEntity(entityType).filter((d) => d.isActive),
}))

function findTranslation(
  translations: CustomFieldDefinitionI18n[],
  fieldId: string,
  language: Language,
): CustomFieldDefinitionI18n | undefined {
  return translations.find((t) => t.fieldId === fieldId && t.languageCode === language)
}
