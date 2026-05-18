import { useMemo } from 'react'
import { useTranslations, getTranslations } from '../../i18n'
import { getEmailMergeFieldOptions } from '../../utils/emailMergeFields'
import { toast } from '../../store/toastStore'

/** Reference list of merge tokens for sequence subject/body (same tokens as mailbox sends). */
export function SequencePersonalisePanel() {
  const t = useTranslations()
  const rows = useMemo(() => getEmailMergeFieldOptions(getTranslations()), [])

  async function copyToken(token: string) {
    try {
      await navigator.clipboard.writeText(token)
      toast.success(t.sequences.flow.personalizeTokenCopied)
    } catch {
      toast.error(t.errors.unknownError)
    }
  }

  return (
    <div className="rounded-xl border border-fg/8 bg-fg/[0.03] p-4 space-y-4 max-h-[min(82vh,720px)] overflow-y-auto">
      <h3 className="text-xs font-semibold text-fg-muted uppercase tracking-wide">{t.sequences.flow.personalizeTitle}</h3>
      <p className="text-sm text-fg-muted leading-relaxed">{t.sequences.flow.personalizeIntro}</p>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.token} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-fg/8 bg-surface-2/20 px-3 py-2">
            <span className="text-xs text-fg font-mono">{row.token}</span>
            <span className="text-[11px] text-fg-subtle flex-1 min-w-[8rem]">{row.label}</span>
            <button type="button"
              onClick={() => copyToken(row.token)}
              className="text-[10px] font-medium px-2 py-1 rounded-md bg-fg/8 text-fg-muted hover:text-fg hover:bg-fg/12 transition-colors shrink-0"
            >
              {t.sequences.flow.personalizeCopy}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
