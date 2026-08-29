/**
 * Minimal JWT payload reader.
 *
 * The backend exposes no `/me` endpoint, but `MyTokenObtainPairSerializer`
 * embeds `role`, `clinic_id` and `email` as custom claims, so the access token
 * is the only source of identity available to the client.
 *
 * IMPORTANT: this only DECODES — it does not verify the signature, and it
 * cannot. Anything read here is used purely for UX (which menu items to show,
 * whose email to display). Every real authorisation decision is made by the
 * backend, which does verify the signature. A user who edits their own token
 * would see extra buttons and get 403s when clicking them.
 */

import type { AccessTokenClaims } from '../api/types'

function base64UrlDecode(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '='))
  // Handle non-ASCII characters (e.g. accented names in an email display name).
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function decodeAccessToken(token: string | null): AccessTokenClaims | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null

  try {
    const payload = JSON.parse(base64UrlDecode(parts[1])) as Partial<AccessTokenClaims>
    if (typeof payload.user_id !== 'string' || typeof payload.role !== 'string') {
      return null
    }
    return {
      ...payload,
      user_id: Number(payload.user_id),
    } as AccessTokenClaims
  } catch {
    // Malformed token — treat as "no identity" and let the API 401 handle it.
    return null
  }
}