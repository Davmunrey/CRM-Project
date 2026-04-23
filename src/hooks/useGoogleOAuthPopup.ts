import { useCallback, useRef, useState } from 'react'
import {
  fetchGoogleOAuthStartUrl,
  GOOGLE_OAUTH_MESSAGE_SOURCE,
  type GoogleOAuthBundle,
} from '../services/googleIntegrationService'

export type GoogleOAuthPopupResult = { ok: boolean; error?: string; email?: string }

type Options = {
  friendlyError: (code?: string, raw?: string) => string
  edgeUnreachableMessage: string
}

/**
 * Centered popup OAuth; parent notified via postMessage from GmailCallback.
 */
export function useGoogleOAuthPopup(options: Options) {
  const optsRef = useRef(options)
  optsRef.current = options

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const launch = useCallback((bundle: GoogleOAuthBundle): Promise<GoogleOAuthPopupResult> => {
    setLoading(true)
    setError(null)
    const { friendlyError, edgeUnreachableMessage } = optsRef.current

    return new Promise((resolve) => {
      void (async () => {
        let pollClosed: ReturnType<typeof setInterval> | null = null
        const clearPoll = () => {
          if (pollClosed !== null) {
            clearInterval(pollClosed)
            pollClosed = null
          }
        }
        try {
          const url = await fetchGoogleOAuthStartUrl(bundle)
          const w = 500
          const h = 650
          const left = window.screenX + (window.outerWidth - w) / 2
          const top = window.screenY + (window.outerHeight - h) / 2
          const popup = window.open(
            url,
            'google_oauth',
            `width=${w},height=${h},left=${left},top=${top},menubar=no,toolbar=no,location=yes,status=no`,
          )
          if (!popup) {
            window.location.assign(url)
            setLoading(false)
            resolve({ ok: false, error: 'popup_blocked' })
            return
          }

          const onMessage = (evt: MessageEvent) => {
            if (evt.origin !== window.location.origin) return
            if (evt.data?.source !== GOOGLE_OAUTH_MESSAGE_SOURCE) return
            window.removeEventListener('message', onMessage)
            clearPoll()
            const p = evt.data?.payload as GoogleOAuthPopupResult | undefined
            setLoading(false)
            if (p?.ok) {
              resolve({ ok: true, email: p.email })
            } else {
              const msg = friendlyError(p?.error, p?.error)
              if (msg) setError(msg)
              resolve({ ok: false, error: p?.error })
            }
          }
          window.addEventListener('message', onMessage)

          pollClosed = setInterval(() => {
            if (popup.closed) {
              clearPoll()
              window.removeEventListener('message', onMessage)
              setLoading(false)
              resolve({ ok: false, error: 'popup_closed' })
            }
          }, 500)
        } catch (e) {
          const raw = e instanceof Error ? e.message : String(e)
          if (/failed to send|edge function|networkerror|load failed|fetch/i.test(raw)) {
            setError(edgeUnreachableMessage)
          } else {
            setError(raw.length > 0 && raw.length < 220 ? raw : friendlyError(undefined, raw))
          }
          setLoading(false)
          resolve({ ok: false, error: raw })
        }
      })()
    })
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { launch, loading, error, clearError }
}
