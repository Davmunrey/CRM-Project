import { useState, useEffect, type ReactNode } from 'react'
import { Sparkles, Copy, Check, X } from 'lucide-react'
import { Button } from '../ui/Button'
import { useTranslations } from '../../i18n'
import { useAiStore } from '../../store/aiStore'
import { getErrorMessage } from '../../lib/supabaseHelpers'
import { toast } from '../../store/toastStore'

interface AiInsightProps {
  /** Button label. */
  label: string
  /** Label while the request is in flight. */
  loadingLabel: string
  /** Heading shown above the produced text. */
  resultTitle: string
  /** Produces the AI text. Throws to surface an error toast. */
  run: () => Promise<string>
  /** Optional secondary action on the result (e.g. "Use draft"). */
  onUse?: ((text: string) => void) | undefined
  useLabel?: string | undefined
  icon?: ReactNode
  size?: 'xs' | 'sm' | 'md'
  variant?: 'primary' | 'secondary' | 'ghost'
  /** When this changes, the produced result is cleared — pass the record id so a
   *  result computed for one record doesn't linger when a persistent drawer switches. */
  resetKey?: string | number | undefined
}

/**
 * A self-contained AI action: a button that runs an async producer and renders
 * the result inline with copy / use / dismiss controls. Renders nothing when AI
 * is known to be disabled, so callers can drop it in unconditionally.
 */
export function AiInsight({
  label,
  loadingLabel,
  resultTitle,
  run,
  onUse,
  useLabel,
  icon,
  size = 'sm',
  variant = 'secondary',
  resetKey,
}: AiInsightProps) {
  const t = useTranslations()
  const status = useAiStore((s) => s.status)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Clear the produced result when the target record changes (e.g. a persistent
  // detail drawer switches deals) so the previous record's insight doesn't linger.
  useEffect(() => {
    setResult(null)
    setCopied(false)
  }, [resetKey])

  // Hide entirely when we know AI is off; show optimistically while unknown.
  if (status && !status.enabled) return null

  const handleRun = async () => {
    setLoading(true)
    try {
      const text = await run()
      setResult(text)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!result) return
    void navigator.clipboard?.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="inline-flex flex-col gap-2">
      <Button
        variant={variant}
        size={size}
        loading={loading}
        onClick={handleRun}
        leftIcon={icon ?? <Sparkles size={14} aria-hidden />}
      >
        {loading ? loadingLabel : label}
      </Button>

      {result !== null && (
        <div className="rounded-xl border border-border-subtle bg-surface-2 p-3 text-sm text-fg max-w-md">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-fg-subtle flex items-center gap-1">
              <Sparkles size={12} className="text-accent-400" aria-hidden /> {resultTitle}
            </span>
            <button
              type="button"
              onClick={() => setResult(null)}
              aria-label={t.ai.close}
              className="text-fg-subtle hover:text-fg focus-ring rounded"
            >
              <X size={14} aria-hidden />
            </button>
          </div>
          <p className="whitespace-pre-wrap break-words">{result}</p>
          <div className="mt-2 flex items-center gap-2">
            <Button
              variant="ghost"
              size="xs"
              onClick={handleCopy}
              leftIcon={copied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
            >
              {copied ? t.ai.copied : t.ai.copy}
            </Button>
            {onUse && (
              <Button variant="ghost" size="xs" onClick={() => onUse(result)}>
                {useLabel ?? t.ai.useDraft}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
