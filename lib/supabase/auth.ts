'use client'

import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { AuthUser, Organization, Session, UserRole } from '@/types/auth'

type ProfileRow = {
  id: string
  email: string
  name: string
  role: string
  job_title: string | null
  avatar_url: string | null
  is_active: boolean
  organization_id: string | null
  created_at: string
  updated_at: string
}

export function supabaseAuthEnabled(): boolean {
  return isSupabaseConfigured()
}

function normalizeRole(raw: string | undefined): UserRole {
  const r = (raw ?? '').replace(/^"+|"+$/g, '').trim()
  if (r === 'owner') return 'admin'
  const valid: UserRole[] = ['admin', 'manager', 'sales_rep', 'viewer']
  return valid.includes(r as UserRole) ? (r as UserRole) : 'sales_rep'
}

export function profileToAuthUser(profile: ProfileRow): AuthUser {
  const now = new Date().toISOString()
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: normalizeRole(profile.role),
    jobTitle: profile.job_title ?? '',
    avatar: profile.avatar_url ?? undefined,
    organizationId: profile.organization_id ?? undefined,
    isActive: profile.is_active,
    createdAt: profile.created_at ?? now,
    updatedAt: profile.updated_at ?? now,
  }
}

export function sessionFromSupabase(userId: string, expiresAt?: number): Session {
  const now = new Date().toISOString()
  return {
    userId,
    expiresAt: expiresAt ?? Date.now() + 3600 * 1000,
    createdAt: now,
  }
}

export async function fetchProfile(userId: string): Promise<AuthUser | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error || !data) return null
  return profileToAuthUser(data as ProfileRow)
}

export async function supabaseLogin(
  email: string,
  password: string,
): Promise<{ success: boolean; error?: string; user?: AuthUser; session?: Session }> {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { success: false, error: error.message }
  if (!data.user) return { success: false, error: 'Login failed' }

  const profile = await fetchProfile(data.user.id)
  const user =
    profile ??
    profileToAuthUser({
      id: data.user.id,
      email: data.user.email ?? email,
      name: data.user.user_metadata?.name ?? email.split('@')[0],
      role: data.user.user_metadata?.role ?? 'sales_rep',
      job_title: null,
      avatar_url: null,
      is_active: true,
      organization_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

  const session = sessionFromSupabase(
    data.user.id,
    data.session?.expires_at ? data.session.expires_at * 1000 : undefined,
  )
  return { success: true, user, session }
}

export async function supabaseRegister(data: {
  name: string
  email: string
  password: string
}): Promise<{ success: boolean; error?: string; user?: AuthUser; session?: Session }> {
  const supabase = createClient()
  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: { data: { name: data.name, role: 'admin' } },
  })
  if (error) return { success: false, error: error.message }
  if (!authData.user) return { success: false, error: 'Registration failed' }

  const user = profileToAuthUser({
    id: authData.user.id,
    email: authData.user.email ?? data.email,
    name: data.name,
    role: 'admin',
    job_title: null,
    avatar_url: null,
    is_active: true,
    organization_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  const session = authData.session
    ? sessionFromSupabase(
        authData.user.id,
        authData.session.expires_at ? authData.session.expires_at * 1000 : undefined,
      )
    : undefined
  return { success: true, user, session }
}

export async function supabaseLogout(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
}

export async function supabaseRestoreSession(): Promise<{
  user: AuthUser | null
  session: Session | null
}> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return { user: null, session: null }

  const profile = await fetchProfile(session.user.id)
  const user =
    profile ??
    profileToAuthUser({
      id: session.user.id,
      email: session.user.email ?? '',
      name: session.user.user_metadata?.name ?? '',
      role: session.user.user_metadata?.role ?? 'sales_rep',
      job_title: null,
      avatar_url: null,
      is_active: true,
      organization_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

  return {
    user,
    session: sessionFromSupabase(
      session.user.id,
      session.expires_at ? session.expires_at * 1000 : undefined,
    ),
  }
}

export async function supabaseFetchOrgUsers(organizationId: string): Promise<AuthUser[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return (data as ProfileRow[]).map(profileToAuthUser)
}

export async function supabaseCreateOrg(name: string, slug: string): Promise<Organization> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: org, error } = await supabase
    .from('organizations')
    .insert({ name, slug })
    .select('*')
    .single()
  if (error || !org) throw new Error(error?.message ?? 'Failed to create organization')

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ organization_id: org.id, role: 'owner' })
    .eq('id', user.id)
  if (profileError) throw new Error(profileError.message)

  return {
    id: org.id,
    name: org.name,
    plan: (org.plan as Organization['plan']) ?? 'free',
    maxUsers: 50,
    createdAt: org.created_at,
  }
}
