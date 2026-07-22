import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Card, PageHeader, Stat } from '../components/ui/Layout'
import { Button } from '../components/ui/Button'
import { Banner, EmptyState, ErrorState, LoadingState } from '../components/ui/States'
import { OwnerFormModal } from '../components/forms/OwnerFormModal'
import { PetFormModal } from '../components/forms/PetFormModal'
import { VaccinationFormModal } from '../components/forms/VaccinationFormModal'
import { MedicalRecordFormModal } from '../components/forms/MedicalRecordFormModal'
import { useOwners } from '../hooks/queries/owners'
import { usePets } from '../hooks/queries/pets'
import { useVaccinations } from '../hooks/queries/vaccinations'
import { useMedicalRecords } from '../hooks/queries/medicalRecords'
import { useAuth } from '../hooks/useAuth'
import { addDays, daysFromToday, formatDate, relativeDays, truncate } from '../lib/format'
import { ROLE_LABELS } from '../api/types'

export function DashboardPage() {
  const { email, role, can, clinicName, profile } = useAuth()

  // `count` from a single-page request is the cheapest way to get totals —
  // the API exposes no aggregate/stats endpoint.
  const owners = useOwners({ page: 1, ordering: '-registration_date' })
  const pets = usePets({ page: 1 })
  const records = useMedicalRecords({ page: 1, ordering: '-visit_date' })
  // Filtered and sorted server-side by `next_due`: everything already overdue,
  // plus anything falling due in the next 30 days.
  const upcoming = useVaccinations({
    page: 1,
    next_due__lte: addDays(30),
    ordering: 'next_due',
  })

  const [ownerOpen, setOwnerOpen] = useState(false)
  const [petOpen, setPetOpen] = useState(false)
  const [vaccinationOpen, setVaccinationOpen] = useState(false)
  const [recordOpen, setRecordOpen] = useState(false)

  const upcomingRows = upcoming.data?.results ?? []
  const overdueCount = upcomingRows.filter(
    (item) => (daysFromToday(item.next_due) ?? 0) < 0,
  ).length
  const recentOwners = (owners.data?.results ?? []).slice(0, 6)

  // /accounts/me/ 200s for everyone; a null clinic is what "unassigned" means.
  const hasNoClinic = profile !== null && profile.clinic === null

  return (
    <>
      <PageHeader
        title={`Welcome back${email ? `, ${email.split('@')[0]}` : ''}`}
        description={
          role
            ? `Signed in as ${ROLE_LABELS[role]}${clinicName ? ` at ${clinicName}` : ''}.`
            : undefined
        }
        actions={
          <>
            <Button onClick={() => setOwnerOpen(true)}>+ Owner</Button>
            <Button onClick={() => setPetOpen(true)}>+ Pet</Button>
            <Button onClick={() => setVaccinationOpen(true)}>+ Vaccination</Button>
            {can.createMedicalRecord && (
              <Button variant="primary" onClick={() => setRecordOpen(true)}>
                + Medical record
              </Button>
            )}
          </>
        }
      />

      {hasNoClinic && (
        <div className="mb-4">
          <Banner tone="warning">
            Your account isn&apos;t assigned to a practice, so most screens will be empty.
            Ask an administrator to fix your clinic assignment.
          </Banner>
        </div>
      )}

      <div className="grid grid--stats mb-4">
        <Stat
          label="Pet owners"
          value={
            owners.isLoading ? (
              <span className="skeleton" style={{ width: 60 }} />
            ) : (
              owners.data?.count ?? '—'
            )
          }
          hint="Registered at your practice"
          to="/owners"
        />
        <Stat
          label="Pets"
          value={
            pets.isLoading ? (
              <span className="skeleton" style={{ width: 60 }} />
            ) : (
              pets.data?.count ?? '—'
            )
          }
          hint="Animals under your care"
          to="/pets"
        />
        <Stat
          label="Medical records"
          value={
            records.isLoading ? (
              <span className="skeleton" style={{ width: 60 }} />
            ) : (
              records.data?.count ?? '—'
            )
          }
          hint="Documented visits"
          to="/medical-records"
        />
        <Stat
          label="Vaccinations due"
          value={
            upcoming.isLoading ? (
              <span className="skeleton" style={{ width: 60 }} />
            ) : (
              upcoming.data?.count ?? '—'
            )
          }
          hint={
            overdueCount > 0
              ? `${overdueCount} already overdue`
              : 'Within the next 30 days'
          }
          to="/vaccinations"
        />
      </div>

      <div className="grid grid--halves">
        <Card
          title="Vaccinations due soon"
          subtitle="Next 30 days, plus anything overdue"
          actions={
            <Link className="btn btn--secondary btn--sm" to="/vaccinations">
              View all
            </Link>
          }
          flush
        >
          {upcoming.isLoading ? (
            <LoadingState label="Checking vaccination schedule…" />
          ) : upcoming.isError ? (
            <ErrorState error={upcoming.error} onRetry={() => upcoming.refetch()} />
          ) : upcomingRows.length === 0 ? (
            <EmptyState
              icon="✓"
              title="Nothing due in the next 30 days"
              description="Every vaccination on file has a booster date further out."
            />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <caption className="sr-only">
                  Vaccinations due in the next 30 days
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Pet</th>
                    <th scope="col">Vaccine</th>
                    <th scope="col">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingRows.map((item) => {
                    const dueIn = daysFromToday(item.next_due) ?? 0
                    return (
                      <tr key={item.id}>
                        <td className="table__primary">
                          <Link to={`/pets/${item.pet}`}>{item.pet_name}</Link>
                        </td>
                        <td>{item.vaccine_name}</td>
                        <td className="nowrap">
                          {dueIn < 0 ? (
                            <Badge tone="danger">
                              Overdue {relativeDays(item.next_due)}
                            </Badge>
                          ) : (
                            <Badge tone="warning">{relativeDays(item.next_due)}</Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card
          title="Recent visits"
          subtitle="Latest medical records"
          actions={
            <Link className="btn btn--secondary btn--sm" to="/medical-records">
              View all
            </Link>
          }
          flush
        >
          {records.isLoading ? (
            <LoadingState label="Loading recent visits…" />
          ) : records.isError ? (
            <ErrorState error={records.error} onRetry={() => records.refetch()} />
          ) : (records.data?.results.length ?? 0) === 0 ? (
            <EmptyState
              icon="☰"
              title="No visits recorded yet"
              description={
                can.createMedicalRecord
                  ? 'Document a visit and it will show up here.'
                  : 'Records authored by your vets will appear here.'
              }
            />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <caption className="sr-only">Most recent medical records</caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Pet</th>
                    <th scope="col">Diagnosis</th>
                  </tr>
                </thead>
                <tbody>
                  {records.data?.results.slice(0, 8).map((record) => (
                    <tr key={record.id}>
                      <td className="nowrap">{formatDate(record.visit_date)}</td>
                      <td className="table__primary">
                        <Link to={`/pets/${record.pet}`}>{record.pet_name}</Link>
                      </td>
                      <td>
                        {truncate(record.diagnosis, 48)}{' '}
                        {record.warnings ? <Badge tone="danger">Warning</Badge> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4">
        <Card
          title="Recently registered owners"
          actions={
            <Link className="btn btn--secondary btn--sm" to="/owners">
              View all
            </Link>
          }
        >
          {owners.isLoading ? (
            <LoadingState label="Loading owners…" />
          ) : recentOwners.length === 0 ? (
            <EmptyState
              icon="☺"
              title="No owners yet"
              description="Add your first pet owner to get the practice moving."
              action={
                <Button size="sm" variant="primary" onClick={() => setOwnerOpen(true)}>
                  Add an owner
                </Button>
              }
            />
          ) : (
            <ul className="grid grid--thirds">
              {recentOwners.map((owner) => (
                <li key={owner.id}>
                  <Link
                    to={`/owners/${owner.id}`}
                    style={{
                      display: 'block',
                      padding: 'var(--space-3)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      color: 'inherit',
                      textDecoration: 'none',
                    }}
                  >
                    <span style={{ display: 'block' }}>
                      {owner.first_name} {owner.last_name}
                    </span>
                    <span className="text-xs muted">
                      Registered {formatDate(owner.registration_date)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <OwnerFormModal open={ownerOpen} onClose={() => setOwnerOpen(false)} />
      <PetFormModal open={petOpen} onClose={() => setPetOpen(false)} />
      <VaccinationFormModal
        open={vaccinationOpen}
        onClose={() => setVaccinationOpen(false)}
      />
      <MedicalRecordFormModal open={recordOpen} onClose={() => setRecordOpen(false)} />
    </>
  )
}
