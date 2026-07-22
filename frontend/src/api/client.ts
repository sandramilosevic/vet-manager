/**
 * The single axios instance every request in the app goes through.
 *
 * Responsibilities:
 *   - attach the bearer access token (no cookies — see `tokens.ts`);
 *   - transparently refresh a 15-minute access token when it expires, using
 *     the backend's ROTATING refresh tokens (the old refresh is blacklisted on
 *     every use, so exactly one refresh may be in flight at a time);
 *   - hard-logout when a refresh fails, so a dead session can never linger.
 *
 * Nothing in this file logs a token, a password, or a request body.
 */

import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'
import { API_BASE_URL, API_PREFIX } from '../lib/env'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './tokens'

/** Dispatched when the session is unrecoverable; the auth context redirects. */
export const SESSION_EXPIRED_EVENT = 'vetmanager:session-expired'

export const api = axios.create({
  baseURL: `${API_BASE_URL}${API_PREFIX}`,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
  // No cookies are used, so credentials must stay off: sending them would
  // require the backend to echo a specific origin and would break the simple
  // CORS setup for no benefit.
  withCredentials: false,
})

/**
 * A bare client for the refresh call itself. Using `api` here would recurse
 * through the same interceptors when the refresh endpoint returns 401.
 */
const refreshClient = axios.create({
  baseURL: `${API_BASE_URL}${API_PREFIX}`,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
})

/** Endpoints that must never carry an Authorization header or trigger refresh. */
const PUBLIC_PATHS = [
  '/auth/login/',
  '/auth/token/refresh/',
  '/accounts/invitations/accept/',
  '/accounts/password-reset/',
  '/accounts/password-reset/confirm/',
]

function isPublicPath(url: string | undefined): boolean {
  if (!url) return false
  return PUBLIC_PATHS.some((path) => url.includes(path))
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (!isPublicPath(config.url)) {
    const token = getAccessToken()
    if (token) config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

/* ------------------------------------------------------------------ */
/* Token refresh — single-flight                                       */
/* ------------------------------------------------------------------ */

/**
 * Rotation means a refresh token is single-use: the moment one request uses
 * it, the backend blacklists it. If five queries 401 at once and each fires
 * its own refresh, four of them get "token is blacklisted" and the session
 * dies. So all concurrent callers await the same promise.
 */
let refreshInFlight: Promise<string> | null = null

function hardLogout(): void {
  clearTokens()
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
}

async function refreshAccessToken(): Promise<string> {
  const refresh = getRefreshToken()
  if (!refresh) throw new Error('No refresh token available')

  const { data } = await refreshClient.post<{ access: string; refresh: string }>(
    '/auth/token/refresh/',
    { refresh },
  )

  // With ROTATE_REFRESH_TOKENS the response carries a NEW refresh token; the
  // one we just sent is now blacklisted. Persist both immediately.
  setTokens(data.access, data.refresh ?? refresh)
  return data.access
}

function requestRefresh(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

interface RetryableConfig extends AxiosRequestConfig {
  _retried?: boolean
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (RetryableConfig & InternalAxiosRequestConfig) | undefined
    const status = error.response?.status

    const shouldTryRefresh =
      status === 401 &&
      config != null &&
      !config._retried &&
      !isPublicPath(config.url) &&
      Boolean(getRefreshToken())

    if (!shouldTryRefresh) {
      // A 401 we cannot recover from means the session is over. Public
      // endpoints (bad login, bad reset link) are excluded — those are just
      // failed attempts, not expired sessions.
      if (status === 401 && config && !isPublicPath(config.url)) hardLogout()
      return Promise.reject(error)
    }

    config._retried = true

    try {
      const access = await requestRefresh()
      config.headers.set('Authorization', `Bearer ${access}`)
      return await api.request(config)
    } catch (refreshError) {
      // Refresh failed: token expired, was rotated away, or is blacklisted.
      // There is no path back — clear everything and send the user to login.
      hardLogout()
      return Promise.reject(refreshError)
    }
  },
)

/**
 * Builds a query string, dropping empty/undefined values so we never send
 * `?name__icontains=` and confuse django-filter.
 */
export function buildParams(filters: object = {}): Record<string, string> {
  const params: Record<string, string> = {}
  for (const [key, value] of Object.entries(filters as Record<string, unknown>)) {
    if (value === undefined || value === null || value === '') continue
    params[key] = String(value)
  }
  return params
}
