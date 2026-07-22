import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Card, PageHeader } from '../../components/ui/Layout'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { ConfirmDialog } from '../../components/ui/Modal'
import { EmptyState, ErrorState, TableSkeleton } from '../../components/ui/States'
import { VaccinationFormModal } from '../../components/forms/VaccinationFormModal'
import {
  useDeleteVaccination,
  useVaccinations,
} from '../../hooks/queries/vaccinations'
import { useDebounce } from '../../hooks/useDebounce'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { daysFromToday, formatDate, relativeDays } from '../../lib/format'
import type { Vaccination, VaccinationFilters } from '../../api/types'

export function VaccinationsPage() {
  const { can } = useAuth()
  const { notifySuccess, notifyError } = useToast()
  const deleteVaccination = useDeleteVaccination()

  const [page, setPage] = useState(1)
  const [petName, setPetName] = useState('')
  const [vaccineName, setVaccineName] = useState('')
  const [givenFrom, setGivenFrom] = useState('')
  const [givenTo, setGivenTo] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Vaccination | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Vaccination | null>(null)

  const debouncedPet = useDebounce(petName)
  const debouncedVaccine = useDebounce(vaccineName)

  const filters = useMemo<VaccinationFilters>(
    () => ({
      page,
      pet__name__icontains: debouncedPet || undefined,
      vaccine_name__icontains: debouncedVaccine || undefined,
      date_given__gte: givenFrom || undefined,
      date_given__lte: givenTo || undefined,
    }),
    [page, debouncedPet, debouncedVaccine, givenFrom, givenTo],
  )

  const vaccinations = useVaccinations(filters)

  const hasFilters = Boolean(petName || vaccineName || givenFrom || givenTo)
  const results = vaccinations.data?.results ?? []

  const clearFilters = () => {
    setPetName('')
    setVaccineName('')
    setGivenFrom('')
    setGivenTo('')
    setPage(1)
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteVaccination.mutateAsync(pendingDelete.id)
      notifySuccess('Vaccination deleted')
      setPendingDelete(null)
    } catch (error) {
      notifyError(error)
    }
  }

  return (
    <>
      <PageHeader
        title="Vaccinations"
        description="Every dose recorded at your practice, with the date the next one falls due."
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            + Log vaccination
          </Button>
        }
      />

      <Card flush>
        <div className="filters">
          <div className="filters__field filters__field--grow">
            <label className="filters__label" htmlFor="vax-pet">
              Pet name
            </label>
            <input
              id="vax-pet"
              className="input"
              type="search"
              value={petName}
              placeholder="Search pet"
              onChange={(event) => {
                setPetName(event.target.value)
                setPage(1)
              }}
            />
          </div>

          <div className="filters__field filters__field--grow">
            <label className="filters__label" htmlFor="vax-name">
              Vaccine
            </label>
            <input
              id="vax-name"
              className="input"
              type="search"
              value={vaccineName}
              placeholder="Search vaccine"
              onChange={(event) => {
                setVaccineName(event.target.value)
                setPage(1)
              }}
            />
          </div>

          <div className="filters__field">
            <label className="filters__label" htmlFor="vax-from">
              Given from
            </label>
            <input
              id="vax-from"
              className="input"
              type="date"
              value={givenFrom}
              onChange={(event) => {
                setGivenFrom(event.target.value)
                setPage(1)
              }}
            />
          </div>

          <div className="filters__field">
            <label className="filters__label" htmlFor="vax-to">
              Given to
            </label>
            <input
              id="vax-to"
              className="input"
              type="date"
              value={givenTo}
              onChange={(event) => {
                setGivenTo(event.target.value)
                setPage(1)
              }}
            />
          </div>

          {hasFilters && (
            <Button size="sm" variant="ghost" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>

        {vaccinations.isError ? (
          <ErrorState error={vaccinations.error} onRetry={() => vaccinations.refetch()} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">Vaccination log</caption>
              <thead>
                <tr>
                  <th scope="col">Pet</th>
                  <th scope="col">Vaccine</th>
                  <th scope="col">Given</th>
                  <th scope="col">Next due</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="table__actions">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>

              {vaccinations.isLoading ? (
                <TableSkeleton columns={6} />
              ) : (
                <tbody>
                  {results.map((vaccination) => {
                    const due = daysFromToday(vaccination.next_due)
                    return (
                      <tr key={vaccination.id}>
                        <td className="table__primary">
                          <Link to={`/pets/${vaccination.pet}`}>
                            {vaccination.pet_name}
                          </Link>
                        </td>
                        <td>{vaccination.vaccine_name}</td>
                        <td className="nowrap">{formatDate(vaccination.date_given)}</td>
                        <td className="nowrap">{formatDate(vaccination.next_due)}</td>
                        <td className="nowrap">
                          {due === null ? (
                            '—'
                          ) : due < 0 ? (
                            <Badge tone="danger">Overdue {relativeDays(vaccination.next_due)}</Badge>
                          ) : due <= 30 ? (
                            <Badge tone="warning">Due {relativeDays(vaccination.next_due)}</Badge>
                          ) : (
                            <Badge tone="success">Up to date</Badge>
                          )}
                        </td>
                        <td className="table__actions">
                          <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditing(vaccination)
                                setFormOpen(true)
                              }}
                            >
                              Edit
                            </Button>
                            {can.deleteVaccination && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setPendingDelete(vaccination)}
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              )}
            </table>

            {!vaccinations.isLoading && results.length === 0 && (
              <EmptyState
                icon="⊕"
                title={hasFilters ? 'No vaccinations match those filters' : 'No vaccinations logged'}
                description={
                  hasFilters
                    ? 'Widen the date range or clear the filters.'
                    : 'Log a dose against a pet to start tracking booster dates.'
                }
                action={
                  hasFilters ? (
                    <Button size="sm" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setEditing(null)
                        setFormOpen(true)
                      }}
                    >
                      Log a vaccination
                    </Button>
                  )
                }
              />
            )}
          </div>
        )}

        {vaccinations.data && (
          <div className="card__footer">
            <Pagination
              page={page}
              count={vaccinations.data.count}
              hasNext={Boolean(vaccinations.data.next)}
              hasPrevious={Boolean(vaccinations.data.previous)}
              onPageChange={setPage}
              busy={vaccinations.isFetching}
            />
          </div>
        )}
      </Card>

      <VaccinationFormModal
        open={formOpen}
        vaccination={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this vaccination?"
        description={
          <>
            The record of <strong>{pendingDelete?.vaccine_name}</strong> given on{' '}
            {formatDate(pendingDelete?.date_given)} will be permanently removed.
          </>
        }
        confirmLabel="Delete"
        destructive
        loading={deleteVaccination.isPending}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}
