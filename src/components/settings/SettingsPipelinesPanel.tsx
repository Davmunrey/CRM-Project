import { useState } from 'react'
import { Plus, Trash2, Edit2, Star, Users, ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslations } from '../../i18n'
import { usePipelinesStore } from '../../store/pipelinesStore'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { toast } from '../../store/toastStore'
import type { Pipeline, PipelineStage } from '../../types'

const ROLE_ADMIN = new Set(['owner', 'admin', 'manager'])

const DEFAULT_COLORS = [
  '#6366f1', '#8b5cf6', '#f59e0b', '#f97316', '#10b981',
  '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#84cc16',
]

function genStageId() {
  return crypto.randomUUID().slice(0, 8)
}

interface PipelineFormState {
  name: string
  description: string
  view_access: 'all' | 'members_only'
  is_default: boolean
  stages: PipelineStage[]
}

function emptyForm(base?: Pipeline): PipelineFormState {
  if (base) {
    return {
      name: base.name,
      description: base.description ?? '',
      view_access: base.viewAccess,
      is_default: base.isDefault,
      stages: [...base.stages].sort((a, b) => a.order - b.order),
    }
  }
  return {
    name: '',
    description: '',
    view_access: 'all',
    is_default: false,
    stages: [
      { id: 'lead', name: 'Lead', color: '#6366f1', order: 0, probability: 10 },
      { id: 'qualified', name: 'Qualified', color: '#8b5cf6', order: 1, probability: 25 },
      { id: 'proposal', name: 'Proposal', color: '#f59e0b', order: 2, probability: 50 },
      { id: 'won', name: 'Won', color: '#10b981', order: 3, probability: 100 },
      { id: 'lost', name: 'Lost', color: '#ef4444', order: 4, probability: 0 },
    ],
  }
}

export function SettingsPipelinesPanel() {
  const t = useTranslations()
  const pt = t.pipelines
  const { pipelines, fetchPipelines, createPipeline, updatePipeline, archivePipeline } = usePipelinesStore()
  const currentUser = useAuthStore((s) => s.currentUser)
  const canManage = currentUser ? ROLE_ADMIN.has(currentUser.role) : false

  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<PipelineFormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function openNew() {
    setForm(emptyForm())
    setEditingId('new')
  }

  function openEdit(p: Pipeline) {
    setForm(emptyForm(p))
    setEditingId(p.id)
  }

  function closeEdit() {
    setEditingId(null)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editingId === 'new') {
        await createPipeline({
          name: form.name,
          description: form.description || undefined,
          stages: form.stages,
          view_access: form.view_access,
          is_default: form.is_default,
        })
        toast.success(pt.created)
      } else if (editingId) {
        await updatePipeline(editingId, {
          name: form.name,
          description: form.description || undefined,
          stages: form.stages,
          view_access: form.view_access,
          is_default: form.is_default || undefined,
        })
        toast.success(pt.updated)
      }
      setEditingId(null)
      await fetchPipelines()
    } catch {
      toast.error(pt.loadError)
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive(p: Pipeline) {
    if (!confirm(pt.archiveConfirm)) return
    try {
      await archivePipeline(p.id)
      toast.success(pt.archived)
    } catch {
      toast.error(pt.cannotArchiveDefault)
    }
  }

  async function handleSetDefault(p: Pipeline) {
    try {
      await updatePipeline(p.id, { is_default: true })
      await fetchPipelines()
      toast.success(pt.updated)
    } catch {
      toast.error(pt.loadError)
    }
  }

  function addStage() {
    setForm((f) => ({
      ...f,
      stages: [
        ...f.stages,
        {
          id: genStageId(),
          name: '',
          color: DEFAULT_COLORS[f.stages.length % DEFAULT_COLORS.length] ?? '#6366f1',
          order: f.stages.length,
          probability: 0,
        },
      ],
    }))
  }

  function updateStage(idx: number, field: keyof PipelineStage, value: string | number) {
    setForm((f) => ({
      ...f,
      stages: f.stages.map((s, i) => i === idx ? { ...s, [field]: value } : s),
    }))
  }

  function removeStage(idx: number) {
    setForm((f) => ({
      ...f,
      stages: f.stages.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i })),
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{pt.pipelines}</h2>
        </div>
        {canManage && editingId === null && (
          <Button size="sm" leftIcon={<Plus size={14} />} onClick={openNew}>
            {pt.newPipeline}
          </Button>
        )}
      </div>

      {/* Pipeline list */}
      {pipelines.map((p) => (
        <div key={p.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/60">
            <div className="flex items-center gap-2">
              {p.isDefault && <Star size={14} className="text-warning fill-warning" />}
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{p.name}</span>
              {p.viewAccess === 'members_only' && <Users size={12} className="text-gray-400" />}
              {p.isDefault && (
                <span className="text-xs text-gray-500 dark:text-gray-400">({pt.default})</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canManage && !p.isDefault && (
                <button
                  type="button"
                  onClick={() => handleSetDefault(p)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {pt.setAsDefault}
                </button>
              )}
              {canManage && (
                <button type="button" onClick={() => openEdit(p)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <Edit2 size={14} />
                </button>
              )}
              {canManage && !p.isDefault && (
                <button type="button" onClick={() => handleArchive(p)} className="text-gray-400 hover:text-danger">
                  <Trash2 size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setExpandedId((id) => id === p.id ? null : p.id)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {expandedId === p.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>
          {expandedId === p.id && (
            <div className="px-4 py-3 space-y-1">
              {[...p.stages].sort((a, b) => a.order - b.order).map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="flex-1">{s.name}</span>
                  <span className="text-xs text-gray-400">{s.probability}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {pipelines.length === 0 && (
        <div className="text-center py-10 text-gray-400 dark:text-gray-500">
          <p className="font-medium">{pt.emptyTitle}</p>
          <p className="text-sm mt-1">{pt.emptyHint}</p>
        </div>
      )}

      {/* Create / edit form */}
      {editingId !== null && (
        <div className="border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 space-y-4 bg-indigo-50/30 dark:bg-indigo-950/20">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {editingId === 'new' ? pt.newPipeline : pt.editPipeline}
          </h3>

          <Input
            label={t.common.name}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={pt.namePlaceholder}
            required
          />

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t.common.description ?? 'Description'}
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder={pt.descriptionPlaceholder}
              className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-surface-1 px-3 py-1.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{pt.viewAccess}</label>
            <select
              value={form.view_access}
              onChange={(e) => setForm((f) => ({ ...f, view_access: e.target.value as 'all' | 'members_only' }))}
              className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-surface-1 px-3 py-1.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">{pt.viewAccessAll}</option>
              <option value="members_only">{pt.viewAccessMembersOnly}</option>
            </select>
          </div>

          {editingId === 'new' && (
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
                className="rounded"
              />
              {pt.setAsDefault}
            </label>
          )}

          {/* Stages editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{pt.stages}</label>
              <button type="button" onClick={addStage} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                + {pt.addStage}
              </button>
            </div>
            <div className="space-y-2">
              {form.stages.map((s, idx) => (
                <div key={s.id} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={s.color}
                    onChange={(e) => updateStage(idx, 'color', e.target.value)}
                    className="h-7 w-7 rounded cursor-pointer border-0 p-0"
                  />
                  <input
                    type="text"
                    value={s.name}
                    onChange={(e) => updateStage(idx, 'name', e.target.value)}
                    placeholder={pt.stageName}
                    className="flex-1 rounded border border-gray-200 dark:border-gray-700 bg-surface-1 px-2 py-1 text-sm text-fg"
                  />
                  <input
                    type="number"
                    value={s.probability}
                    min={0}
                    max={100}
                    onChange={(e) => updateStage(idx, 'probability', Number(e.target.value))}
                    className="w-16 rounded border border-gray-200 dark:border-gray-700 bg-surface-1 px-2 py-1 text-sm text-fg text-right"
                  />
                  <span className="text-xs text-gray-400">%</span>
                  {form.stages.length > 1 && (
                    <button type="button" onClick={() => removeStage(idx)} className="text-gray-400 hover:text-danger">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? t.common.loading : t.common.save}
            </Button>
            <Button size="sm" variant="ghost" onClick={closeEdit}>
              {t.common.cancel}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
