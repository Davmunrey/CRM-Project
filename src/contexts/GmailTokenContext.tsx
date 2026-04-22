import { createContext, useContext, useMemo, useState, useCallback, type ReactNode } from 'react'

interface GmailTokenState {
  accessToken: string | null
  expiresAt: number | null
}

interface GmailTokenContextValue extends GmailTokenState {
  setGmailToken: (accessToken: string, expiresAt: number) => void
  clearGmailToken: () => void
  isTokenValid: () => boolean
}

const GmailTokenContext = createContext<GmailTokenContextValue | null>(null)

export function GmailTokenProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GmailTokenState>({ accessToken: null, expiresAt: null })

  const setGmailToken = useCallback((accessToken: string, expiresAt: number) => {
    setState({ accessToken, expiresAt })
  }, [])

  const clearGmailToken = useCallback(() => {
    setState({ accessToken: null, expiresAt: null })
  }, [])

  const isTokenValid = useCallback(() => {
    return !!state.accessToken && !!state.expiresAt && state.expiresAt > Date.now()
  }, [state])

  const value = useMemo(
    () => ({ ...state, setGmailToken, clearGmailToken, isTokenValid }),
    [state, setGmailToken, clearGmailToken, isTokenValid],
  )

  return (
    <GmailTokenContext.Provider value={value}>
      {children}
    </GmailTokenContext.Provider>
  )
}

export function useGmailToken(): GmailTokenContextValue {
  const ctx = useContext(GmailTokenContext)
  if (!ctx) throw new Error('useGmailToken must be used within GmailTokenProvider')
  return ctx
}
