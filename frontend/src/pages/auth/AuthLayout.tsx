import type { ReactNode } from 'react'

interface AuthLayoutProps {
  title: string
  subtitle?: string
  footer?: ReactNode
  children: ReactNode
}

export function AuthLayout({ title, subtitle, footer, children }: AuthLayoutProps) {
  return (
    <div className="auth">
      <div className="auth__panel">
        <div className="auth__brand">
          <p className="auth__brand-name">
            <span aria-hidden="true" style={{ color: 'var(--accent)' }}>
              ✚
            </span>{' '}
            Vet Manager
          </p>
          <p className="auth__brand-tagline">Veterinary practice management</p>
        </div>

        <div className="card">
          <div className="card__body">
            <h1 className="auth__title">{title}</h1>
            {subtitle && <p className="auth__subtitle">{subtitle}</p>}
            {children}
          </div>
        </div>

        {footer && <div className="auth__footer">{footer}</div>}
      </div>
    </div>
  )
}
