import { useMemo, useState } from 'react'
import { Card, PageHeader } from '../../components/ui/Layout'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { ConfirmDialog } from '../../components/ui/Modal'
import {
  Banner,
  EmptyState,
  ErrorState,
  TableSkeleton,
} from '../../components/ui/States'
import { ClinicFormModal } from '../../components/forms/ClinicFormModal'
import { useClinics, useDeleteClinic } from '../../hooks/queries/clinics'
import { useDebounce } from '../../hooks/useDebounce'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import type { Clinic, ClinicFilters } from '../../api/types'

export function ClinicsPage() {
  const { can } = useAuth()
  const { notifySuccess, notifyError } = useToast()
  const deleteClinic = useDeleteClinic()

  const [page, setPage] = useState(1)
  const [name, setName] = useState('')
  const [city, setCity] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Clinic | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Clinic | null>(null)

  const debouncedName = useDebounce(name)
  const debouncedCity = useDebounce(city)

  const filters = useMemo<ClinicFilters>(
    () => ({
      page,
      name__icontains: debouncedName || undefined,
      city__icontains: debouncedCity || undefined,
    }),
    [page, debouncedName, debouncedCity],
  )

  const clinics = useClinics(filters)
  const hasFilters = Boolean(name || city)
  const results = clinics.data?.results ?? []

  const handleDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteClinic.mutateAsync(pendingDelete.id)
      notifySuccess('Location removed')
      setPendingDelete(null)
    } catch (error) {
      notifyError(error)
    }
  }

  return (
    <>
      <PageHeader
        title="Clinic locations"
        description="The physical sites that make up your practice. Everyone in the practice can see them; only admins can change them."
        actions={
          can.createClinicLocation ? (
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              + New location
            </Button>
          ) : undefined
        }
      />

      {!can.createClinicLocation && (
        <div className="mb-4">
          <Banner tone="info">
            Locations are read-only for your role. Ask an administrator to add or edit
            them.
          </Banner>
        </div>
      )}

      <Card flush>
        <div className="filters">
          <div className="filters__field filters__field--grow">
            <label className="filters__label" htmlFor="clinic-name">
              Name
            </label>
            <input
              id="clinic-name"
              className="input"
              type="search"
              value={name}
              placeholder="Search location name"
              onChange={(event) => {
                setName(event.target.value)
                setPage(1)
              }}
            />
          </div>

          <div className="filters__field filters__field--grow">
            <label className="filters__label" htmlFor="clinic-city">
              City
            </label>
            <input
              id="clinic-city"
              className="input"
              type="search"
              value={city}
              placeholder="Search city"
              onChange={(event) => {
                setCity(event.target.value)
                setPage(1)
              }}
            />
          </div>

          {hasFilters && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setName('')
                setCity('')
                setPage(1)
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {clinics.isError ? (
          <ErrorState error={clinics.error} onRetry={() => clinics.refetch()} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">Clinic locations</caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">City</th>
                  <th scope="col">Address</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Email</th>
                  <th scope="col" className="table__actions">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>

              {clinics.isLoading ? (
                <TableSkeleton columns={6} />
              ) : (
                <tbody>
                  {results.map((clinic) => (
                    <tr key={clinic.id}>
                      <td className="table__primary">{clinic.name}</td>
                      <td>{clinic.city}</td>
                      <td>{clinic.address}</td>
                      <td className="nowrap">{clinic.phone_number}</td>
                      <td>{clinic.email}</td>
                      <td className="table__actions">
                        <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
                          {can.editClinicLocation && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditing(clinic)
                                setFormOpen(true)
                              }}
                            >
                              Edit
                            </Button>
                          )}
                          {can.deleteClinicLocation && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setPendingDelete(clinic)}
                            >
                              Delete
                            </Button>
                          )}
                          {!can.editClinicLocation && (
                            <span className="muted text-sm">Read-only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>

            {!clinics.isLoading && results.length === 0 && (
              <EmptyState
                icon="⌂"
                title={hasFilters ? 'No locations match those filters' : 'No locations yet'}
                description={
                  hasFilters
                    ? 'Try a different name or city.'
                    : can.createClinicLocation
                      ? 'Add the first site so staff know where the practice operates.'
                      : 'An administrator has not added any locations yet.'
                }
                action={
                  !hasFilters && can.createClinicLocation ? (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setEditing(null)
                        setFormOpen(true)
                      }}
                    >
                      Add a location
                    </Button>
                  ) : undefined
                }
              />
            )}
          </div>
        )}

        {clinics.data && (
          <div className="card__footer">
            <Pagination
              page={page}
              count={clinics.data.count}
              hasNext={Boolean(clinics.data.next)}
              hasPrevious={Boolean(clinics.data.previous)}
              onPageChange={setPage}
              busy={clinics.isFetching}
            />
          </div>
        )}
      </Card>

      <ClinicFormModal
        open={formOpen}
        clinic={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove this location?"
        description={
          <>
            <strong>{pendingDelete?.name}</strong> will be soft-deleted: it disappears
            from the app but is retained in the database.
          </>
        }
        confirmLabel="Remove location"
        destructive
        loading={deleteClinic.isPending}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}
