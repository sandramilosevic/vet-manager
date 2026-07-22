import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Card, DetailList, PageHeader } from '../../components/ui/Layout'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import {
  Banner,
  EmptyState,
  ErrorState,
  TableSkeleton,
} from '../../components/ui/States'
import { MedicalRecordFormModal } from '../../components/forms/MedicalRecordFormModal'
import {
  useDeleteMedicalRecord,
  useMedicalRecords,
} from '../../hooks/queries/medicalRecords'
import { useMedicalRecordHistory } from '../../hooks/queries/history'
import { HistoryModal } from '../../components/HistoryModal'
import { useDebounce } from '../../hooks/useDebounce'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { formatDate, orDash, truncate } from '../../lib/format'
import type { MedicalRecord, MedicalRecordFilters } from '../../api/types'

export function MedicalRecordsPage() {
  const { can } = useAuth()
  const { notifySuccess, notifyError } = useToast()
  const deleteRecord = useDeleteMedicalRecord()

  const [page, setPage] = useState(1)
  const [petName, setPetName] = useState('')
  const [visitFrom, setVisitFrom] = useState('')
  const [visitTo, setVisitTo] = useState('')
  const [descending, setDescending] = useState(true)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MedicalRecord | null>(null)
  const [viewing, setViewing] = useState<MedicalRecord | null>(null)
  const [historyFor, setHistoryFor] = useState<MedicalRecord | null>(null)
  const [pendingDelete, setPendingDelete] = useState<MedicalRecord | null>(null)

  const debouncedPet = useDebounce(petName)

  const filters = useMemo<MedicalRecordFilters>(
    () => ({
      page,
      pet__name__icontains: debouncedPet || undefined,
      visit_date__gte: visitFrom || undefined,
      visit_date__lte: visitTo || undefined,
      ordering: descending ? '-visit_date' : 'visit_date',
    }),
    [page, debouncedPet, visitFrom, visitTo, descending],
  )

  const records = useMedicalRecords(filters)
  // Only fetched once a history panel is actually opened.
  const history = useMedicalRecordHistory(historyFor?.id, historyFor !== null)

  const hasFilters = Boolean(petName || visitFrom || visitTo)
  const results = records.data?.results ?? []

  const clearFilters = () => {
    setPetName('')
    setVisitFrom('')
    setVisitTo('')
    setPage(1)
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteRecord.mutateAsync(pendingDelete.id)
      notifySuccess('Medical record deleted')
      setPendingDelete(null)
    } catch (error) {
      notifyError(error)
    }
  }

  return (
    <>
      <PageHeader
        title="Medical records"
        description="Clinical history across the practice. Records are authored by vets and admins; everyone can read them."
        actions={
          can.createMedicalRecord ? (
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              + New record
            </Button>
          ) : undefined
        }
      />

      {!can.createMedicalRecord && (
        <div className="mb-4">
          <Banner tone="info">
            Your role has read-only access to medical records. Vets and admins can create
            and edit them.
          </Banner>
        </div>
      )}

      <Card flush>
        <div className="filters">
          <div className="filters__field filters__field--grow">
            <label className="filters__label" htmlFor="rec-pet">
              Pet name
            </label>
            <input
              id="rec-pet"
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

          <div className="filters__field">
            <label className="filters__label" htmlFor="rec-from">
              Visited from
            </label>
            <input
              id="rec-from"
              className="input"
              type="date"
              value={visitFrom}
              onChange={(event) => {
                setVisitFrom(event.target.value)
                setPage(1)
              }}
            />
          </div>

          <div className="filters__field">
            <label className="filters__label" htmlFor="rec-to">
              Visited to
            </label>
            <input
              id="rec-to"
              className="input"
              type="date"
              value={visitTo}
              onChange={(event) => {
                setVisitTo(event.target.value)
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

        {records.isError ? (
          <ErrorState error={records.error} onRetry={() => records.refetch()} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">Medical records</caption>
              <thead>
                <tr>
                  <th scope="col">
                    <button
                      type="button"
                      className="table__sort"
                      onClick={() => {
                        setDescending((current) => !current)
                        setPage(1)
                      }}
                      aria-label="Sort by visit date"
                    >
                      Visit date
                      <span className="table__sort-indicator" aria-hidden="true">
                        {descending ? '↓' : '↑'}
                      </span>
                    </button>
                  </th>
                  <th scope="col">Pet</th>
                  <th scope="col">Diagnosis</th>
                  <th scope="col">Vet</th>
                  <th scope="col" className="table__num">
                    Weight
                  </th>
                  <th scope="col" className="table__num">
                    Temp.
                  </th>
                  <th scope="col" className="table__actions">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>

              {records.isLoading ? (
                <TableSkeleton columns={7} />
              ) : (
                <tbody>
                  {results.map((record) => (
                    <tr key={record.id}>
                      <td className="nowrap">{formatDate(record.visit_date)}</td>
                      <td className="table__primary">
                        <Link to={`/pets/${record.pet}`}>{record.pet_name}</Link>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn--link"
                          onClick={() => setViewing(record)}
                        >
                          {truncate(record.diagnosis, 70)}
                        </button>{' '}
                        {record.warnings ? <Badge tone="danger">Warning</Badge> : null}
                      </td>
                      <td className="text-sm">{orDash(record.vet_email)}</td>
                      <td className="table__num nowrap">
                        {record.weight ? `${record.weight} kg` : '—'}
                      </td>
                      <td className="table__num nowrap">
                        {record.temperature ? `${record.temperature} °C` : '—'}
                      </td>
                      <td className="table__actions">
                        <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
                          <Button size="sm" variant="ghost" onClick={() => setViewing(record)}>
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setHistoryFor(record)}
                          >
                            History
                          </Button>
                          {can.editMedicalRecord && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditing(record)
                                setFormOpen(true)
                              }}
                            >
                              Edit
                            </Button>
                          )}
                          {can.deleteMedicalRecord && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setPendingDelete(record)}
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

            {!records.isLoading && results.length === 0 && (
              <EmptyState
                icon="☰"
                title={hasFilters ? 'No records match those filters' : 'No medical records yet'}
                description={
                  hasFilters
                    ? 'Try a wider date range or a different pet name.'
                    : can.createMedicalRecord
                      ? 'Document a visit to start building clinical history.'
                      : 'Records will appear here once a vet documents a visit.'
                }
                action={
                  hasFilters ? (
                    <Button size="sm" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            )}
          </div>
        )}

        {records.data && (
          <div className="card__footer">
            <Pagination
              page={page}
              count={records.data.count}
              hasNext={Boolean(records.data.next)}
              hasPrevious={Boolean(records.data.previous)}
              onPageChange={setPage}
              busy={records.isFetching}
            />
          </div>
        )}
      </Card>

      {/* Read-only detail view — free text is rendered as text, never HTML. */}
      <Modal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        wide
        title={viewing ? `Visit on ${formatDate(viewing.visit_date)}` : ''}
        description={viewing ? viewing.pet_name : undefined}
      >
        {viewing && (
          <div className="stack">
            <DetailList
              items={[
                { label: 'Diagnosis', value: viewing.diagnosis, multiline: true },
                { label: 'Medication', value: orDash(viewing.meds), multiline: true },
                {
                  label: 'Treatment notes',
                  value: orDash(viewing.treatment_notes),
                  multiline: true,
                },
                { label: 'Weight', value: viewing.weight ? `${viewing.weight} kg` : '—' },
                {
                  label: 'Temperature',
                  value: viewing.temperature ? `${viewing.temperature} °C` : '—',
                },
                { label: 'Warnings', value: orDash(viewing.warnings), multiline: true },
                { label: 'Recorded by', value: orDash(viewing.vet_email) },
                { label: 'Created', value: formatDate(viewing.created_at) },
              ]}
            />
            <div className="form__actions">
              <Link className="btn btn--secondary" to={`/pets/${viewing.pet}`}>
                Open pet
              </Link>
              {can.editMedicalRecord && (
                <Button
                  variant="primary"
                  onClick={() => {
                    setEditing(viewing)
                    setViewing(null)
                    setFormOpen(true)
                  }}
                >
                  Edit record
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <HistoryModal
        open={historyFor !== null}
        onClose={() => setHistoryFor(null)}
        title="Change history"
        description={
          historyFor
            ? `${historyFor.pet_name} · visit on ${formatDate(historyFor.visit_date)}`
            : undefined
        }
        query={history}
        fields={[
          { label: 'Visit date', value: (row) => formatDate(row.visit_date) },
          { label: 'Diagnosis', value: (row) => truncate(row.diagnosis, 60) },
          { label: 'Medication', value: (row) => truncate(orDash(row.meds), 40) },
          { label: 'Weight', value: (row) => (row.weight ? `${row.weight} kg` : '—') },
          {
            label: 'Temperature',
            value: (row) => (row.temperature ? `${row.temperature} °C` : '—'),
          },
        ]}
      />

      <MedicalRecordFormModal
        open={formOpen}
        record={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this medical record?"
        description="The record is soft-deleted on the server: it disappears from the app but is retained in the database for audit purposes."
        confirmLabel="Delete record"
        destructive
        loading={deleteRecord.isPending}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}
