import { useState, useMemo, useEffect } from 'react'
import { Plus, Copy, Trash2, Eye, EyeOff, Search, FileText, Mail } from 'lucide-react'
import { useTemplateStore } from '../store/templateStore'
import type { EmailTemplate } from '../types'
import { toast } from '../store/toastStore'
import { PermissionGate } from '../components/auth/PermissionGate'
import { getTranslations, useI18nStore, useTranslations } from '../i18n'
import { localizedEmailTemplate } from '../i18n/localizeSeed'
import { PanelEmpty } from '../components/shared/PanelEmpty'

// ─── Constants ──────────────────────────────────────────────────────────────────

type CategoryKey = EmailTemplate['category'] | 'all'

const CATEGORY_COLORS: Record<EmailTemplate['category'], string> = {
  intro: 'bg-success/20 text-success',
  follow_up: 'bg-info/20 text-info',
  proposal: 'bg-warning/20 text-warning',
  closing: 'bg-accent-500/20 text-accent-400',
  nurture: 'bg-pink-500/20 text-pink-400',
  custom: 'bg-surface-2/20 text-fg-muted',
}

function getCategoryLabels(t: ReturnType<typeof useTranslations>): Record<EmailTemplate['category'], string> {
  return {
    intro: t.emailTemplates.categoryLabels.intro,
    follow_up: t.emailTemplates.categoryLabels.follow_up,
    proposal: t.emailTemplates.categoryLabels.proposal,
    closing: t.emailTemplates.categoryLabels.closing,
    nurture: t.emailTemplates.categoryLabels.nurture,
    custom: t.emailTemplates.categoryLabels.custom,
  }
}

function getTabs(t: ReturnType<typeof useTranslations>): { key: CategoryKey; label: string }[] {
  return [
    { key: 'all', label: t.common.all },
    { key: 'intro', label: t.emailTemplates.categoryLabels.intro },
    { key: 'follow_up', label: t.emailTemplates.categoryLabels.follow_up },
    { key: 'proposal', label: t.emailTemplates.categoryLabels.proposal },
    { key: 'closing', label: t.emailTemplates.categoryLabels.closing },
    { key: 'nurture', label: t.emailTemplates.categoryLabels.nurture },
    { key: 'custom', label: t.emailTemplates.categoryLabels.custom },
  ]
}

// ─── Helper ─────────────────────────────────────────────────────────────────────

function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{\w+\}\}/g)
  if (!matches) return []
  return [...new Set(matches)]
}

function previewVariableMap(t: ReturnType<typeof useTranslations>): Record<string, string> {
  const s = t.emailTemplates.previewSamples
  return {
    '{{firstName}}': s.firstName,
    '{{lastName}}': s.lastName,
    '{{company}}': s.company,
    '{{dealTitle}}': s.dealTitle,
    '{{dealValue}}': s.dealValue,
  }
}

function replaceVariables(text: string, t: ReturnType<typeof useTranslations>): string {
  const map = previewVariableMap(t)
  return text.replace(/\{\{\w+\}\}/g, (match) => map[match] ?? match)
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function EmailTemplates() {
  const t = useTranslations()
  const language = useI18nStore((s) => s.language)
  const categoryLabels = getCategoryLabels(t)
  const tabs = getTabs(t)
  const {
    templates,
    quickReplies,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    incrementUsage,
    addQuickReply,
    updateQuickReply,
    deleteQuickReply,
  } = useTemplateStore()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<CategoryKey>('all')
  const [search, setSearch] = useState('')
  const [preview, setPreview] = useState(false)
  const [quickReplyTitle, setQuickReplyTitle] = useState('')
  const [quickReplyBody, setQuickReplyBody] = useState('')

  // Editable draft fields
  const [draftName, setDraftName] = useState('')
  const [draftSubject, setDraftSubject] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const [draftCategory, setDraftCategory] = useState<EmailTemplate['category']>('custom')
  const [isDirty, setIsDirty] = useState(false)

  // ─── Derived ────────────────────────────────────────────────────────────────

  const localizedTemplates = useMemo(() => {
    const tr = getTranslations()
    return templates.map((tpl) => localizedEmailTemplate(tpl, tr))
  }, [templates, language])

  const filtered = useMemo(() => {
    return localizedTemplates.filter((tpl) => {
      if (categoryFilter !== 'all' && tpl.category !== categoryFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!tpl.name.toLowerCase().includes(q) && !tpl.subject.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [localizedTemplates, categoryFilter, search])

  const selected = useMemo(() => localizedTemplates.find((tpl) => tpl.id === selectedId) ?? null, [localizedTemplates, selectedId])

  const previewVars = useMemo(() => previewVariableMap(getTranslations()), [language])

  useEffect(() => {
    if (!selected || isDirty) return
    setDraftName(selected.name)
    setDraftSubject(selected.subject)
    setDraftBody(selected.body)
    setDraftCategory(selected.category)
  }, [selected, isDirty, language])

  const detectedVariables = useMemo(() => {
    return extractVariables(`${draftSubject} ${draftBody}`)
  }, [draftSubject, draftBody])

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function selectTemplate(tpl: EmailTemplate) {
    setSelectedId(tpl.id)
    setDraftName(tpl.name)
    setDraftSubject(tpl.subject)
    setDraftBody(tpl.body)
    setDraftCategory(tpl.category)
    setIsDirty(false)
    setPreview(false)
  }

  function handleNew() {
    const newTpl = addTemplate({
      name: t.emailTemplates.newTemplate,
      subject: '',
      body: '',
      category: 'custom',
      variables: [],
    })
    selectTemplate(newTpl)
    toast.success(t.emailTemplates.newTemplate)
  }

  function handleSave() {
    if (!selectedId) return
    const vars = extractVariables(`${draftSubject} ${draftBody}`)
    updateTemplate(selectedId, {
      name: draftName,
      subject: draftSubject,
      body: draftBody,
      category: draftCategory,
      variables: vars,
    })
    setIsDirty(false)
    toast.success(t.common.save)
  }

  function handleDuplicate() {
    if (!selectedId) return
    const store = useTemplateStore.getState()
    const original = store.templates.find((tpl) => tpl.id === selectedId)
    if (!original) return
    const copy = addTemplate({
      name: `${original.name} (${t.common.create.toLowerCase()})`,
      subject: original.subject,
      body: original.body,
      category: original.category,
      variables: original.variables,
    })
    selectTemplate(copy)
    toast.success(t.emailTemplates.newTemplate)
  }

  function handleDelete() {
    if (!selectedId) return
    deleteTemplate(selectedId)
    setSelectedId(null)
    toast.success(t.common.delete)
  }

  function handleCopyBody() {
    if (!draftBody) return
    const text = preview ? replaceVariables(draftBody, t) : draftBody
    navigator.clipboard.writeText(text).then(() => {
      if (selectedId) incrementUsage(selectedId)
      toast.success(t.common.ok)
    })
  }

  function markDirty() {
    setIsDirty(true)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="crm-page-full flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 py-4 border-b border-fg/6">
        <div>
          <h2 className="text-2xl font-bold text-fg tracking-tight">{t.emailTemplates.title}</h2>
          <p className="text-sm text-fg-muted mt-1">{templates.length} {t.emailTemplates.usageCount.toLowerCase()}</p>
        </div>
      </div>

      <div className="pb-4 pt-2 shrink-0">
        <div className="glass rounded-2xl p-4 border border-fg/8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-fg">{t.emailTemplates.quickReplies}</h3>
            <span className="text-xs text-fg-subtle">{quickReplies.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
            <input
              value={quickReplyTitle}
              onChange={(e) => setQuickReplyTitle(e.target.value)}
              placeholder={t.emailTemplates.quickReplyTitlePlaceholder}
              className="bg-surface-2 border border-fg/10 rounded-xl px-3 py-2 text-sm text-fg placeholder:text-fg-subtle"
            />
            <input
              value={quickReplyBody}
              onChange={(e) => setQuickReplyBody(e.target.value)}
              placeholder={t.emailTemplates.quickReplyBodyPlaceholder}
              className="bg-surface-2 border border-fg/10 rounded-xl px-3 py-2 text-sm text-fg placeholder:text-fg-subtle"
            />
          </div>
          <button type="button"
            onClick={() => {
              if (!quickReplyTitle.trim() || !quickReplyBody.trim()) return
              addQuickReply({ title: quickReplyTitle.trim(), body: quickReplyBody })
              setQuickReplyTitle('')
              setQuickReplyBody('')
              toast.success(t.common.save)
            }}
            className="btn-gradient text-fg text-xs font-medium px-3 py-1.5 rounded-full"
          >
            {t.common.add}
          </button>
          <div className="mt-3 space-y-2">
            {quickReplies.map((reply) => (
              <div key={reply.id} className="flex items-center gap-2 bg-fg/4 border border-fg/8 rounded-lg px-3 py-2">
                <input
                  value={reply.title}
                  onChange={(e) => updateQuickReply(reply.id, { title: e.target.value })}
                  className="w-48 bg-transparent text-xs text-fg"
                />
                <input
                  value={reply.body}
                  onChange={(e) => updateQuickReply(reply.id, { body: e.target.value })}
                  className="flex-1 bg-transparent text-xs text-fg-muted"
                />
                <button type="button" onClick={() => deleteQuickReply(reply.id)} className="text-danger">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex gap-6 pb-6 pt-2 min-h-0">
        {/* ─── Left Sidebar (1/3) ──────────────────────────────────────── */}
        <div className="w-1/3 flex flex-col glass rounded-2xl overflow-hidden">
          {/* Sidebar header */}
          <div className="p-4 border-b border-fg/6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-lg font-semibold text-fg">{t.emailTemplates.title}</p>
              <PermissionGate permission="templates:create">
                <button type="button"
                  onClick={handleNew}
                  className="btn-gradient text-fg text-xs font-medium px-4 py-2 rounded-full flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  {t.emailTemplates.newTemplate}
                </button>
              </PermissionGate>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
              <input
                type="text"
                placeholder={t.common.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-surface-2 border border-fg/10 rounded-full pl-9 pr-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:border-accent-500/50"
              />
            </div>
          </div>

          {/* Category tabs */}
          <div className="px-2 py-2 border-b border-fg/6 flex flex-col gap-0.5">
            {tabs.map((tab) => (
              <button type="button"
                key={tab.key}
                onClick={() => setCategoryFilter(tab.key)}
                className={`text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                  categoryFilter === tab.key
                    ? 'text-accent-400 bg-accent-500/10 border-l-2 border-accent-500'
                    : 'text-fg-muted hover:bg-fg/4 hover:text-fg'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Template list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <PanelEmpty icon={<FileText size={32} />} primary={t.common.noResults} density="compact" />
            ) : (
              filtered.map((tpl: EmailTemplate) => (
                <div
                  key={tpl.id}
                  onClick={() => selectTemplate(tpl)}
                  className={`px-4 py-3 border-b border-fg/4 cursor-pointer transition-colors ${
                    selectedId === tpl.id
                      ? 'bg-accent-600/10 border-l-2 border-l-accent-500'
                      : 'hover:bg-fg/4'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-fg truncate">{tpl.name}</p>
                    <span className="text-[10px] text-fg-subtle flex-shrink-0 whitespace-nowrap">
                      {tpl.usageCount} {t.emailTemplates.usageCount.toLowerCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[tpl.category]}`}
                    >
                      {categoryLabels[tpl.category]}
                    </span>
                    <p className="text-[11px] text-fg-subtle truncate">{tpl.subject}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ─── Right Content (2/3) ─────────────────────────────────────── */}
        <div className="w-2/3 glass rounded-2xl overflow-hidden flex flex-col">
          {selected ? (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between p-4 border-b border-fg/6">
                <div className="flex items-center gap-3">
                  <Mail size={18} className="text-accent-400" />
                  <span className="text-sm text-fg-muted">
                    {t.emailTemplates.usageCount}: <span className="text-fg font-medium">{selected.usageCount}</span>
                  </span>
                  {isDirty && (
                    <span className="text-[10px] bg-warning/20 text-warning px-2 py-0.5 rounded-full">
                      {t.common.edit}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button type="button"
                    onClick={() => setPreview(!preview)}
                    className="bg-surface-2 border border-fg/10 text-fg-muted text-xs font-medium px-3 py-2 rounded-full flex items-center gap-1.5 hover:bg-fg/10 transition-colors"
                  >
                    {preview ? <EyeOff size={13} /> : <Eye size={13} />}
                    {preview ? t.common.edit : t.common.view}
                  </button>
                  <button type="button"
                    onClick={handleCopyBody}
                    className="bg-surface-2 border border-fg/10 text-fg-muted text-xs font-medium px-3 py-2 rounded-full flex items-center gap-1.5 hover:bg-fg/10 transition-colors"
                  >
                    <Copy size={13} />
                    {t.common.export}
                  </button>
                  <button type="button"
                    onClick={handleDuplicate}
                    className="bg-surface-2 border border-fg/10 text-fg-muted text-xs font-medium px-3 py-2 rounded-full flex items-center gap-1.5 hover:bg-fg/10 transition-colors"
                  >
                    <Copy size={13} />
                    {t.common.create}
                  </button>
                  <PermissionGate permission="templates:delete">
                    <button type="button"
                      onClick={handleDelete}
                      className="bg-danger/10 border border-danger/20 text-danger text-xs font-medium px-3 py-2 rounded-full flex items-center gap-1.5 hover:bg-danger/20 transition-colors"
                    >
                      <Trash2 size={13} />
                      {t.common.delete}
                    </button>
                  </PermissionGate>
                  <PermissionGate permission="templates:update">
                    <button type="button"
                      onClick={handleSave}
                      className="btn-gradient text-fg text-xs font-medium px-4 py-2 rounded-full"
                    >
                      {t.common.save}
                    </button>
                  </PermissionGate>
                </div>
              </div>

              {/* Editor / Preview */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-fg-muted mb-1.5">{t.common.name}</label>
                  {preview ? (
                    <p className="text-fg font-semibold text-lg">{draftName}</p>
                  ) : (
                    <input
                      type="text"
                      value={draftName}
                      onChange={(e) => { setDraftName(e.target.value); markDirty() }}
                      className="w-full bg-surface-2 border border-fg/10 rounded-xl px-4 py-2.5 text-fg text-sm focus:outline-none focus:border-accent-500/50"
                    />
                  )}
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-medium text-fg-muted mb-1.5">{t.emailTemplates.category}</label>
                  {preview ? (
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${CATEGORY_COLORS[draftCategory]}`}>
                      {categoryLabels[draftCategory]}
                    </span>
                  ) : (
                    <select
                      value={draftCategory}
                      onChange={(e) => { setDraftCategory(e.target.value as EmailTemplate['category']); markDirty() }}
                      className="w-full bg-surface-2 border border-fg/10 rounded-xl px-4 py-2.5 text-fg text-sm focus:outline-none focus:border-accent-500/50 [&>option]:bg-surface-1 [&>option]:text-fg"
                    >
                      {Object.entries(categoryLabels).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-medium text-fg-muted mb-1.5">{t.activities.subject}</label>
                  {preview ? (
                    <p className="text-fg text-sm bg-fg/5 rounded-xl px-4 py-2.5 border border-fg/6">
                      {replaceVariables(draftSubject, t)}
                    </p>
                  ) : (
                    <input
                      type="text"
                      value={draftSubject}
                      onChange={(e) => { setDraftSubject(e.target.value); markDirty() }}
                      placeholder={`${t.activities.subject}...`}
                      className="w-full bg-surface-2 border border-fg/10 rounded-xl px-4 py-2.5 text-fg text-sm placeholder:text-fg-subtle focus:outline-none focus:border-accent-500/50"
                    />
                  )}
                </div>

                {/* Body */}
                <div>
                  <label className="block text-xs font-medium text-fg-muted mb-1.5">{t.common.description}</label>
                  {preview ? (
                    <div className="bg-fg/5 border border-fg/6 rounded-xl px-5 py-4 text-sm text-fg whitespace-pre-wrap leading-relaxed min-h-[200px]">
                      {replaceVariables(draftBody, t)}
                    </div>
                  ) : (
                    <textarea
                      value={draftBody}
                      onChange={(e) => { setDraftBody(e.target.value); markDirty() }}
                      placeholder={`${t.common.description}... {{variable}}`}
                      rows={12}
                      className="w-full bg-surface-2 border border-fg/10 rounded-xl px-4 py-3 text-sm text-fg font-mono placeholder:text-fg-subtle focus:outline-none focus:border-accent-500/50 resize-none leading-relaxed"
                    />
                  )}
                </div>

                {/* Variables */}
                <div>
                  <label className="block text-xs font-medium text-fg-muted mb-2">
                    {t.emailTemplates.variables} ({detectedVariables.length})
                  </label>
                  {detectedVariables.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {detectedVariables.map((v) => (
                        <span
                          key={v}
                          className="inline-flex items-center gap-1.5 text-xs font-mono bg-accent-500/15 text-accent-400 border border-accent-500/25 px-3 py-1.5 rounded-full"
                        >
                          {v}
                          {previewVars[v] && preview && (
                            <span className="text-accent-300 font-sans">= {previewVars[v]}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-fg-subtle">
                      {t.common.noResults}. {'{{variable}}'}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-fg/8 flex items-center justify-center mx-auto mb-4">
                  <Mail size={28} className="text-fg-subtle" />
                </div>
                <h3 className="text-fg font-medium mb-1">{t.common.view} {t.emailTemplates.title.toLowerCase()}</h3>
                <p className="text-sm text-fg-subtle">{t.common.or} {t.emailTemplates.newTemplate.toLowerCase()}</p>
                <PermissionGate permission="templates:create">
                  <button type="button"
                    onClick={handleNew}
                    className="btn-gradient text-fg text-xs font-medium px-5 py-2.5 rounded-full mt-4 inline-flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    {t.emailTemplates.newTemplate}
                  </button>
                </PermissionGate>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
