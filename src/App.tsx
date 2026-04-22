import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { initSupabaseAuth, useAuthStore } from './store/authStore'
import { Layout } from './components/layout/Layout'
import { ErrorBoundary } from './components/layout/ErrorBoundary'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { WorkspaceHostBootstrap } from './components/auth/WorkspaceHostBootstrap'
import { ContactDetail } from './pages/ContactDetail'
import { CompanyDetail } from './pages/CompanyDetail'
import { FollowUps } from './pages/FollowUps'
import { AuditLog } from './pages/AuditLog'
import { SalesGoals } from './pages/SalesGoals'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { OrgSetup } from './pages/OrgSetup'
import { OrgAccessRequired } from './pages/OrgAccessRequired'
import { AcceptInvite } from './pages/AcceptInvite'
import { TeamManagement } from './pages/TeamManagement'
import { UserProfile } from './pages/UserProfile'
import { Notifications } from './pages/Notifications'
import { PipelineTimeline } from './pages/PipelineTimeline'
import { Automations } from './pages/Automations'
import { Products } from './pages/Products'
import { useTranslations, useI18nStore } from './i18n'
import { useDataInit } from './hooks/useDataInit'
import { GmailTokenProvider } from './contexts/GmailTokenContext'
import { GmailCallback } from './pages/GmailCallback'
import { useSettingsStore } from './store/settingsStore'
import { applyTheme, applyUiDensity } from './lib/theme'
import { applyBrandingAccentToDocument } from './lib/brandingAccent'
import { isBootstrapFatalError } from './lib/supabase'
import { loadDateFnsLocale } from './lib/dateFnsLocale'

const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Reports = lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })))
const Forecast = lazy(() => import('./pages/Forecast').then((m) => ({ default: m.Forecast })))
const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard').then((m) => ({ default: m.ManagerDashboard })))
const Contacts = lazy(() => import('./pages/Contacts').then((m) => ({ default: m.Contacts })))
const Leads = lazy(() => import('./pages/Leads').then((m) => ({ default: m.Leads })))
const Companies = lazy(() => import('./pages/Companies').then((m) => ({ default: m.Companies })))
const Deals = lazy(() => import('./pages/Deals').then((m) => ({ default: m.Deals })))
const Activities = lazy(() => import('./pages/Activities').then((m) => ({ default: m.Activities })))
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })))
const Inbox = lazy(() => import('./pages/Inbox').then((m) => ({ default: m.Inbox })))
const EmailTemplates = lazy(() => import('./pages/EmailTemplates').then((m) => ({ default: m.EmailTemplates })))
const Calendar = lazy(() => import('./pages/Calendar').then((m) => ({ default: m.Calendar })))
const Sequences = lazy(() => import('./pages/Sequences').then((m) => ({ default: m.Sequences })))

function ProtectedPage({ title, children, requiredPermission }: { title: string; children: React.ReactNode; requiredPermission?: import('./types/auth').Permission }) {
  return (
    <ProtectedRoute requiredPermission={requiredPermission}>
      <Layout title={title}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </Layout>
    </ProtectedRoute>
  )
}

/** Unknown paths: send guests to login, signed-in users to dashboard. */
function CatchAllRedirect() {
  const user = useAuthStore((s) => s.currentUser)
  return <Navigate to={user ? '/' : '/login'} replace />
}

/** Shown before router when production/staging build lacks Supabase env (copy is localized). */
function BootstrapFatalScreen() {
  const t = useTranslations()
  return (
    <div className="min-h-screen bg-surface-0 text-fg flex items-center justify-center p-8">
      <div className="max-w-lg rounded-2xl border border-danger/30 bg-danger/10 p-8 text-center">
        <h1 className="text-xl font-semibold text-fg mb-2">{t.errors.configurationBootstrapTitle}</h1>
        <p className="text-sm text-fg-muted mb-4">
          {t.errors.configurationBootstrapUses}{' '}
          <code className="text-accent-300">VITE_APP_CHANNEL=production</code> {t.errors.configurationBootstrapOr}{' '}
          <code className="text-accent-300">VITE_APP_CHANNEL=staging</code> {t.errors.configurationBootstrapRequiresValid}{' '}
          <code className="text-accent-300">VITE_SUPABASE_URL</code> {t.errors.configurationBootstrapAnd}{' '}
          <code className="text-accent-300">VITE_SUPABASE_ANON_KEY</code>
          {t.errors.configurationBootstrapDemoIntro} <code className="text-accent-300">VITE_APP_CHANNEL=demo</code>
          {t.errors.configurationBootstrapDemoOutro}
        </p>
        <p className="text-xs text-fg-subtle">{t.errors.configurationBootstrapFooter}</p>
      </div>
    </div>
  )
}

function AppRoutes() {
  const t = useTranslations()
  useDataInit()
  const lazyFallback = <div className="crm-page text-sm text-fg-muted">{t.common.loading}</div>

  useEffect(() => {
    void loadDateFnsLocale(useI18nStore.getState().language)
    let lastLang = useI18nStore.getState().language
    const unsub = useI18nStore.subscribe((s) => {
      if (s.language !== lastLang) {
        lastLang = s.language
        void loadDateFnsLocale(s.language)
      }
    })
    return unsub
  }, [])

  return (
    <Suspense fallback={lazyFallback}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/org-setup" element={<OrgSetup />} />
        <Route path="/org-access-required" element={<OrgAccessRequired />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/auth/gmail/callback" element={<GmailCallback />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedPage title={t.nav.dashboard}>
              <Dashboard />
            </ProtectedPage>
          }
        />
        <Route path="/contacts" element={<ProtectedPage title={t.nav.contacts} requiredPermission="contacts:read"><Contacts /></ProtectedPage>} />
        <Route path="/leads" element={<ProtectedPage title={t.nav.leads} requiredPermission="contacts:read"><Leads /></ProtectedPage>} />
        <Route path="/contacts/:id" element={<ProtectedPage title={t.nav.contacts} requiredPermission="contacts:read"><ContactDetail /></ProtectedPage>} />
        <Route path="/companies" element={<ProtectedPage title={t.nav.companies} requiredPermission="companies:read"><Companies /></ProtectedPage>} />
        <Route path="/companies/:id" element={<ProtectedPage title={t.nav.companies} requiredPermission="companies:read"><CompanyDetail /></ProtectedPage>} />
        <Route path="/deals" element={<ProtectedPage title={t.nav.deals} requiredPermission="deals:read"><Deals /></ProtectedPage>} />
        <Route path="/activities" element={<ProtectedPage title={t.nav.activities} requiredPermission="activities:read"><Activities /></ProtectedPage>} />
        <Route
          path="/reports"
          element={
            <ProtectedPage title={t.nav.reports} requiredPermission="reports:read">
              <Reports />
            </ProtectedPage>
          }
        />
        <Route
          path="/manager"
          element={
            <ProtectedPage title={t.nav.managerDashboard} requiredPermission="reports:read">
              <ManagerDashboard />
            </ProtectedPage>
          }
        />
        <Route path="/inbox" element={<ProtectedPage title={t.nav.inbox} requiredPermission="email:read"><Inbox /></ProtectedPage>} />
        <Route path="/settings" element={<ProtectedPage title={t.nav.settings} requiredPermission="settings:read"><Settings /></ProtectedPage>} />
        <Route path="/templates" element={<ProtectedPage title={t.nav.templates} requiredPermission="templates:read"><EmailTemplates /></ProtectedPage>} />
        <Route path="/follow-ups" element={<ProtectedPage title={t.nav.followUps} requiredPermission="contacts:read"><FollowUps /></ProtectedPage>} />
        <Route path="/audit" element={<ProtectedPage title={t.nav.audit} requiredPermission="audit:read"><AuditLog /></ProtectedPage>} />
        <Route path="/goals" element={<ProtectedPage title={t.nav.goals} requiredPermission="goals:read"><SalesGoals /></ProtectedPage>} />
        <Route path="/team" element={<ProtectedPage title={t.nav.team} requiredPermission="users:read"><TeamManagement /></ProtectedPage>} />
        <Route path="/notifications" element={<ProtectedPage title={t.nav.notifications}><Notifications /></ProtectedPage>} />
        <Route path="/timeline" element={<ProtectedPage title={t.nav.timeline} requiredPermission="deals:read"><PipelineTimeline /></ProtectedPage>} />
        <Route
          path="/forecast"
          element={
            <ProtectedPage title={t.nav.forecast} requiredPermission="reports:read">
              <Forecast />
            </ProtectedPage>
          }
        />
        <Route path="/sequences" element={<ProtectedPage title={t.nav.sequences} requiredPermission="sequences:read"><Sequences /></ProtectedPage>} />
        <Route path="/automations" element={<ProtectedPage title={t.nav.automations} requiredPermission="automations:read"><Automations /></ProtectedPage>} />
        <Route path="/products" element={<ProtectedPage title={t.nav.products} requiredPermission="products:read"><Products /></ProtectedPage>} />
        <Route path="/calendar" element={<ProtectedPage title={t.nav.calendar} requiredPermission="activities:read"><Calendar /></ProtectedPage>} />
        <Route path="/profile" element={<ProtectedPage title={t.auth.profile}><UserProfile /></ProtectedPage>} />

        <Route path="*" element={<CatchAllRedirect />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  useEffect(() => {
    const cleanup = initSupabaseAuth()
    return cleanup
  }, [])

  useEffect(() => {
    const applyCurrentTheme = () => {
      const { settings } = useSettingsStore.getState()
      applyTheme(settings.themePreference ?? 'system')
      applyUiDensity(settings.uiDensity)
      applyBrandingAccentToDocument(settings.branding.primaryColor)
    }

    applyCurrentTheme()
    const unsubscribe = useSettingsStore.subscribe(applyCurrentTheme)

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = () => {
      if (useSettingsStore.getState().settings.themePreference === 'system') {
        applyCurrentTheme()
      }
    }
    mediaQuery.addEventListener('change', handleSystemThemeChange)

    return () => {
      unsubscribe()
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
    }
  }, [])

  if (isBootstrapFatalError) {
    return <BootstrapFatalScreen />
  }

  return (
    <BrowserRouter>
      <GmailTokenProvider>
        <WorkspaceHostBootstrap />
        <AppRoutes />
      </GmailTokenProvider>
    </BrowserRouter>
  )
}
