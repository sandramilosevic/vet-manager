import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { SESSION_EXPIRED_EVENT } from '../api/client'
import { authApi, meApi } from '../api/resources'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '../api/tokens'
import { decodeAccessToken } from '../lib/jwt'
import type { AccessTokenClaims, LoginPayload, Me, Role } from '../api/types'
import { queryKeys } from './queries/keys'
import { capabilitiesFor, type Capabilities } from '../lib/permissions'

interface AuthContextValue {
  /**
   * Profile from `GET /accounts/me/` — the authoritative identity.
   * Null until the first fetch resolves; `role`/`email` fall back to the
   * token claims in the meantime so the shell doesn't flicker.
   */
  profile: Me | null
  /** Raw token claims. Decoded, never verified — see `lib/jwt.ts`. */
  claims: AccessTokenClaims | null
  role: Role | null
  email: string | null
  clinicName: string | null
  can: Capabilities
  isAuthenticated: boolean
  /** True until the initial token read finishes, so guards don't flash. */
  initializing: boolean
  login: (payload: LoginPayload) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [claims, setClaims] = useState<AccessTokenClaims | null>(() =>
    decodeAccessToken(getAccessToken()),
  )
  const [initializing, setInitializing] = useState(true)

  /** Wipes every trace of the session from this tab. */
  const resetSession = useCallback(() => {
    clearTokens()
    setClaims(null)
    // Cached query data belongs to the previous user — dropping it is both a
    // correctness fix (no stale clinic data) and a privacy one.
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    // The axios layer fires this when a refresh fails and the session is dead.
    const handleExpired = () => {
      setClaims(null)
      queryClient.clear()
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired)
  }, [queryClient])

  useEffect(() => {
    // On boot, an access token may already be expired (they last 15 minutes).
    // We do NOT eagerly refresh here: the first API call will 401 and the
    // interceptor refreshes once, which avoids burning a rotation on load.
    // If there is no refresh token at all, there is no session to restore.
    if (!getRefreshToken()) {
      setClaims(null)
    }
    setInitializing(false)
  }, [])

  useEffect(() => {
    // Keep tabs in sync: signing out in one tab signs out the others.
    const handleStorage = (event: StorageEvent) => {
      if (event.key && !event.key.startsWith('vetmanager.')) return
      const token = getAccessToken()
      setClaims(token ? decodeAccessToken(token) : null)
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const login = useCallback(
    async (payload: LoginPayload) => {
      const tokens = await authApi.login(payload)
      setTokens(tokens.access, tokens.refresh)
      setClaims(decodeAccessToken(tokens.access))
      // Start from a clean cache so nothing from a previous user leaks through.
      queryClient.clear()
    },
    [queryClient],
  )

  const logout = useCallback(async () => {
    const refresh = getRefreshToken()
    if (refresh) {
      try {
        // Best effort: blacklist server-side so the token can't be replayed.
        await authApi.logout(refresh)
      } catch {
        // Throttled (10/min), offline, or already blacklisted — either way the
        // local session must still be destroyed.
      }
    }
    resetSession()
  }, [resetSession])

  // The server decides what a user is. The token claims only cover the gap
  // between mounting and this resolving, and a stale role in an old access
  // token (e.g. after an admin demotes someone mid-session) is corrected here.
  const profileQuery = useQuery({
    queryKey: queryKeys.me,
    queryFn: () => meApi.retrieve(),
    enabled: claims !== null,
    staleTime: 5 * 60_000,
  })

  const value = useMemo<AuthContextValue>(() => {
    const profile = profileQuery.data ?? null
    const role = profile?.role ?? claims?.role ?? null
    return {
      profile,
      claims,
      role,
      email: profile?.email ?? claims?.email ?? null,
      clinicName: profile?.clinic_name ?? null,
      can: capabilitiesFor(role),
      isAuthenticated: claims !== null,
      initializing,
      login,
      logout,
    }
  }, [claims, profileQuery.data, initializing, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside an AuthProvider')
  return context
}
