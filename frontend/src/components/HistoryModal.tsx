import type { UseQueryResult } from '@tanstack/react-query'
import { Modal } from './ui/Modal'
import { Badge } from './ui/Layout'
import { EmptyState, ErrorState, LoadingState } from './ui/States'
import { formatDateTime, orDash } from '../lib/format'
import type { HistoryType, Paginated } from '../api/types'

interface HistoryFieldSpec<T> {
  label: string
  /** Pulled off the snapshot; returns text, never HTML. */
  value: (row: T) => string
}

interface HistoryModalProps<T> {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  query: UseQueryResult<Paginated<T & { history_id: number }>>
  fields: HistoryFieldSpec<T>[]
}

const TONE_BY_TYPE: Record<HistoryType, 'success' | 'accent' | 'danger'> = {
  '+': 'success',
  '~': 'accent',
  '-': 'danger',
}

/**
 * Renders a django-simple-history audit trail: one row per revision, newest
 * first, with the fields that matter for that resource and who changed them.
 *
 * Diffing between revisions is deliberately not attempted — the API returns
 * full snapshots, and a naive field-by-field diff would misrepresent records
 * created before a field existed.
 */
export function HistoryModal<
  T extends {
    history_id: number
    history_date: string
    history_type: HistoryType
    history_type_label: string
    history_user: string | null
  },
>({ open, onClose, title, description, query, fields }: HistoryModalProps<T>) {
  const rows = query.data?.results ?? []

  return (
    <Modal open={open} onClose={onClose} wide title={title} description={description}>
      {query.isLoading ? (
        <LoadingState label="Loading change history…" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="⟲"
          title="No history recorded"
          description="Changes are tracked from the moment this record was created."
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Change</th>
                <th scope="col">By</th>
                {fields.map((field) => (
                  <th scope="col" key={field.label}>
                    {field.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.history_id}>
                  <td className="nowrap">{formatDateTime(row.history_date)}</td>
                  <td>
                    <Badge tone={TONE_BY_TYPE[row.history_type] ?? 'neutral'}>
                      {row.history_type_label}
                    </Badge>
                  </td>
                  {/* Unauthenticated changes (shell, data migration) have no user. */}
                  <td>{orDash(row.history_user)}</td>
                  {fields.map((field) => (
                    <td key={field.label}>{field.value(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}
