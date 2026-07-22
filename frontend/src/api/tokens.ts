/**
 * JWT storage.
 *
 * ── SECURITY TRADEOFF (read before changing) ─────────────────────────────
 * The ideal place for these tokens is an httpOnly, SameSite=Strict cookie set
 * by the server: JavaScript cannot read it, so an XSS bug cannot exfiltrate
 * the session. The Vet Manager backend does NOT support that — SimpleJWT is
 * configured for header-based bearer auth (`DEFAULT_AUTHENTICATION_CLASSES =
 * JWTAuthentication`) and returns the token pair in the JSON body of
 * `/api/v1/auth/login/`. There is no cookie-issuing endpoint and no CSRF
 * pairing for one.
 *
 * So we store tokens in `localStorage`. The risk this accepts: any successful
 * XSS on this origin can read `localStorage` and steal both tokens, giving the
 * attacker the session until the refresh token expires (7 days). We mitigate,
 * but do not eliminate, that risk by:
 *   - never rendering untrusted HTML (no `dangerouslySetInnerHTML` anywhere —
 *     React escapes all interpolated text by default);
 *   - never logging tokens, and stripping `console.*` from production builds;
 *   - a short 15-minute access-token lifetime;
 *   - blacklisting the refresh token server-side on logout.
 *
 * `sessionStorage` would narrow the window to a single tab session but breaks
 * "stay logged in across tabs/reloads", which is the wrong tradeoff for
 * practice-management software people keep open all day.
 *
 * If the backend ever grows cookie auth, delete this module, drop the
 * Authorization interceptor in `client.ts`, and set `withCredentials: true`.
 * ─────────────────────────────────────────────────────────────────────────
 */

const ACCESS_KEY = 'vetmanager.access'
const REFRESH_KEY = 'vetmanager.refresh'

/** Fired on this tab when tokens are cleared, so the auth context can react. */
export const TOKENS_CLEARED_EVENT = 'vetmanager:tokens-cleared'

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    // localStorage can throw in private-browsing / disabled-storage modes.
    return null
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* storage unavailable — the session simply won't survive a reload */
  }
}

function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* nothing we can do */
  }
}

/**
 * Always read straight from storage rather than caching in a module variable.
 * With rotating refresh tokens, a second tab may have rotated the pair since
 * this tab last looked; reading fresh keeps tabs roughly in sync.
 */
export function getAccessToken(): string | null {
  return safeGet(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return safeGet(REFRESH_KEY)
}

export function setTokens(access: string, refresh: string): void {
  safeSet(ACCESS_KEY, access)
  safeSet(REFRESH_KEY, refresh)
}

export function setAccessToken(access: string): void {
  safeSet(ACCESS_KEY, access)
}

export function clearTokens(): void {
  safeRemove(ACCESS_KEY)
  safeRemove(REFRESH_KEY)
  window.dispatchEvent(new Event(TOKENS_CLEARED_EVENT))
}

export function hasSession(): boolean {
  return Boolean(getRefreshToken())
}
