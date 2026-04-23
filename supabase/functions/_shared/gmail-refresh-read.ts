import { decryptToken } from './token-cipher.ts'

type Row = { refresh_token: string | null; refresh_token_cipher: string | null }

export async function getPlainRefreshToken(row: Row): Promise<string> {
  if (row.refresh_token_cipher) {
    return await decryptToken(row.refresh_token_cipher)
  }
  if (row.refresh_token) {
    return row.refresh_token
  }
  throw new Error('No refresh token available')
}
