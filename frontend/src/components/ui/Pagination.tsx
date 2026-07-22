import { PAGE_SIZE } from '../../api/types'
import { Button } from './Button'

interface PaginationProps {
  page: number
  count: number
  hasNext: boolean
  hasPrevious: boolean
  onPageChange: (page: number) => void
  /** Disables controls while a page is in flight. */
  busy?: boolean
}

export function Pagination({
  page,
  count,
  hasNext,
  hasPrevious,
  onPageChange,
  busy = false,
}: PaginationProps) {
  if (count === 0) return null

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))
  const first = (page - 1) * PAGE_SIZE + 1
  const last = Math.min(page * PAGE_SIZE, count)

  return (
    <nav className="pagination" aria-label="Pagination">
      <p className="pagination__status" aria-live="polite">
        Showing <strong>{first}</strong>–<strong>{last}</strong> of{' '}
        <strong>{count}</strong>
      </p>
      <div className="pagination__controls">
        <span className="pagination__status nowrap">
          Page {page} of {totalPages}
        </span>
        <Button
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevious || busy}
        >
          ← Previous
        </Button>
        <Button size="sm" onClick={() => onPageChange(page + 1)} disabled={!hasNext || busy}>
          Next →
        </Button>
      </div>
    </nav>
  )
}
