import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser, Organization, Invitation, UserRole, Session } from '../types/auth'
import { api, getToken, setToken, clearToken, decodeToken, isTokenExpired } from '../lib/api'
import { devConsole } from '../lib/devConsole'
import { useAuditStore } from './auditStore'
import { toast } from './toastStore'
import { getTranslations } from '../i18n'

export interface OrgMemberIdentityRow {
  user_id: string
  email: string
  full_name: string
  member_role: string
  job_title: string | null
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
}

interface LoginResponse {
  token: string
  user: {
    id: string
    email: string
    name: string
    role: string
    organizationId: string | null
    orgSlug: string | null
  }
}

interface ApiMember {
  id: string
  email: string
  name: string
  role: string
  jobTitle: string | null
  avatarUrl: string | null
  isActive: boolean
  createdAt: string
}

export interface AuthState {
  currentUser: AuthUser | null
  session: Session | null
  organization: Organization | null
  isLoadingAuth: boolean
  organizationId: string | null
  tenantResolutionStatus: 'idle' | 'resolving' | 'ready' | 'needs_invitation' | 'error'
  tenantResolutionMessage: string | null
  workspaceSlugFromHost: string | null
  workspaceFromHost: { id: string; name: string } | null
  workspaceHostSlugNotFound: boolean
  workspaceHostResolutionPending: boolean
  workspaceHostMismatch: boolean
  setWorkspaceHostContext: (
    ctx:
      | null
      | {
          slug: string | null
          pending: boolean
          resolved: { id: string; name: string } | null
          slugNotFound: boolean
        },
  ) => void
  users: AuthUser[]
  passwords: Record<string, string>
  invitations: Invitation[]

  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  register: (data: { name: string; email: string; password: string }) => Promise<{ success: boolean; error?: string }>

  setCurrentUser: (user: AuthUser | null) => void
  setIsLoadingAuth: (v: boolean) => void
  setTenantResolution: (status: AuthState['tenantResolutionStatus'], message?: string | null) => void
  fetchOrgUsers: (organizationId: string) => Promise<void>
  ensureTenantForCurrentUser: () => Promise<void>

  addUser: (data: {
    name: string
    email: string
    password: string
    role: UserRole
    jobTitle: string
    phone?: string
  }) => { success: boolean; error?: string; user?: AuthUser }
  updateUser: (id: string, updates: Partial<Pick<AuthUser, 'name' | 'email' | 'jobTitle' | 'phone' | 'avatar' | 'isActive'>>) => void
  changeUserRole: (id: string, role: UserRole) => void
  deactivateUser: (id: string) => void
  reactivateUser: (id: string) => void
  changePassword: (userId: string, currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  resetPassword: (userId: string, newPassword: string) => Promise<void>

  createInvitation: (email: string, role: UserRole) => Invitation
  acceptInvitation: (invitationId: string, name: string, password: string) => { success: boolean; error?: string }
  cancelInvitation: (id: string) => void

  updateProfile: (updates: Partial<Pick<AuthUser, 'name' | 'jobTitle' | 'phone' | 'avatar'>>) => void
  getUserById: (id: string) => AuthUser | undefined
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      session: null,
      organization: null,
      isLoadingAuth: true,
      organizationId: null,
      tenantResolutionStatus: 'idle',
      tenantResolutionMessage: null,
      workspaceSlugFromHost: null,
      workspaceFromHost: null,
      workspaceHostSlugNotFound: false,
      workspaceHostResolutionPending: false,
      workspaceHostMismatch: false,
      users: [],
      passwords: {},
      invitations: [],

      setCurrentUser: (user) => {
        if (!user) {
          set({
            currentUser: null,
            organizationId: null,
            users: [],
            tenantResolutionStatus: 'idle',
            tenantResolutionMessage: null,
            workspaceHostMismatch: false,
          })
          return
        }
        set((state) => {
          const nextUsers = state.users.filter((u) => u.id !== user.id)
          nextUsers.unshift(user)
          return {
            currentUser: user,
            organizationId: user.organizationId ?? null,
            users: nextUsers,
            tenantResolutionStatus: user.organizationId ? 'ready' : state.tenantResolutionStatus,
            tenantResolutionMessage: user.organizationId ? null : state.tenantResolutionMessage,
          }
        })
      },

      setIsLoadingAuth: (v) => set({ isLoadingAuth: v }),
      setTenantResolution: (status, message = null) => set({ tenantResolutionStatus: status, tenantResolutionMessage: message }),

      setWorkspaceHostContext: (ctx) => {
        if (ctx === null) {
          set({
            workspaceSlugFromHost: null,
            workspaceFromHost: null,
            workspaceHostSlugNotFound: false,
            workspaceHostResolutionPending: false,
            workspaceHostMismatch: false,
          })
          return
        }
        set({
          workspaceSlugFromHost: ctx.slug,
          workspaceFromHost: ctx.resolved,
          workspaceHostSlugNotFound: ctx.slugNotFound,
          workspaceHostResolutionPending: ctx.pending,
        })
      },

      fetchOrgUsers: async (organizationId) => {
        const current = get().currentUser
        if (current?.organizationId && organizationId !== current.organizationId) return

        try {
          const res = await api.get<{ data: ApiMember[] }>('/orgs/me/members')
          const users: AuthUser[] = res.data.map((m) => ({
            id: m.id,
            email: m.email,
            name: m.name,
            role: normalizeRole(m.role),
            jobTitle: m.jobTitle ?? '',
            avatarUrl: m.avatarUrl ?? undefined,
            organizationId,
            isActive: m.isActive,
            createdAt: m.createdAt,
            updatedAt: m.createdAt,
          }))
          if (current && !users.some((u) => u.id === current.id)) {
            users.unshift({ ...current, organizationId })
          }
          set({ users })
        } catch (e) {
          devConsole.error('[authStore] fetchOrgUsers', e)
        }
      },

      ensureTenantForCurrentUser: async () => {
        const state = get()
        if (!state.currentUser || state.organizationId) {
          if (state.organizationId) set({ tenantResolutionStatus: 'ready', tenantResolutionMessage: null })
          return
        }
        set({ tenantResolutionStatus: 'resolving', tenantResolutionMessage: null })
        try {
          const org = await api.post<Organization>('/orgs', {
            name: state.currentUser.name,
            slug: state.currentUser.email.split('@')[0]?.replace(/[^a-z0-9]/g, '-') ?? 'workspace',
          })
          set({ organizationId: org.id, tenantResolutionStatus: 'ready', tenantResolutionMessage: null })
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Tenant error'
          set({ tenantResolutionStatus: 'error', tenantResolutionMessage: msg })
        }
      },

      login: async (email, password) => {
        try {
          const res = await api.post<LoginResponse>('/auth/login', { email, password })
          setToken(res.token)

          const now = new Date().toISOString()
          const payload = decodeToken(res.token)
          const session: Session = {
            userId: res.user.id,
            token: res.token,
            expiresAt: typeof payload?.['exp'] === 'number' ? payload['exp'] * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000,
            createdAt: now,
          }

          const user: AuthUser = {
            id: res.user.id,
            email: res.user.email,
            name: res.user.name,
            role: normalizeRole(res.user.role),
            jobTitle: '',
            organizationId: res.user.organizationId ?? undefined,
            isActive: true,
            lastLoginAt: now,
            createdAt: now,
            updatedAt: now,
          }

          set({
            currentUser: user,
            session,
            organizationId: res.user.organizationId ?? null,
            tenantResolutionStatus: res.user.organizationId ? 'ready' : 'idle',
          })

          if (res.user.organizationId) {
            void get().fetchOrgUsers(res.user.organizationId)
          }

          return { success: true }
        } catch (e) {
          return { success: false, error: e instanceof Error ? e.message : 'Login failed' }
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch {
          // ignore — clear local state regardless
        }
        clearToken()
        set({
          currentUser: null,
          session: null,
          organization: null,
          organizationId: null,
          tenantResolutionStatus: 'idle',
          tenantResolutionMessage: null,
          workspaceHostMismatch: false,
          users: [],
        })
      },

      register: async (data) => {
        try {
          const res = await api.post<LoginResponse>('/auth/register', data)
          setToken(res.token)

          const now = new Date().toISOString()
          const payload = decodeToken(res.token)
          const session: Session = {
            userId: res.user.id,
            token: res.token,
            expiresAt: typeof payload?.['exp'] === 'number' ? payload['exp'] * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000,
            createdAt: now,
          }

          const user: AuthUser = {
            id: res.user.id,
            email: res.user.email,
            name: res.user.name,
            role: 'admin',
            jobTitle: '',
            isActive: true,
            createdAt: now,
            updatedAt: now,
          }

          set({
            currentUser: user,
            session,
            users: [user],
            organizationId: null,
            tenantResolutionStatus: 'idle',
            tenantResolutionMessage: null,
          })

          return { success: true }
        } catch (e) {
          return { success: false, error: e instanceof Error ? e.message : 'Register failed' }
        }
      },

      addUser: (data) => {
        const state = get()
        if (!state.currentUser || !state.organizationId) {
          return { success: false, error: getTranslations().errors.notAuthenticated }
        }
        const existing = state.users.find((u) => u.email.toLowerCase() === data.email.toLowerCase())
        if (existing) return { success: false, error: getTranslations().errors.emailAlreadyExists }

        // Invite via API (async) — optimistic local add
        void api.post('/orgs/me/invite', { email: data.email, role: data.role }).catch((e: unknown) => {
          toast.error(e instanceof Error ? e.message : 'Invite failed')
        })

        const now = new Date().toISOString()
        const user: AuthUser = {
          id: crypto.randomUUID(),
          email: data.email,
          name: data.name,
          role: data.role,
          jobTitle: data.jobTitle,
          phone: data.phone,
          organizationId: state.organizationId,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }
        set((s) => ({ users: [...s.users, user] }))
        return { success: true, user }
      },

      updateUser: (id, updates) => {
        set((s) => ({
          users: s.users.map((u) => u.id === id ? { ...u, ...updates, updatedAt: new Date().toISOString() } : u),
          currentUser: s.currentUser?.id === id ? { ...s.currentUser, ...updates, updatedAt: new Date().toISOString() } : s.currentUser,
        }))

        // Sync to API for current user
        if (get().currentUser?.id === id) {
          void api.patch('/auth/me', updates).catch((e: unknown) => {
            devConsole.error('[authStore] updateUser', e)
            toast.error(e instanceof Error ? e.message : 'Update failed')
          })
        }
      },

      changeUserRole: (id, role) => {
        const target = get().users.find((u) => u.id === id)
        set((state) => ({
          users: state.users.map((u) => u.id === id ? { ...u, role, updatedAt: new Date().toISOString() } : u),
          currentUser: state.currentUser?.id === id ? { ...state.currentUser, role, updatedAt: new Date().toISOString() } : state.currentUser,
        }))
        if (target) {
          const tr = getTranslations()
          const roleLabel = (tr.team.roleLabels as Record<string, string>)[role] ?? role
          useAuditStore.getState().logAction('user_role_changed', 'user', target.id, target.name, tr.auditMessages.roleChangedTo.replace('{role}', roleLabel))
        }
      },

      deactivateUser: (id) => {
        set((s) => ({ users: s.users.map((u) => u.id === id ? { ...u, isActive: false, updatedAt: new Date().toISOString() } : u) }))
      },

      reactivateUser: (id) => {
        set((s) => ({ users: s.users.map((u) => u.id === id ? { ...u, isActive: true, updatedAt: new Date().toISOString() } : u) }))
      },

      changePassword: async (_userId, currentPassword, newPassword) => {
        try {
          await api.patch('/auth/password', { currentPassword, newPassword })
          return { success: true }
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : 'Password change failed' }
        }
      },

      resetPassword: async (userId, newPassword) => {
        try {
          await api.post('/auth/admin/reset-password', { userId, newPassword })
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Password reset failed')
        }
      },

      createInvitation: (email, role) => {
        const state = get()
        const now = new Date()
        const invitation: Invitation = {
          id: crypto.randomUUID(),
          email,
          role,
          invitedBy: state.currentUser?.id || '',
          organizationId: state.organizationId || '',
          status: 'pending',
          createdAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }
        set((s) => ({ invitations: [...s.invitations, invitation] }))
        return invitation
      },

      acceptInvitation: (invitationId, _name, _password) => {
        const invitation = get().invitations.find((i) => i.id === invitationId)
        const invErr = getTranslations().errors
        if (!invitation) return { success: false, error: invErr.invitationNotFound }
        if (invitation.status !== 'pending') return { success: false, error: invErr.invitationUsedOrExpired }
        if (new Date(invitation.expiresAt) < new Date()) return { success: false, error: invErr.invitationExpired }
        set((s) => ({
          invitations: s.invitations.map((i) => i.id === invitationId ? { ...i, status: 'accepted' as const } : i),
        }))
        return { success: true }
      },

      cancelInvitation: (id) => {
        set((s) => ({ invitations: s.invitations.filter((i) => i.id !== id) }))
      },

      updateProfile: (updates) => {
        const userId = get().currentUser?.id
        if (!userId) return
        get().updateUser(userId, updates)
      },

      getUserById: (id) => get().users.find((u) => u.id === id),

      isAuthenticated: () => {
        const { currentUser, session } = get()
        if (!currentUser) return false
        // Prefer localStorage JWT
        const token = getToken()
        if (token && !isTokenExpired(token)) return true
        // Fall back to in-memory session (set by tests / SSR)
        if (session && session.expiresAt > Date.now()) return true
        return false
      },
    }),
    {
      name: 'crm_auth',
      partialize: (state) => ({
        currentUser: state.currentUser,
        session: state.session,
        organization: state.organization,
        organizationId: state.organizationId,
        invitations: state.invitations,
      }),
    }
  )
)

function normalizeRole(raw: string | undefined): UserRole {
  const r = (raw ?? '').replace(/^"+|"+$/g, '').trim()
  if (r === 'owner') return 'admin'
  const valid: UserRole[] = ['admin', 'manager', 'sales_rep', 'viewer']
  return valid.includes(r as UserRole) ? (r as UserRole) : 'sales_rep'
}

/** Called from App.tsx — replaces initSupabaseAuth. Reads JWT from storage, restores session. */
export function initSupabaseAuth(): (() => void) | undefined {
  const token = getToken()

  if (!token || isTokenExpired(token)) {
    clearToken()
    useAuthStore.getState().setCurrentUser(null)
    useAuthStore.getState().setIsLoadingAuth(false)
    return
  }

  // Token valid — restore session from persisted state; fetch fresh user profile
  api.get<{ user: { id: string; email: string; name: string; role: string; organizationId: string | null } }>('/auth/me')
    .then((res) => {
      const u = res.user
      const now = new Date().toISOString()
      const authUser: AuthUser = {
        id: u.id,
        email: u.email,
        name: u.name,
        role: normalizeRole(u.role),
        jobTitle: '',
        organizationId: u.organizationId ?? undefined,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }
      useAuthStore.getState().setCurrentUser(authUser)
      if (u.organizationId) {
        void useAuthStore.getState().fetchOrgUsers(u.organizationId)
      }
    })
    .catch(() => {
      clearToken()
    })
    .finally(() => {
      useAuthStore.getState().setIsLoadingAuth(false)
    })
}
