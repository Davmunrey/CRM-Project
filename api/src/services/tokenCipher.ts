import crypto from 'node:crypto'
import { env } from '../config/env.js'

const ALGO = 'aes-256-gcm'
const IV_BYTES = 12
const TAG_BYTES = 16

function getKey(): Buffer | null {
  const k = env.TOKEN_ENCRYPTION_KEY
  if (!k) return null
  const buf = Buffer.from(k, 'hex')
  if (buf.length !== 32) return null
  return buf
}

export function encryptToken(plaintext: string): string | null {
  const key = getKey()
  if (!key) return null
  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decryptToken(cipher: string): string {
  const key = getKey()
  if (!key) throw new Error('TOKEN_ENCRYPTION_KEY not set')
  const buf = Buffer.from(cipher, 'base64')
  const iv = buf.subarray(0, IV_BYTES)
  const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES)
  const encrypted = buf.subarray(IV_BYTES + TAG_BYTES)
  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted) + decipher.final('utf8')
}
