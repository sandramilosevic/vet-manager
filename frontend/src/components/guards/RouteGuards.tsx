import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import type { Role } from '../../api/types'
import { EmptyState, LoadingState } from '../ui/States'
import { Button } from '../ui/Button'

/**
 * Blocks unauthenticated access and remembers where the user was headed so
 * login can send them back there.
 *
 * This is a UX guard, not a security boundary — the data itself is protected
 * by the backend, which rejects any request without a valid token.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, initializing } = useAuth()
  const location = useLocation()

  if (initializing) {
    return (
      <div className="auth">
        <LoadingState label="Restoring your session…" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}

/**
 * Hides pages a role cannot use. Again: cosmetic. The backend's IsAdmin /
 * IsVetOrAdmin permission classes are what actually stop the request.
 */
export function RequireRole({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { role } = useAuth()

  if (role && allow.includes(role)) return <>{children}</>

  return (
    <div className="card">
      <EmptyState
        icon="⊘"
        title="You don't have access to this page"
        description={`This area is limited to ${allow.join(', ')}. If you think that's wrong, ask an administrator at your practice to update your role.`}
        action={
          <Button variant="secondary" size="sm" onClick={() => window.history.back()}>
            Go back
          </Button>
        }
      />
    </div>
  )
}

/** Sends already-signed-in users away from login/reset screens. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { isAuthenticated, initializing } = useAuth()
  if (initializing) return null
  if (isAuthenticated) return <Navigate to="/" replace />
  return <>{children}</>
}
