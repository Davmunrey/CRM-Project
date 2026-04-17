import type { ReactNode } from 'react'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ToastContainer } from '../ui/Toast'
import { CommandPalette } from './CommandPalette'
import { useAuthStore } from '../../store/authStore'
import { toast } from '../../store/toastStore'
import { useTranslations } from '../../i18n'
import { EnvironmentBanner } from './EnvironmentBanner'

interface LayoutProps {
  children: ReactNode
  title: string
}

export function Layout({ children, title }: LayoutProps) {
  const t = useTranslations()
  const [cmdOpen, setCmdOpen] = useState(false)
  const navigate = useNavigate()
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

  return (
    <div className="flex h-screen flex-col bg-surface-1 overflow-hidden">
      <EnvironmentBanner />
      <div className="flex min-h-0 flex-1 overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white/40"
      >
        {t.common.skipToMain}
      </a>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar title={title} onOpenCommandPalette={() => setCmdOpen(true)} />
        <main id="main-content" className="flex-1 min-h-0 overflow-y-auto scroll-smooth">
          {children}
        </main>
      </div>
      <ToastContainer />
      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
      </div>
    </div>
  )
}
