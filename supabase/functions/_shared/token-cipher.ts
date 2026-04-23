/**
 * AES-256-GCM using Web Crypto (Deno). Key: TOKEN_ENCRYPTION_KEY = 64 hex chars (32 bytes).
 * Ciphertext format: base64(iv) : base64(ciphertext+authTag)
 */
const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

let cachedKey: CryptoKey | null = null

function u8ToB64(u8: Uint8Array): string {
  let s = ''
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]!)
  return btoa(s)
}

function b64ToU8(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function requireTokenEncryptionKey(): void {
  const hex = Deno.env.get('TOKEN_ENCRYPTION_KEY') ?? ''
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). Use: openssl rand -hex 32')
  }
}

async function getAesKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey
  requireTokenEncryptionKey()
  const hex = Deno.env.get('TOKEN_ENCRYPTION_KEY')!
  const raw = new Uint8Array(32)
  for (let i = 0; i < 32; i++) {
    raw[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  cachedKey = await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
  return cachedKey
}

export async function encryptToken(plaintext: string): Promise<string> {
  const key = await getAesKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      key,
      textEncoder.encode(plaintext),
    ),
  )
  return `${u8ToB64(iv)}:${u8ToB64(ct)}`
}

export async function decryptToken(ciphertext: string): Promise<string> {
  const key = await getAesKey()
  const [ivB64, dataB64] = ciphertext.split(':')
  if (!ivB64 || !dataB64) throw new Error('Malformed ciphertext')
  const iv = b64ToU8(ivB64)
  const data = b64ToU8(dataB64)
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    data,
  )
  return textDecoder.decode(plain)
}
