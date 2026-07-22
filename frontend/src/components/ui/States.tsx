import type { ReactNode } from 'react'
import { Button } from './Button'
import { errorMessage } from '../../api/errors'

/* ------------------------------------------------------------------ */
/* Loading                                                             */
/* ------------------------------------------------------------------ */

export function Spinner({ large = false }: { large?: boolean }) {
  return <span className={`spinner ${large ? 'spinner--lg' : ''}`} aria-hidden="true" />
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="loading-row" role="status" aria-live="polite">
      <Spinner />
      <span>{label}</span>
    </div>
  )
}

/** Placeholder rows that match the table shape, avoiding a layout jump. */
export function TableSkeleton({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <tbody aria-hidden="true">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: columns }).map((__, colIndex) => (
            <td key={colIndex}>
              <span
                className="skeleton"
                style={{ width: `${45 + ((rowIndex * 7 + colIndex * 13) % 45)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}

/* ------------------------------------------------------------------ */
/* Empty                                                               */
/* ------------------------------------------------------------------ */

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon = '◌', title, description, action }: EmptyStateProps) {
  return (
    <div className="state">
      <span className="state__icon" aria-hidden="true">
        {icon}
      </span>
      <p className="state__title">{title}</p>
      {description && <p className="state__description">{description}</p>}
      {action}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Error                                                               */
/* ------------------------------------------------------------------ */

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
  title?: string
}

export function ErrorState({ error, onRetry, title = 'Could not load this' }: ErrorStateProps) {
  return (
    <div className="state state--error" role="alert">
      <span className="state__icon" aria-hidden="true">
        !
      </span>
      <p className="state__title">{title}</p>
      <p className="state__description">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Inline banner                                                       */
/* ------------------------------------------------------------------ */

const BANNER_ICONS = {
  info: 'i',
  success: '✓',
  warning: '!',
  error: '!',
} as const

interface BannerProps {
  tone?: keyof typeof BANNER_ICONS
  children: ReactNode
}

export function Banner({ tone = 'info', children }: BannerProps) {
  return (
    <div
      className={`banner banner--${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <span className="banner__icon" aria-hidden="true">
        {BANNER_ICONS[tone]}
      </span>
      <div>{children}</div>
    </div>
  )
}

/** Renders a normalized API error as an inline banner above a form. */
export function FormError({ error }: { error: unknown }) {
  if (!error) return null
  return <Banner tone="error">{errorMessage(error)}</Banner>
}
