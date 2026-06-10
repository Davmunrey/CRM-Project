import type { ReactNode } from 'react'
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ToastContainer } from '../ui/Toast'
import { CommandPalette } from './CommandPalette'
import { AiAssistant } from '../ai/AiAssistant'
import { useAuthStore } from '../../store/authStore'
import { useAiStore } from '../../store/aiStore'
import { toast } from '../../store/toastStore'
import { useTranslations } from '../../i18n'
import { EnvironmentBanner } from './EnvironmentBanner'

interface LayoutProps {
  children: ReactNode
  title: string
}

export function Layout({ children, title }: LayoutProps) {
  const t = useTranslations()
  const { pathname } = useLocation()
  const [cmdOpen, setCmdOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const navigate = useNavigate()
  const openAssistant = useAiStore((s) => s.openAssistant)
  const sessionCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Session expiry check every 60 seconds
  useEffect(() => {
    const checkSession = () => {
      const { session, logout, isAuthenticated } = useAuthStore.getState()
      if (!isAuthenticated()) return
      if (session && Date.now() > session.expiresAt) {
        void logout().then(() => {
          toast.error(t.auth.login)
          navigate('/login')
        })
      }
    }

    sessionCheckRef.current = setInterval(checkSession, 60_000)
    return () => {
      if (sessionCheckRef.current) clearInterval(sessionCheckRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- t.auth.login is a stable translation string; including it would recreate the interval on every language change unnecessarily
  }, [navigate])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  // Probe AI availability once so AI actions can show/hide app-wide.
  useEffect(() => {
    void useAiStore.getState().fetchStatus()
  }, [])

  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileNavOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileNavOpen])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const closeOnDesktop = () => {
      if (mq.matches) setMobileNavOpen(false)
    }
    mq.addEventListener('change', closeOnDesktop)
    return () => mq.removeEventListener('change', closeOnDesktop)
  }, [])

  useEffect(() => {
    if (mobileNavOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileNavOpen])

  return (
    <div className="flex h-screen flex-col bg-surface-1 overflow-hidden">
      <EnvironmentBanner />
      <div className="flex min-h-0 flex-1 overflow-hidden bg-surface-0">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-accent-600 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-fg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white/40"
      >
        {t.common.skipToMain}
      </a>
      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-surface-0/60 backdrop-blur-sm md:hidden"
          aria-label={t.common.close}
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <div
        className={`h-full flex-shrink-0 ${
          mobileNavOpen ? 'fixed inset-y-0 left-0 z-50 flex shadow-float' : 'hidden'
        } md:relative md:inset-auto md:z-auto md:flex md:shadow-none`}
      >
        <Sidebar />
      </div>
      <div className="app-workspace-column flex flex-col flex-1 min-w-0 overflow-hidden bg-surface-1">
        <Topbar
          title={title}
          onOpenCommandPalette={() => setCmdOpen(true)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main
          id="main-content"
          className="flex-1 min-h-0 overflow-y-auto scroll-smooth app-main-surface"
        >
          {children}
        </main>
      </div>
      <button
        type="button"
        onClick={openAssistant}
        aria-label={t.ai.openAssistant}
        title={t.ai.assistantTitle}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full btn-gradient text-fg shadow-float focus-ring"
      >
        <Sparkles size={20} aria-hidden />
      </button>
      <AiAssistant />
      <ToastContainer />
      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
      </div>
    </div>
  )
}
