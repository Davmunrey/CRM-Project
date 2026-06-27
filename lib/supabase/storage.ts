'use client'

import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

/** Buckets created in migration 20260627000007_storage_buckets.sql. */
export type StorageBucket = 'avatars' | 'org-logos'

const MAX_BYTES = 5 * 1024 * 1024 // keep in sync with the bucket file_size_limit
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']

function extFor(file: File): string {
  const fromName = file.name.includes('.') ? file.name.split('.').pop()! : ''
  if (fromName) return fromName.toLowerCase()
  return (file.type.split('/')[1] || 'png').toLowerCase()
}

/**
 * Upload an image to a public bucket under `<scopeId>/<random>.<ext>` and
 * return its public URL. RLS enforces that `scopeId` matches the caller's
 * user id (avatars) or org id (org-logos), so an invalid scope is rejected
 * server-side, not just here.
 */
export async function uploadImage(
  bucket: StorageBucket,
  scopeId: string,
  file: File,
): Promise<string> {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured')
  if (!ALLOWED.includes(file.type)) {
    throw new Error('Unsupported image type. Use PNG, JPEG, WebP, GIF or SVG.')
  }
  if (file.size > MAX_BYTES) throw new Error('Image is too large (max 5 MB).')

  const supabase = createClient()
  const path = `${scopeId}/${crypto.randomUUID()}.${extFor(file)}`
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type })
  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

/** Upload the signed-in user's avatar; returns the public URL. */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  return uploadImage('avatars', userId, file)
}

/** Upload the organization logo (org admins only, enforced by RLS). */
export async function uploadOrgLogo(orgId: string, file: File): Promise<string> {
  return uploadImage('org-logos', orgId, file)
}
