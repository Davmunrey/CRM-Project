import { useEffect, useRef, useState } from 'react'
import { Sparkles, Send, Trash2, Wrench } from 'lucide-react'
import { SlideOver } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Switch } from '../ui/Switch'
import { Spinner } from '../ui/Spinner'
import { useTranslations } from '../../i18n'
import { useAiStore } from '../../store/aiStore'

/**
 * Global AI assistant drawer. Renders a tool-using chat backed by the Propel
 * agent endpoint. Mounted once in the app shell; opened via the store.
 */
export function AiAssistant() {
  const t = useTranslations()
  const isOpen = useAiStore((s) => s.isOpen)
  const close = useAiStore((s) => s.closeAssistant)
  const status = useAiStore((s) => s.status)
  const messages = useAiStore((s) => s.messages)
  const isSending = useAiStore((s) => s.isSending)
  const allowWrites = useAiStore((s) => s.allowWrites)
  const setAllowWrites = useAiStore((s) => s.setAllowWrites)
  const sendMessage = useAiStore((s) => s.sendMessage)
  const clearConversation = useAiStore((s) => s.clearConversation)
  const fetchStatus = useAiStore((s) => s.fetchStatus)
  const statusChecked = useAiStore((s) => s.statusChecked)

  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (isOpen && !statusChecked) void fetchStatus()
  }, [isOpen, statusChecked, fetchStatus])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isSending) return
    setInput('')
    void sendMessage(text)
  }

  const enabled = status?.enabled !== false

  return (
    <SlideOver isOpen={isOpen} onClose={close} title={t.ai.assistantTitle} width="lg">
      <div className="flex flex-col h-full">
        {!enabled ? (
          <div className="flex flex-col items-center justify-center text-center gap-3 px-6 py-16 text-fg-muted">
            <Sparkles size={32} className="text-accent-400" aria-hidden />
            <p className="text-fg font-medium">{t.ai.notConfigured}</p>
            <p className="text-sm text-fg-subtle max-w-xs">{t.ai.notConfiguredHint}</p>
          </div>
        ) : (
          <>
            {/* Conversation */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center gap-3 px-6 py-12 text-fg-muted">
                  <Sparkles size={28} className="text-accent-400" aria-hidden />
                  <p className="text-sm text-fg-subtle max-w-sm">{t.ai.emptyState}</p>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                  >
                    <div
                      className={
                        m.role === 'user'
                          ? 'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm bg-accent-500/15 text-fg'
                          : 'max-w-[90%] rounded-2xl px-4 py-2.5 text-sm bg-surface-2 text-fg border border-border-subtle'
                      }
                    >
                      {m.pending ? (
                        <span className="flex items-center gap-2 text-fg-muted">
                          <Spinner size={14} /> {t.ai.thinking}
                        </span>
                      ) : (
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      )}
                      {m.steps && m.steps.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border-subtle/60 space-y-1">
                          <p className="text-xs text-fg-subtle flex items-center gap-1">
                            <Wrench size={11} aria-hidden /> {t.ai.usedTools}
                          </p>
                          {m.steps.map((s, i) => (
                            <p key={i} className="text-xs text-fg-subtle font-mono break-all">
                              {s.tool}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Controls */}
            <div className="mt-3 pt-3 border-t border-border-subtle space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-fg-muted cursor-pointer">
                  <Switch checked={allowWrites} onChange={setAllowWrites} aria-label={t.ai.allowActions} />
                  <span>
                    {t.ai.allowActions}
                    <span className="block text-xs text-fg-subtle">{t.ai.allowActionsHint}</span>
                  </span>
                </label>
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="xs"
                    leftIcon={<Trash2 size={13} aria-hidden />}
                    onClick={clearConversation}
                  >
                    {t.ai.newChat}
                  </Button>
                )}
              </div>

              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  rows={2}
                  placeholder={t.ai.assistantPlaceholder}
                  aria-label={t.ai.assistantPlaceholder}
                  className="flex-1 resize-none rounded-xl bg-surface-1 border border-border-subtle focus-ring px-3 py-2 text-sm text-fg placeholder:text-fg-subtle"
                />
                <Button
                  variant="primary"
                  size="md"
                  loading={isSending}
                  disabled={!input.trim()}
                  onClick={handleSend}
                  aria-label={t.ai.send}
                  leftIcon={<Send size={15} aria-hidden />}
                >
                  {t.ai.send}
                </Button>
              </div>

              {status?.activeProvider && (
                <p className="text-xs text-fg-subtle text-center">
                  {t.ai.poweredBy.replace('{provider}', status.activeProvider)}
                  {status.model ? ` · ${status.model}` : ''}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </SlideOver>
  )
}
