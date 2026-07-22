import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, Card } from '../../components/ui/Layout'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { ConfirmDialog } from '../../components/ui/Modal'
import { EmptyState, ErrorState, TableSkeleton } from '../../components/ui/States'
import { OwnerFormModal } from '../../components/forms/OwnerFormModal'
import { useDeleteOwner, useOwners } from '../../hooks/queries/owners'
import { useDebounce } from '../../hooks/useDebounce'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { formatDate, orDash } from '../../lib/format'
import type { Owner, OwnerFilters } from '../../api/types'

type SortField = 'last_name' | 'first_name' | 'registration_date'

export function OwnersPage() {
  const { can } = useAuth()
  const { notifySuccess, notifyError } = useToast()
  const deleteOwner = useDeleteOwner()

  const [page, setPage] = useState(1)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [sort, setSort] = useState<SortField>('last_name')
  const [descending, setDescending] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Owner | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Owner | null>(null)

  // Debounced so typing doesn't fire a request per keystroke.
  const debouncedFirst = useDebounce(firstName)
  const debouncedLast = useDebounce(lastName)
  const debouncedEmail = useDebounce(email)

  const filters = useMemo<OwnerFilters>(
    () => ({
      page,
      first_name__icontains: debouncedFirst || undefined,
      last_name__icontains: debouncedLast || undefined,
      email__icontains: debouncedEmail || undefined,
      ordering: `${descending ? '-' : ''}${sort}`,
    }),
    [page, debouncedFirst, debouncedLast, debouncedEmail, sort, descending],
  )

  const owners = useOwners(filters)

  const resetToFirstPage = () => setPage(1)

  const toggleSort = (field: SortField) => {
    if (sort === field) {
      setDescending((current) => !current)
    } else {
      setSort(field)
      setDescending(false)
    }
    resetToFirstPage()
  }

  const sortIndicator = (field: SortField) =>
    sort === field ? (descending ? '↓' : '↑') : '↕'

  const handleDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteOwner.mutateAsync(pendingDelete.id)
      notifySuccess(`${pendingDelete.first_name} ${pendingDelete.last_name} removed`)
      setPendingDelete(null)
    } catch (error) {
      notifyError(error)
    }
  }

  const hasFilters = Boolean(firstName || lastName || email)
  const results = owners.data?.results ?? []

  return (
    <>
      <PageHeader
        title="Pet owners"
        description="Everyone registered at your practice. Owners are the entry point for adding pets and looking up history."
        actions={
          <Button variant="primary" onClick={() => { setEditing(null); setFormOpen(true) }}>
            + New owner
          </Button>
        }
      />

      <Card flush>
        <div className="filters">
          <div className="filters__field filters__field--grow">
            <label className="filters__label" htmlFor="filter-last-name">
              Last name
            </label>
            <input
              id="filter-last-name"
              className="input"
              value={lastName}
              placeholder="Search last name"
              onChange={(event) => {
                setLastName(event.target.value)
                resetToFirstPage()
              }}
            />
          </div>

          <div className="filters__field filters__field--grow">
            <label className="filters__label" htmlFor="filter-first-name">
              First name
            </label>
            <input
              id="filter-first-name"
              className="input"
              value={firstName}
              placeholder="Search first name"
              onChange={(event) => {
                setFirstName(event.target.value)
                resetToFirstPage()
              }}
            />
          </div>

          <div className="filters__field filters__field--grow">
            <label className="filters__label" htmlFor="filter-email">
              Email
            </label>
            <input
              id="filter-email"
              className="input"
              type="search"
              value={email}
              placeholder="Search email"
              onChange={(event) => {
                setEmail(event.target.value)
                resetToFirstPage()
              }}
            />
          </div>

          {hasFilters && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setFirstName('')
                setLastName('')
                setEmail('')
                resetToFirstPage()
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {owners.isError ? (
          <ErrorState error={owners.error} onRetry={() => owners.refetch()} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">Pet owners</caption>
              <thead>
                <tr>
                  <th scope="col">
                    <button
                      type="button"
                      className="table__sort"
                      onClick={() => toggleSort('last_name')}
                      aria-label="Sort by last name"
                    >
                      Name
                      <span className="table__sort-indicator" aria-hidden="true">
                        {sortIndicator('last_name')}
                      </span>
                    </button>
                  </th>
                  <th scope="col">Phone</th>
                  <th scope="col">Email</th>
                  <th scope="col">Address</th>
                  <th scope="col">
                    <button
                      type="button"
                      className="table__sort"
                      onClick={() => toggleSort('registration_date')}
                      aria-label="Sort by registration date"
                    >
                      Registered
                      <span className="table__sort-indicator" aria-hidden="true">
                        {sortIndicator('registration_date')}
                      </span>
                    </button>
                  </th>
                  <th scope="col" className="table__actions">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>

              {owners.isLoading ? (
                <TableSkeleton columns={6} />
              ) : (
                <tbody>
                  {results.map((owner) => (
                    <tr key={owner.id}>
                      <td className="table__primary">
                        <Link to={`/owners/${owner.id}`}>
                          {owner.last_name}, {owner.first_name}
                        </Link>
                      </td>
                      <td className="nowrap">{orDash(owner.phone_number)}</td>
                      <td>{orDash(owner.email)}</td>
                      <td>{orDash(owner.address)}</td>
                      <td className="nowrap">{formatDate(owner.registration_date)}</td>
                      <td className="table__actions">
                        <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditing(owner)
                              setFormOpen(true)
                            }}
                          >
                            Edit
                          </Button>
                          {can.deleteOwner && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setPendingDelete(owner)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>

            {!owners.isLoading && results.length === 0 && (
              <EmptyState
                icon="☺"
                title={hasFilters ? 'No owners match those filters' : 'No owners yet'}
                description={
                  hasFilters
                    ? 'Try a shorter search term, or clear the filters to see everyone.'
                    : 'Add the first pet owner to get started. You can register their pets straight afterwards.'
                }
                action={
                  hasFilters ? undefined : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setEditing(null)
                        setFormOpen(true)
                      }}
                    >
                      Add an owner
                    </Button>
                  )
                }
              />
            )}
          </div>
        )}

        {owners.data && (
          <div className="card__footer">
            <Pagination
              page={page}
              count={owners.data.count}
              hasNext={Boolean(owners.data.next)}
              hasPrevious={Boolean(owners.data.previous)}
              onPageChange={setPage}
              busy={owners.isFetching}
            />
          </div>
        )}
      </Card>

      <OwnerFormModal
        open={formOpen}
        owner={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this owner?"
        description={
          <>
            <strong>
              {pendingDelete?.first_name} {pendingDelete?.last_name}
            </strong>{' '}
            will be removed from your practice. Their pets and medical history stay in the
            database, but the owner will no longer appear in lists or pickers.
          </>
        }
        confirmLabel="Delete owner"
        destructive
        loading={deleteOwner.isPending}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}
