import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { SelectField, TextAreaField, TextField } from '../ui/Field'
import { Banner } from '../ui/States'
import { useCreatePet, useUpdatePet } from '../../hooks/queries/pets'
import { useOwnerLookup } from '../../hooks/queries/owners'
import { useToast } from '../../hooks/useToast'
import { normalizeError } from '../../api/errors'
import { applyServerErrors, petSchema, type PetForm } from '../../lib/schemas'
import {
  GENDERS,
  GENDER_LABELS,
  SPECIES,
  SPECIES_LABELS,
  type Gender,
  type Pet,
  type PetPayload,
  type Species,
} from '../../api/types'
import { fullName, today } from '../../lib/format'

interface Props {
  open: boolean
  pet?: Pet | null
  /** Pre-selects an owner when adding a pet from an owner's page. */
  defaultOwnerId?: number
  onClose: () => void
  onCreated?: (pet: Pet) => void
}

const EMPTY: PetForm = {
  owner: 0,
  name: '',
  species: 'dog',
  gender: 'female',
  breed: '',
  date_of_birth: '',
  birth_year: '',
  description: '',
  allergies: '',
  diet: '',
}

const FIELDS = Object.keys(EMPTY)

/** Turns form values into the exact payload shape the API expects. */
function toPayload(values: PetForm): PetPayload {
  return {
    owner: Number(values.owner),
    name: values.name,
    species: values.species as Species,
    gender: values.gender as Gender,
    breed: values.breed,
    // Django's DateField takes null, not "", for "unknown".
    date_of_birth: values.date_of_birth === '' ? null : values.date_of_birth,
    birth_year: values.birth_year === '' ? null : Number(values.birth_year),
    description: values.description,
    allergies: values.allergies,
    diet: values.diet,
  }
}

export function PetFormModal({ open, pet, defaultOwnerId, onClose, onCreated }: Props) {
  const isEdit = Boolean(pet)
  const createPet = useCreatePet()
  const updatePet = useUpdatePet()
  const ownerLookup = useOwnerLookup(open)
  const { notifySuccess } = useToast()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PetForm>({
    resolver: zodResolver(petSchema),
    defaultValues: EMPTY,
  })

  useEffect(() => {
    if (!open) return
    setFormError(null)
    reset(
      pet
        ? {
            owner: pet.owner,
            name: pet.name,
            species: pet.species,
            gender: pet.gender,
            breed: pet.breed ?? '',
            date_of_birth: pet.date_of_birth ?? '',
            birth_year: pet.birth_year ?? '',
            description: pet.description ?? '',
            allergies: pet.allergies ?? '',
            diet: pet.diet ?? '',
          }
        : { ...EMPTY, owner: defaultOwnerId ?? 0 },
    )
  }, [open, pet, defaultOwnerId, reset])

  const ownerOptions = useMemo(
    () =>
      (ownerLookup.data?.owners ?? []).map((owner) => ({
        value: String(owner.id),
        label: `${fullName(owner.last_name, owner.first_name)} · #${owner.id}`,
      })),
    [ownerLookup.data],
  )

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const payload = toPayload(values)
      if (pet) {
        await updatePet.mutateAsync({ id: pet.id, payload })
        notifySuccess('Pet updated')
      } else {
        const created = await createPet.mutateAsync(payload)
        notifySuccess('Pet registered')
        onCreated?.(created)
      }
      onClose()
    } catch (error) {
      const normalized = normalizeError(error)
      const unmatched = applyServerErrors(normalized.fieldErrors, setError, FIELDS)
      setFormError(
        unmatched[0] ??
          (Object.keys(normalized.fieldErrors).length ? null : normalized.message),
      )
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={isEdit ? `Edit ${pet?.name ?? 'pet'}` : 'Register a pet'}
      description={
        isEdit
          ? 'Update this animal’s record.'
          : 'Every pet belongs to an owner registered at your practice.'
      }
    >
      <form className="form" onSubmit={onSubmit} noValidate>
        {formError && <Banner tone="error">{formError}</Banner>}

        {ownerLookup.data?.truncated && (
          <Banner tone="warning">
            Showing the first {ownerLookup.data.owners.length} of{' '}
            {ownerLookup.data.total} owners. If the one you need isn&apos;t listed, find
            them on the Owners page and add the pet from there.
          </Banner>
        )}

        <SelectField
          label="Owner"
          required
          placeholder={ownerLookup.isLoading ? 'Loading owners…' : 'Select an owner'}
          options={ownerOptions}
          disabled={ownerLookup.isLoading || Boolean(defaultOwnerId && !isEdit)}
          error={errors.owner?.message}
          hint={
            defaultOwnerId && !isEdit
              ? 'Pre-selected from the owner you came from.'
              : undefined
          }
          {...register('owner')}
        />

        <div className="form__row">
          <TextField
            label="Name"
            required
            error={errors.name?.message}
            {...register('name')}
          />
          <TextField
            label="Breed"
            error={errors.breed?.message}
            {...register('breed')}
          />
        </div>

        <div className="form__row">
          <SelectField
            label="Species"
            required
            options={SPECIES.map((value) => ({
              value,
              label: SPECIES_LABELS[value],
            }))}
            error={errors.species?.message}
            {...register('species')}
          />
          <SelectField
            label="Gender"
            required
            options={GENDERS.map((value) => ({ value, label: GENDER_LABELS[value] }))}
            error={errors.gender?.message}
            {...register('gender')}
          />
        </div>

        <div className="form__row">
          <TextField
            label="Date of birth"
            type="date"
            max={today()}
            hint="Leave blank if only the year is known."
            error={errors.date_of_birth?.message}
            {...register('date_of_birth')}
          />
          <TextField
            label="Birth year"
            type="number"
            inputMode="numeric"
            min={1900}
            max={new Date().getFullYear()}
            hint="Must match the date of birth if both are given."
            error={errors.birth_year?.message}
            {...register('birth_year')}
          />
        </div>

        <TextField
          label="Diet"
          error={errors.diet?.message}
          {...register('diet')}
        />

        <TextAreaField
          label="Allergies"
          hint="Anything the vet must know before prescribing."
          error={errors.allergies?.message}
          {...register('allergies')}
        />

        <TextAreaField
          label="Description"
          error={errors.description?.message}
          {...register('description')}
        />

        <div className="form__actions">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Register pet'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
