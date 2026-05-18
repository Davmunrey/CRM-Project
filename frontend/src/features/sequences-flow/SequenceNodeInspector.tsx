import { useCallback, useEffect, useRef } from 'react'
import { MousePointer2 } from 'lucide-react'
import { useTranslations } from '../../i18n'
import { Select } from '../../components/ui/Select'
import { EmailComposer } from '../../components/email/EmailComposer'
import type { SequenceEmailThreadMode, SequenceFlowDefinition, SequenceStep } from '../../types'
import { isAbSplitPayload } from '../../types'
import { updateAbSplitWeights, updateNodeData } from './sequenceFlowMutations'
import { useTemplateStore } from '../../store/templateStore'

export interface SequenceNodeInspectorProps {
  flow: SequenceFlowDefinition
  selectedNodeId: string | null
  onChangeFlow: (next: SequenceFlowDefinition) => void
}

export function SequenceNodeInspector({ flow, selectedNodeId, onChangeFlow }: SequenceNodeInspectorProps) {
  const t = useTranslations()
  const templates = useTemplateStore((s) => s.templates)
  const fetchTemplates = useTemplateStore((s) => s.fetchTemplates)
  const incrementUsage = useTemplateStore((s) => s.incrementUsage)

  useEffect(() => {
    void fetchTemplates()
  }, [fetchTemplates])

  const flowRef = useRef(flow)
  useEffect(() => {
    flowRef.current = flow
  }, [flow])

  const handleSequenceMailboxDraft = useCallback(
    (draft: {
      subject: string
      body: string
      useEmailSignature: boolean
      emailSignatureHtml: string
      emailSenderName: string
      cc: string
      bcc: string
    }) => {
      if (!selectedNodeId) return
      const f = flowRef.current
      const n = f.nodes.find((x) => x.id === selectedNodeId)
      if (!n || n.type !== 'email') return
      const st = n.data as SequenceStep
      onChangeFlow(
        updateNodeData(f, selectedNodeId, {
          ...st,
          subject: draft.subject,
          bodyTemplate: draft.body,
          useEmailSignature: draft.useEmailSignature,
          emailSignatureHtml: draft.emailSignatureHtml,
          emailSenderName: draft.emailSenderName,
          cc: draft.cc || undefined,
          bcc: draft.bcc || undefined,
        }),
      )
    },
    [selectedNodeId, onChangeFlow],
  )

  const node = selectedNodeId ? flow.nodes.find((n) => n.id === selectedNodeId) : undefined

  if (!node) {
    return (
      <div className="rounded-lg border border-dashed border-fg/12 bg-fg/[0.02] px-3 py-8 text-center lg:py-10">
        <MousePointer2 className="mx-auto mb-2 h-7 w-7 text-fg-subtle/50" strokeWidth={1.25} aria-hidden />
        <p className="text-[11px] text-fg-subtle leading-snug max-w-[14rem] mx-auto">{t.sequences.flow.inspectorEmpty}</p>
      </div>
    )
  }

  if (node.type === 'ab_split' && isAbSplitPayload(node.data)) {
    const d = node.data
    return (
      <div className="rounded-xl border border-fg/8 bg-fg/[0.03] p-4 space-y-4">
        <h3 className="text-xs font-semibold text-fg-muted uppercase tracking-wide">{t.sequences.flow.inspectorTitle}</h3>
        <div>
          <label className="block text-[10px] font-medium text-fg-subtle mb-1">{t.sequences.flow.abWeightA}</label>
          <input
            type="number"
            min={0}
            max={100}
            value={Math.round(d.weightA)}
            onChange={(e) => {
              const weightA = Number(e.target.value) || 0
              onChangeFlow(updateAbSplitWeights(flow, node.id, weightA, d.weightB))
            }}
            className="w-full bg-surface-2 border border-fg/10 rounded-lg px-3 py-2 text-fg text-xs"
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-fg-subtle mb-1">{t.sequences.flow.abWeightB}</label>
          <input
            type="number"
            min={0}
            max={100}
            value={Math.round(d.weightB)}
            onChange={(e) => {
              const weightB = Number(e.target.value) || 0
              onChangeFlow(updateAbSplitWeights(flow, node.id, d.weightA, weightB))
            }}
            className="w-full bg-surface-2 border border-fg/10 rounded-lg px-3 py-2 text-fg text-xs"
          />
        </div>
        <p className="text-[10px] text-fg-subtle leading-relaxed">{t.sequences.flow.abInspectorHint}</p>
      </div>
    )
  }

  const stepNode = node
  const step = stepNode.data as SequenceStep

  if (step.type !== 'email') {
    return (
      <div className="rounded-xl border border-fg/8 bg-fg/[0.03] p-4 space-y-3 min-h-0 flex flex-col max-h-[min(82vh,720px)] overflow-y-auto lg:max-h-[min(88vh,800px)]">
        <h3 className="text-xs font-semibold text-fg-muted uppercase tracking-wide shrink-0">{t.sequences.flow.inspectorTitle}</h3>
        <p className="text-sm text-fg-muted leading-relaxed">{t.sequences.flow.inspectorLegacyNonEmail}</p>
        <p className="text-[10px] text-fg-subtle leading-relaxed">{t.sequences.flow.inspectorLegacyNonEmailHint}</p>
      </div>
    )
  }

  function applyEmailStep(next: SequenceStep) {
    onChangeFlow(updateNodeData(flow, stepNode.id, next))
  }

  return (
    <div className="rounded-xl border border-fg/8 bg-fg/[0.03] p-4 space-y-4 min-h-0 flex flex-col max-h-[min(82vh,720px)] overflow-y-auto lg:max-h-[min(88vh,800px)]">
      <h3 className="text-xs font-semibold text-fg-muted uppercase tracking-wide shrink-0">{t.sequences.flow.inspectorTitle}</h3>

      <Select
        label={t.sequences.flow.stepEmailTemplateLabel}
        value={step.emailTemplateId ?? ''}
        onChange={(e) => {
          const id = e.target.value
          if (!id) {
            applyEmailStep({ ...step, emailTemplateId: undefined })
            return
          }
          const tpl = templates.find((x) => x.id === id)
          if (!tpl) return
          incrementUsage(id)
          applyEmailStep({
            ...step,
            emailTemplateId: id,
            subject: tpl.subject,
            bodyTemplate: tpl.body,
          })
        }}
        options={[
          { value: '', label: t.sequences.flow.stepEmailTemplateNone },
          ...templates.map((tpl) => ({ value: tpl.id, label: tpl.name })),
        ]}
        listMaxHeightClass="max-h-48"
      />

      <Select
        label={t.sequences.flow.emailThreadModeLabel}
        value={step.emailThreadMode ?? 'new_thread'}
        onChange={(e) => {
          const v = e.target.value as SequenceEmailThreadMode
          applyEmailStep({ ...step, emailThreadMode: v })
        }}
        options={[
          { value: 'new_thread', label: t.sequences.flow.emailThreadModeNew },
          { value: 'reply_in_thread', label: t.sequences.flow.emailThreadModeReply },
        ]}
        listMaxHeightClass="max-h-40"
      />
      <p className="text-[10px] text-fg-subtle leading-relaxed -mt-2">{t.sequences.flow.emailThreadModeReplyHint}</p>
      <div className="min-h-[min(320px,40svh)] flex-1 flex flex-col min-w-0 border border-fg/8 rounded-xl overflow-hidden bg-surface-2/15 xl:min-h-[min(52vh,560px)]">
        <EmailComposer
          isOpen
          onClose={() => {}}
          presentation="inline"
          embeddedSequenceStep
          sequenceEmbedResetKey={stepNode.id}
          defaultSubject={step.subject ?? ''}
          defaultBody={step.bodyTemplate ?? ''}
          defaultCc={step.cc ?? ''}
          defaultBcc={step.bcc ?? ''}
          sequenceStepEmailExtras={{
            useEmailSignature: step.useEmailSignature,
            emailSignatureHtml: step.emailSignatureHtml,
            emailSenderName: step.emailSenderName,
            cc: step.cc,
            bcc: step.bcc,
          }}
          onSequenceStepDraftChange={handleSequenceMailboxDraft}
        />
      </div>
    </div>
  )
}
