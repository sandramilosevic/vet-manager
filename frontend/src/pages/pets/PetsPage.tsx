import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, PageHeader, Badge } from '../../components/ui/Layout'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { ConfirmDialog } from '../../components/ui/Modal'
import { EmptyState, ErrorState, TableSkeleton } from '../../components/ui/States'
import { PetFormModal } from '../../components/forms/PetFormModal'
import { useDeletePet, usePets } from '../../hooks/queries/pets'
import { useDebounce } from '../../hooks/useDebounce'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { orDash, petAge } from '../../lib/format'
import {
  GENDERS,
  GENDER_LABELS,
  SPECIES,
  SPECIES_LABELS,
  type Gender,
  type Pet,
  type PetFilters,
  type Species,
} from '../../api/types'

export function PetsPage() {
  const { can } = useAuth()
  const { notifySuccess, notifyError } = useToast()
  const deletePet = useDeletePet()

  const [page, setPage] = useState(1)
  const [name, setName] = useState('')
  const [breed, setBreed] = useState('')
  const [species, setSpecies] = useState<Species | ''>('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [bornFrom, setBornFrom] = useState('')
  const [bornTo, setBornTo] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Pet | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Pet | null>(null)

  const debouncedName = useDebounce(name)
  const debouncedBreed = useDebounce(breed)

  const filters = useMemo<PetFilters>(
    () => ({
      page,
      name__icontains: debouncedName || undefined,
      breed__icontains: debouncedBreed || undefined,
      species: species || undefined,
      gender: gender || undefined,
      date_of_birth__gte: bornFrom || undefined,
      date_of_birth__lte: bornTo || undefined,
    }),
    [page, debouncedName, debouncedBreed, species, gender, bornFrom, bornTo],
  )

  const pets = usePets(filters)

  const resetToFirstPage = () => setPage(1)

  const hasFilters = Boolean(name || breed || species || gender || bornFrom || bornTo)
  const results = pets.data?.results ?? []

  const clearFilters = () => {
    setName('')
    setBreed('')
    setSpecies('')
    setGender('')
    setBornFrom('')
    setBornTo('')
    resetToFirstPage()
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    try {
      await deletePet.mutateAsync(pendingDelete.id)
      notifySuccess(`${pendingDelete.name} deleted`)
      setPendingDelete(null)
    } catch (error) {
      // Vaccinations and medical records reference pets with on_delete=PROTECT,
      // so this legitimately fails for any animal with history.
      notifyError(error)
    }
  }

  return (
    <>
      <PageHeader
        title="Pets"
        description="Every animal registered at your practice, across all owners."
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            + Register pet
          </Button>
        }
      />

      <Card flush>
        <div className="filters">
          <div className="filters__field filters__field--grow">
            <label className="filters__label" htmlFor="pet-name">
              Name
            </label>
            <input
              id="pet-name"
              className="input"
              type="search"
              value={name}
              placeholder="Search pet name"
              onChange={(event) => {
                setName(event.target.value)
                resetToFirstPage()
              }}
            />
          </div>

          <div className="filters__field">
            <label className="filters__label" htmlFor="pet-species">
              Species
            </label>
            <select
              id="pet-species"
              className="select"
              value={species}
              onChange={(event) => {
                setSpecies(event.target.value as Species | '')
                resetToFirstPage()
              }}
            >
              <option value="">All</option>
              {SPECIES.map((value) => (
                <option key={value} value={value}>
                  {SPECIES_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="filters__field">
            <label className="filters__label" htmlFor="pet-gender">
              Gender
            </label>
            <select
              id="pet-gender"
              className="select"
              value={gender}
              onChange={(event) => {
                setGender(event.target.value as Gender | '')
                resetToFirstPage()
              }}
            >
              <option value="">All</option>
              {GENDERS.map((value) => (
                <option key={value} value={value}>
                  {GENDER_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="filters__field">
            <label className="filters__label" htmlFor="pet-breed">
              Breed
            </label>
            <input
              id="pet-breed"
              className="input"
              type="search"
              value={breed}
              placeholder="Any breed"
              onChange={(event) => {
                setBreed(event.target.value)
                resetToFirstPage()
              }}
            />
          </div>

          <div className="filters__field">
            <label className="filters__label" htmlFor="pet-born-from">
              Born from
            </label>
            <input
              id="pet-born-from"
              className="input"
              type="date"
              value={bornFrom}
              onChange={(event) => {
                setBornFrom(event.target.value)
                resetToFirstPage()
              }}
            />
          </div>

          <div className="filters__field">
            <label className="filters__label" htmlFor="pet-born-to">
              Born to
            </label>
            <input
              id="pet-born-to"
              className="input"
              type="date"
              value={bornTo}
              onChange={(event) => {
                setBornTo(event.target.value)
                resetToFirstPage()
              }}
            />
          </div>

          {hasFilters && (
            <Button size="sm" variant="ghost" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>

        {pets.isError ? (
          <ErrorState error={pets.error} onRetry={() => pets.refetch()} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">Registered pets</caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Species</th>
                  <th scope="col">Breed</th>
                  <th scope="col">Gender</th>
                  <th scope="col">Age</th>
                  <th scope="col">Owner</th>
                  <th scope="col" className="table__actions">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>

              {pets.isLoading ? (
                <TableSkeleton columns={7} />
              ) : (
                <tbody>
                  {results.map((pet) => (
                    <tr key={pet.id}>
                      <td className="table__primary">
                        <Link to={`/pets/${pet.id}`}>{pet.name}</Link>{' '}
                        {pet.allergies ? <Badge tone="warning">Allergies</Badge> : null}
                      </td>
                      <td>{SPECIES_LABELS[pet.species]}</td>
                      <td>{orDash(pet.breed)}</td>
                      <td>{GENDER_LABELS[pet.gender]}</td>
                      <td className="nowrap">{petAge(pet.date_of_birth, pet.birth_year)}</td>
                      <td>
                        {/* `owner_name` is resolved server-side — no lookup needed. */}
                        <Link to={`/owners/${pet.owner}`}>{pet.owner_name}</Link>
                      </td>
                      <td className="table__actions">
                        <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditing(pet)
                              setFormOpen(true)
                            }}
                          >
                            Edit
                          </Button>
                          {can.deletePet && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setPendingDelete(pet)}
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

            {!pets.isLoading && results.length === 0 && (
              <EmptyState
                icon="❋"
                title={hasFilters ? 'No pets match those filters' : 'No pets registered yet'}
                description={
                  hasFilters
                    ? 'Adjust or clear the filters to see more animals.'
                    : 'Register an animal against one of your owners to begin tracking its care.'
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
                      Register a pet
                    </Button>
                  )
                }
              />
            )}
          </div>
        )}

        {pets.data && (
          <div className="card__footer">
            <Pagination
              page={page}
              count={pets.data.count}
              hasNext={Boolean(pets.data.next)}
              hasPrevious={Boolean(pets.data.previous)}
              onPageChange={setPage}
              busy={pets.isFetching}
            />
          </div>
        )}
      </Card>

      <PetFormModal
        open={formOpen}
        pet={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this pet?"
        description={
          <>
            <strong>{pendingDelete?.name}</strong> will be permanently deleted. This
            cannot be undone. If the animal has vaccinations or medical records, the
            server will refuse the deletion to protect that history.
          </>
        }
        confirmLabel="Delete pet"
        destructive
        loading={deletePet.isPending}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}
