import { useMemo, useState } from 'react'
import { X, Library, Sparkles } from 'lucide-react'
import { useTranslations, getTranslations } from '../../i18n'
import { localizedEmailSequence } from '../../i18n/localizeSeed'
import { getAutomationTemplateRulePayload } from '../../i18n/seed/automationSeedRulesEn'
import type { SeedAutomationId } from '../../i18n/types'
import {
  WORKFLOW_TEMPLATE_CATALOG,
  type WorkflowCatalogEntry,
} from '../../lib/workflowTemplateCatalog'
import { useAutomationsStore } from '../../store/automationsStore'
import { useAuthStore } from '../../store/authStore'
import { linearStepsToFlow } from '../../features/sequences-flow/sequenceFlowConverters'
import { getBuiltInSequenceById, useSequencesStore } from '../../store/sequencesStore'
import { toast } from '../../store/toastStore'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

type KindFilter = 'all' | 'automation' | 'sequence'

function entryTitle(entry: WorkflowCatalogEntry, t: ReturnType<typeof useTranslations>): string {
  if (entry.kind === 'automation') {
    return t.workflowLibrary.automations[entry.automationSeedId as SeedAutomationId].name
  }
  return t.workflowLibrary.sequences[entry.sequenceSeedId].name
}

function entryDescription(entry: WorkflowCatalogEntry, t: ReturnType<typeof useTranslations>): string {
  if (entry.kind === 'automation') {
    return t.workflowLibrary.automations[entry.automationSeedId as SeedAutomationId].description
  }
  return t.workflowLibrary.sequences[entry.sequenceSeedId].description
}

export function WorkflowTemplateLibraryDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations()
  const [kind, setKind] = useState<KindFilter>('all')
  const [query, setQuery] = useState('')
  const addRule = useAutomationsStore((s) => s.addRule)
  const createSequence = useSequencesStore((s) => s.createSequence)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return WORKFLOW_TEMPLATE_CATALOG.filter((e) => {
      if (kind === 'automation' && e.kind !== 'automation') return false
      if (kind === 'sequence' && e.kind !== 'sequence') return false
      if (!q) return true
      const title = entryTitle(e, t).toLowerCase()
      const desc = entryDescription(e, t).toLowerCase()
      const sit = t.workflowTemplates.situations[e.situation].toLowerCase()
      const cat = t.workflowTemplates.categories[e.category].toLowerCase()
      return title.includes(q) || desc.includes(q) || sit.includes(q) || cat.includes(q)
    })
  }, [kind, query, t])

  function install(entry: WorkflowCatalogEntry) {
    if (entry.kind === 'automation') {
      addRule(getAutomationTemplateRulePayload(entry.automationSeedId))
      toast.success(t.workflowTemplates.toastAutomationInstalled)
      onClose()
      return
    }
    const raw = getBuiltInSequenceById(entry.sequenceSeedId)
    if (!raw) {
      toast.success(t.common.noResults)
      return
    }
    const loc = localizedEmailSequence(raw, getTranslations())
    const uid = useAuthStore.getState().currentUser?.id ?? raw.createdBy
    const flow = linearStepsToFlow(loc.steps)
    createSequence({
      name: loc.name,
      description: loc.description,
      steps: loc.steps,
      flowDefinition: flow,
      createdBy: uid,
      isActive: true,
    })
    toast.success(t.workflowTemplates.toastSequenceInstalled)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label={t.common.close}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="workflow-template-lib-title"
        className="relative z-10 w-full max-w-3xl max-h-[88vh] flex flex-col glass rounded-2xl border border-fg/8 shadow-2xl overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-fg/6 shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-accent-500/15 shrink-0">
              <Library size={18} className="text-accent-400" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 id="workflow-template-lib-title" className="text-base font-semibold text-fg">
                {t.workflowTemplates.dialogTitle}
              </h2>
              <p className="text-xs text-fg-subtle mt-0.5">{t.workflowTemplates.dialogSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-fg-subtle hover:text-fg hover:bg-fg/6 transition-colors"
            aria-label={t.common.close}
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-fg/6 space-y-3 shrink-0">
          <div className="flex flex-wrap gap-2">
            {(['all', 'automation', 'sequence'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  kind === k
                    ? 'border-accent-500/50 bg-accent-500/15 text-accent-300'
                    : 'border-fg/10 text-fg-muted hover:border-fg/20 hover:text-fg'
                }`}
              >
                {k === 'all' ? t.workflowTemplates.filterAll : k === 'automation' ? t.workflowTemplates.filterAutomations : t.workflowTemplates.filterSequences}
              </button>
            ))}
          </div>
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.workflowTemplates.searchPlaceholder}
            aria-label={t.workflowTemplates.searchPlaceholder}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-fg-subtle text-center py-8">{t.common.noResults}</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {filtered.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-xl border border-fg/8 bg-fg/[0.02] p-4 flex flex-col gap-2"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-fg/10 text-fg-muted">
                      {t.workflowTemplates.categories[entry.category]}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-accent-500/25 text-accent-300 flex items-center gap-1">
                      <Sparkles size={10} aria-hidden />
                      {t.workflowTemplates.situations[entry.situation]}
                    </span>
                    <span className="text-[10px] text-fg-subtle ml-auto">
                      {entry.kind === 'automation' ? t.automations.title : t.sequences.title}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-fg leading-snug">{entryTitle(entry, t)}</p>
                  <p className="text-xs text-fg-subtle line-clamp-3 flex-1">{entryDescription(entry, t)}</p>
                  <Button type="button" size="sm" variant="primary" className="w-full mt-1" onClick={() => install(entry)}>
                    {t.workflowTemplates.install}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
