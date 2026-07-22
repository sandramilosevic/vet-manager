import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/* ------------------------------------------------------------------ */
/* Page header                                                         */
/* ------------------------------------------------------------------ */

export interface Crumb {
  label: string
  to?: string
}

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  breadcrumbs?: Crumb[]
}

export function PageHeader({ title, description, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="breadcrumb" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`}>
                {index > 0 && (
                  <span className="breadcrumb__sep" aria-hidden="true">
                    {' / '}
                  </span>
                )}
                {crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : <span>{crumb.label}</span>}
              </span>
            ))}
          </nav>
        )}
        <h1 className="page-header__title">{title}</h1>
        {description && <p className="page-header__description">{description}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  )
}

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

interface CardProps {
  title?: string
  subtitle?: string
  actions?: ReactNode
  footer?: ReactNode
  /** Removes body padding — use for tables that should reach the edges. */
  flush?: boolean
  children: ReactNode
}

export function Card({ title, subtitle, actions, footer, flush, children }: CardProps) {
  return (
    <section className="card">
      {(title || actions) && (
        <div className="card__header">
          <div>
            {title && <h2 className="card__title">{title}</h2>}
            {subtitle && <p className="card__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="btn-row">{actions}</div>}
        </div>
      )}
      <div className={`card__body ${flush ? 'card__body--flush' : ''}`}>{children}</div>
      {footer && <div className="card__footer">{footer}</div>}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Badge                                                               */
/* ------------------------------------------------------------------ */

type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`badge ${tone === 'neutral' ? '' : `badge--${tone}`}`}>{children}</span>
}

/* ------------------------------------------------------------------ */
/* Stat tile                                                           */
/* ------------------------------------------------------------------ */

interface StatProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  to?: string
}

export function Stat({ label, value, hint, to }: StatProps) {
  const body = (
    <div className="card stat">
      <p className="stat__label">{label}</p>
      <p className="stat__value">{value}</p>
      {hint && <p className="stat__hint">{hint}</p>}
    </div>
  )

  if (!to) return body
  return (
    <Link to={to} style={{ color: 'inherit', textDecoration: 'none' }}>
      {body}
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/* Definition list                                                     */
/* ------------------------------------------------------------------ */

export interface DetailItem {
  label: string
  value: ReactNode
  /** Preserve line breaks — for free-text clinical notes. */
  multiline?: boolean
}

export function DetailList({ items }: { items: DetailItem[] }) {
  return (
    <dl className="detail-list">
      {items.map((item) => (
        <div key={item.label} style={{ display: 'contents' }}>
          <dt>{item.label}</dt>
          <dd className={item.multiline ? 'detail-list__multiline' : undefined}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
