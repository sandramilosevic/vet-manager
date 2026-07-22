import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge, Card, DetailList, PageHeader } from '../../components/ui/Layout'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/Modal'
import {
  Banner,
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/ui/States'
import { PetFormModal } from '../../components/forms/PetFormModal'
import { VaccinationFormModal } from '../../components/forms/VaccinationFormModal'
import { MedicalRecordFormModal } from '../../components/forms/MedicalRecordFormModal'
import { useDeletePet, usePet } from '../../hooks/queries/pets'
import { useOwner } from '../../hooks/queries/owners'
import { useVaccinations } from '../../hooks/queries/vaccinations'
import { useMedicalRecords } from '../../hooks/queries/medicalRecords'
import { usePetHistory, useVaccinationHistory } from '../../hooks/queries/history'
import { HistoryModal } from '../../components/HistoryModal'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import {
  daysFromToday,
  formatDate,
  orDash,
  petAge,
  relativeDays,
  truncate,
} from '../../lib/format'
import {
  GENDER_LABELS,
  SPECIES_LABELS,
  type Vaccination,
} from '../../api/types'

export function PetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const petId = Number(id)
  const navigate = useNavigate()
  const { can } = useAuth()
  const { notifySuccess, notifyError } = useToast()

  const pet = usePet(Number.isFinite(petId) ? petId : undefined)
  const owner = useOwner(pet.data?.owner)
  const deletePet = useDeletePet()

  const [editOpen, setEditOpen] = useState(false)
  const [vaccinationOpen, setVaccinationOpen] = useState(false)
  const [recordOpen, setRecordOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [petHistoryOpen, setPetHistoryOpen] = useState(false)
  const [vaccinationHistoryFor, setVaccinationHistoryFor] = useState<Vaccination | null>(
    null,
  )

  // Both endpoints filter by pet id server-side, so nothing is over-fetched and
  // two animals sharing a name can't bleed into each other's history.
  const isValidPet = Number.isFinite(petId)
  const vaccinations = useVaccinations({ pet: petId, ordering: 'next_due' }, isValidPet)
  const records = useMedicalRecords({ pet: petId, ordering: '-visit_date' }, isValidPet)

  const petHistory = usePetHistory(petId, petHistoryOpen)
  const vaccinationHistory = useVaccinationHistory(
    vaccinationHistoryFor?.id,
    vaccinationHistoryFor !== null,
  )

  const petVaccinations = vaccinations.data?.results ?? []
  const petRecords = records.data?.results ?? []

  if (!Number.isFinite(petId)) {
    return <ErrorState error={new Error('Invalid pet id')} title="Pet not found" />
  }

  if (pet.isLoading) return <LoadingState label="Loading pet…" />
  if (pet.isError) {
    return <ErrorState error={pet.error} onRetry={() => pet.refetch()} title="Pet not found" />
  }
  if (!pet.data) return null

  const record = pet.data

  const handleDelete = async () => {
    try {
      await deletePet.mutateAsync(record.id)
      notifySuccess('Pet deleted')
      navigate('/pets', { replace: true })
    } catch (error) {
      notifyError(error)
      setConfirmDelete(false)
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Pets', to: '/pets' }, { label: record.name }]}
        title={record.name}
        description={`${SPECIES_LABELS[record.species]} · ${GENDER_LABELS[record.gender]} · ${petAge(record.date_of_birth, record.birth_year)}`}
        actions={
          <>
            <Button onClick={() => setVaccinationOpen(true)}>+ Vaccination</Button>
            {can.createMedicalRecord && (
              <Button onClick={() => setRecordOpen(true)}>+ Medical record</Button>
            )}
            <Button variant="secondary" onClick={() => setPetHistoryOpen(true)}>
              History
            </Button>
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              Edit pet
            </Button>
            {can.deletePet && (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
          </>
        }
      />

      {record.allergies && (
        <div className="mb-4">
          <Banner tone="warning">
            <strong>Allergies:</strong> {record.allergies}
          </Banner>
        </div>
      )}

      <div className="grid grid--halves mb-4">
        <Card title="Animal details">
          <DetailList
            items={[
              { label: 'Name', value: record.name },
              { label: 'Species', value: SPECIES_LABELS[record.species] },
              { label: 'Breed', value: orDash(record.breed) },
              { label: 'Gender', value: GENDER_LABELS[record.gender] },
              { label: 'Date of birth', value: formatDate(record.date_of_birth) },
              { label: 'Birth year', value: orDash(record.birth_year) },
              { label: 'Age', value: petAge(record.date_of_birth, record.birth_year) },
              { label: 'Diet', value: orDash(record.diet), multiline: true },
              { label: 'Allergies', value: orDash(record.allergies), multiline: true },
              { label: 'Notes', value: orDash(record.description), multiline: true },
            ]}
          />
        </Card>

        <Card
          title="Owner"
          actions={
            <Link className="btn btn--secondary btn--sm" to={`/owners/${record.owner}`}>
              Open owner
            </Link>
          }
        >
          {owner.isLoading ? (
            <LoadingState label="Loading owner…" />
          ) : owner.isError ? (
            <ErrorState error={owner.error} onRetry={() => owner.refetch()} title="Owner unavailable" />
          ) : owner.data ? (
            <DetailList
              items={[
                {
                  label: 'Name',
                  value: `${owner.data.first_name} ${owner.data.last_name}`,
                },
                { label: 'Phone', value: orDash(owner.data.phone_number) },
                { label: 'Email', value: orDash(owner.data.email) },
                { label: 'Address', value: orDash(owner.data.address) },
              ]}
            />
          ) : null}
        </Card>
      </div>

      <div className="grid grid--halves">
        <Card
          title="Vaccinations"
          subtitle={`${petVaccinations.length} recorded`}
          actions={
            <Button size="sm" onClick={() => setVaccinationOpen(true)}>
              + Log
            </Button>
          }
          flush
        >
          {vaccinations.isLoading ? (
            <LoadingState label="Loading vaccinations…" />
          ) : vaccinations.isError ? (
            <ErrorState error={vaccinations.error} onRetry={() => vaccinations.refetch()} />
          ) : petVaccinations.length === 0 ? (
            <EmptyState
              icon="⊕"
              title="No vaccinations logged"
              description="Record the first dose to start tracking when the next one is due."
            />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <caption className="sr-only">Vaccinations for {record.name}</caption>
                <thead>
                  <tr>
                    <th scope="col">Vaccine</th>
                    <th scope="col">Given</th>
                    <th scope="col">Next due</th>
                    <th scope="col" className="table__actions">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {petVaccinations.map((vaccination) => {
                    const due = daysFromToday(vaccination.next_due)
                    return (
                      <tr key={vaccination.id}>
                        <td className="table__primary">{vaccination.vaccine_name}</td>
                        <td className="nowrap">{formatDate(vaccination.date_given)}</td>
                        <td className="nowrap">
                          {formatDate(vaccination.next_due)}{' '}
                          {due !== null && due < 0 ? (
                            <Badge tone="danger">Overdue</Badge>
                          ) : due !== null && due <= 30 ? (
                            <Badge tone="warning">{relativeDays(vaccination.next_due)}</Badge>
                          ) : null}
                        </td>
                        <td className="table__actions">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setVaccinationHistoryFor(vaccination)}
                          >
                            History
                          </Button>
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
          title="Medical records"
          subtitle={`${petRecords.length} on file`}
          actions={
            can.createMedicalRecord ? (
              <Button size="sm" onClick={() => setRecordOpen(true)}>
                + Add
              </Button>
            ) : undefined
          }
          flush
        >
          {records.isLoading ? (
            <LoadingState label="Loading records…" />
          ) : records.isError ? (
            <ErrorState error={records.error} onRetry={() => records.refetch()} />
          ) : petRecords.length === 0 ? (
            <EmptyState
              icon="☰"
              title="No medical records"
              description={
                can.createMedicalRecord
                  ? 'Document a visit to build this animal’s clinical history.'
                  : 'Only vets and admins can create medical records.'
              }
            />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <caption className="sr-only">Medical records for {record.name}</caption>
                <thead>
                  <tr>
                    <th scope="col">Visit</th>
                    <th scope="col">Diagnosis</th>
                    <th scope="col" className="table__num">
                      Weight
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {petRecords.map((item) => (
                    <tr key={item.id}>
                      <td className="nowrap">{formatDate(item.visit_date)}</td>
                      <td>
                        {truncate(item.diagnosis, 60)}{' '}
                        {item.warnings ? <Badge tone="danger">Warning</Badge> : null}
                      </td>
                      <td className="table__num nowrap">
                        {item.weight ? `${item.weight} kg` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <HistoryModal
        open={petHistoryOpen}
        onClose={() => setPetHistoryOpen(false)}
        title="Change history"
        description={`Every recorded revision of ${record.name}`}
        query={petHistory}
        fields={[
          { label: 'Name', value: (row) => row.name },
          { label: 'Breed', value: (row) => orDash(row.breed) },
          { label: 'Date of birth', value: (row) => formatDate(row.date_of_birth) },
          { label: 'Allergies', value: (row) => orDash(row.allergies) },
          { label: 'Diet', value: (row) => orDash(row.diet) },
        ]}
      />

      <HistoryModal
        open={vaccinationHistoryFor !== null}
        onClose={() => setVaccinationHistoryFor(null)}
        title="Vaccination history"
        description={vaccinationHistoryFor?.vaccine_name}
        query={vaccinationHistory}
        fields={[
          { label: 'Vaccine', value: (row) => row.vaccine_name },
          { label: 'Given', value: (row) => formatDate(row.date_given) },
          { label: 'Next due', value: (row) => formatDate(row.next_due) },
        ]}
      />

      <PetFormModal open={editOpen} pet={record} onClose={() => setEditOpen(false)} />

      <VaccinationFormModal
        open={vaccinationOpen}
        defaultPetId={record.id}
        onClose={() => setVaccinationOpen(false)}
      />

      <MedicalRecordFormModal
        open={recordOpen}
        defaultPetId={record.id}
        onClose={() => setRecordOpen(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this pet?"
        description={
          <>
            <strong>{record.name}</strong> will be permanently deleted. The server refuses
            this if the animal has vaccinations or medical records attached.
          </>
        }
        confirmLabel="Delete pet"
        destructive
        loading={deletePet.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
