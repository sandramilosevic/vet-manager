import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ROLE_LABELS } from '../../api/types'
import { initials } from '../../lib/format'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/Modal'

interface NavItem {
  to: string
  label: string
  icon: string
  /** When false the item is hidden — mirrors the backend's permissions. */
  visible: boolean
  end?: boolean
}

export function AppShell() {
  // Practice name comes from /accounts/me/, so the shell needs no extra query.
  const { email, role, can, clinicName, profile, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  // Close the mobile drawer whenever navigation happens.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const clinical: NavItem[] = [
    { to: '/', label: 'Dashboard', icon: '▤', visible: true, end: true },
    { to: '/owners', label: 'Owners', icon: '☺', visible: true },
    { to: '/pets', label: 'Pets', icon: '❋', visible: true },
    { to: '/vaccinations', label: 'Vaccinations', icon: '⊕', visible: true },
    { to: '/medical-records', label: 'Medical records', icon: '☰', visible: true },
  ]

  const administration: NavItem[] = [
    { to: '/clinics', label: 'Clinic locations', icon: '⌂', visible: true },
    { to: '/staff', label: 'Staff & invites', icon: '⚇', visible: can.viewStaff },
    { to: '/settings', label: 'Practice settings', icon: '⚙', visible: true },
  ]

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setLoggingOut(false)
      setConfirmLogout(false)
    }
  }

  const renderGroup = (label: string, items: NavItem[]) => {
    const visible = items.filter((item) => item.visible)
    if (visible.length === 0) return null

    return (
      <div className="sidebar__group">
        <p className="sidebar__group-label">{label}</p>
        <ul>
          {visible.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'nav-link--active' : ''}`
                }
              >
                <span className="nav-link__icon" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      {menuOpen && (
        <button
          type="button"
          className="sidebar__scrim"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          <span className="sidebar__brand-mark" aria-hidden="true">
            ✚
          </span>
          <span className="sidebar__brand-name">Vet Manager</span>
        </div>

        <nav className="sidebar__nav" aria-label="Main navigation">
          {renderGroup('Clinical', clinical)}
          {renderGroup('Administration', administration)}
        </nav>

        <div className="sidebar__footer">
          <Button variant="ghost" size="sm" block onClick={() => setConfirmLogout(true)}>
            Sign out
          </Button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar__context">
            <button
              type="button"
              className="topbar__toggle"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label="Toggle navigation"
            >
              ☰
            </button>
            <span className="topbar__clinic">
              {!profile ? (
                <span className="skeleton" style={{ width: 140 }} />
              ) : clinicName ? (
                clinicName
              ) : (
                <span className="muted">No practice assigned</span>
              )}
            </span>
          </div>

          <div className="topbar__actions">
            <div className="user-chip">
              <span className="user-chip__avatar" aria-hidden="true">
                {initials(email ?? '?')}
              </span>
              <span className="user-chip__meta">
                <span className="user-chip__email" title={email ?? undefined}>
                  {email ?? 'Signed in'}
                </span>
                <span className="user-chip__role">
                  {role ? ROLE_LABELS[role] : 'Unknown role'}
                </span>
              </span>
            </div>
          </div>
        </header>

        <main className="content" id="main-content">
          <Outlet />
        </main>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title="Sign out?"
        description="Your session token will be revoked on the server. You'll need to sign in again to continue."
        confirmLabel="Sign out"
        loading={loggingOut}
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  )
}
