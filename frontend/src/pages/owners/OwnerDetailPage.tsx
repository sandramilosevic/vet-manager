import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Card, DetailList, PageHeader, Badge } from '../../components/ui/Layout'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/Modal'
import {
  Banner,
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/ui/States'
import { OwnerFormModal } from '../../components/forms/OwnerFormModal'
import { PetFormModal } from '../../components/forms/PetFormModal'
import { useDeleteOwner, useOwner } from '../../hooks/queries/owners'
import { usePets } from '../../hooks/queries/pets'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { formatDate, orDash, petAge } from '../../lib/format'
import { SPECIES_LABELS, GENDER_LABELS } from '../../api/types'

export function OwnerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const ownerId = Number(id)
  const navigate = useNavigate()
  const { can } = useAuth()
  const { notifySuccess, notifyError } = useToast()

  const owner = useOwner(Number.isFinite(ownerId) ? ownerId : undefined)
  // Filtered server-side by owner; the backend also scopes to the caller's
  // clinic, so another practice's animals can never appear here.
  const pets = usePets({ owner: Number.isFinite(ownerId) ? ownerId : undefined })
  const deleteOwner = useDeleteOwner()

  const [editOpen, setEditOpen] = useState(false)
  const [petOpen, setPetOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const petResults = pets.data?.results ?? []

  if (!Number.isFinite(ownerId)) {
    return <ErrorState error={new Error('Invalid owner id')} title="Owner not found" />
  }

  if (owner.isLoading) return <LoadingState label="Loading owner…" />
  if (owner.isError) {
    return <ErrorState error={owner.error} onRetry={() => owner.refetch()} title="Owner not found" />
  }
  if (!owner.data) return null

  const record = owner.data

  const handleDelete = async () => {
    try {
      await deleteOwner.mutateAsync(record.id)
      notifySuccess('Owner deleted')
      navigate('/owners', { replace: true })
    } catch (error) {
      notifyError(error)
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Owners', to: '/owners' }, { label: `${record.first_name} ${record.last_name}` }]}
        title={`${record.first_name} ${record.last_name}`}
        description={`Registered ${formatDate(record.registration_date)}`}
        actions={
          <>
            <Button onClick={() => setPetOpen(true)}>+ Add pet</Button>
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              Edit owner
            </Button>
            {can.deleteOwner && (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid--halves">
        <Card title="Contact details">
          <DetailList
            items={[
              { label: 'First name', value: record.first_name },
              { label: 'Last name', value: record.last_name },
              { label: 'Phone', value: orDash(record.phone_number) },
              {
                label: 'Email',
                value: record.email ? (
                  <a href={`mailto:${encodeURIComponent(record.email)}`}>{record.email}</a>
                ) : (
                  '—'
                ),
              },
              { label: 'Address', value: orDash(record.address) },
              { label: 'Registered', value: formatDate(record.registration_date) },
            ]}
          />
        </Card>

        <Card
          title="Pets"
          subtitle={`${pets.data?.count ?? 0} registered to this owner`}
          actions={
            <Button size="sm" onClick={() => setPetOpen(true)}>
              + Add pet
            </Button>
          }
        >
          {pets.isLoading ? (
            <LoadingState label="Loading pets…" />
          ) : pets.isError ? (
            <ErrorState error={pets.error} onRetry={() => pets.refetch()} />
          ) : petResults.length === 0 ? (
            <EmptyState
              icon="❋"
              title="No pets yet"
              description="Register this owner's animals to start logging vaccinations and medical records."
              action={
                <Button size="sm" variant="primary" onClick={() => setPetOpen(true)}>
                  Add a pet
                </Button>
              }
            />
          ) : (
            <div className="stack stack--tight">
              {pets.data && pets.data.count > petResults.length && (
                <Banner tone="info">
                  Showing the first {petResults.length} of {pets.data.count} pets.
                  Use the Pets page to see them all.
                </Banner>
              )}
              <ul className="stack stack--tight">
                {petResults.map((pet) => (
                  <li key={pet.id}>
                    <Link
                      to={`/pets/${pet.id}`}
                      className="row row--between"
                      style={{
                        padding: 'var(--space-3)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        color: 'inherit',
                        textDecoration: 'none',
                      }}
                    >
                      <span>
                        <strong style={{ fontWeight: 'var(--weight-regular)' }}>
                          {pet.name}
                        </strong>{' '}
                        <span className="muted text-sm">
                          {SPECIES_LABELS[pet.species]} · {GENDER_LABELS[pet.gender]} ·{' '}
                          {petAge(pet.date_of_birth, pet.birth_year)}
                        </span>
                      </span>
                      {pet.allergies ? <Badge tone="warning">Allergies</Badge> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <OwnerFormModal open={editOpen} owner={record} onClose={() => setEditOpen(false)} />

      <PetFormModal
        open={petOpen}
        defaultOwnerId={record.id}
        onClose={() => setPetOpen(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this owner?"
        description={
          <>
            <strong>
              {record.first_name} {record.last_name}
            </strong>{' '}
            will be removed from your practice. Historical records are preserved in the
            database.
          </>
        }
        confirmLabel="Delete owner"
        destructive
        loading={deleteOwner.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
