import { PAGE_SIZE } from '../../api/types'
import { Button } from './Button'

interface PaginationProps {
  page: number
  count: number
  hasNext: boolean
  hasPrevious: boolean
  onPageChange: (page: number) => void
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
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  if (totalPages <= 1) return null

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
          data-cy="pagination-previous"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevious || busy}
        >
          ← Previous
        </Button>
        <Button
          size="sm"
          data-cy="pagination-next"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext || busy}
        >
          Next →
        </Button>
      </div>
    </nav>
  )
}