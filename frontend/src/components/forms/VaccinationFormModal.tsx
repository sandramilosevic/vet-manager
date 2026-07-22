import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { SelectField, TextField } from '../ui/Field'
import { Banner } from '../ui/States'
import {
  useCreateVaccination,
  useUpdateVaccination,
} from '../../hooks/queries/vaccinations'
import { usePetLookup } from '../../hooks/queries/pets'
import { useToast } from '../../hooks/useToast'
import { normalizeError } from '../../api/errors'
import {
  applyServerErrors,
  vaccinationSchema,
  type VaccinationForm,
} from '../../lib/schemas'
import { SPECIES_LABELS, type Vaccination } from '../../api/types'
import { addDays, today } from '../../lib/format'

interface Props {
  open: boolean
  vaccination?: Vaccination | null
  defaultPetId?: number
  onClose: () => void
}

const EMPTY: VaccinationForm = {
  pet: 0,
  vaccine_name: '',
  date_given: '',
  next_due: '',
}

const FIELDS = Object.keys(EMPTY)

export function VaccinationFormModal({
  open,
  vaccination,
  defaultPetId,
  onClose,
}: Props) {
  const isEdit = Boolean(vaccination)
  const createVaccination = useCreateVaccination()
  const updateVaccination = useUpdateVaccination()
  const petLookup = usePetLookup(open)
  const { notifySuccess } = useToast()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VaccinationForm>({
    resolver: zodResolver(vaccinationSchema),
    defaultValues: EMPTY,
  })

  useEffect(() => {
    if (!open) return
    setFormError(null)
    reset(
      vaccination
        ? {
            pet: vaccination.pet,
            vaccine_name: vaccination.vaccine_name,
            date_given: vaccination.date_given,
            next_due: vaccination.next_due,
          }
        : {
            ...EMPTY,
            pet: defaultPetId ?? 0,
            // Sensible defaults for the common case: given today, due in a year.
            date_given: today(),
            next_due: addDays(365),
          },
    )
  }, [open, vaccination, defaultPetId, reset])

  const petOptions = useMemo(
    () =>
      (petLookup.data?.pets ?? []).map((pet) => ({
        value: String(pet.id),
        label: `${pet.name} · ${SPECIES_LABELS[pet.species]} · #${pet.id}`,
      })),
    [petLookup.data],
  )

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    const payload = {
      pet: Number(values.pet),
      vaccine_name: values.vaccine_name,
      date_given: values.date_given,
      next_due: values.next_due,
    }

    try {
      if (vaccination) {
        await updateVaccination.mutateAsync({ id: vaccination.id, payload })
        notifySuccess('Vaccination updated')
      } else {
        await createVaccination.mutateAsync(payload)
        notifySuccess('Vaccination logged')
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
      title={isEdit ? 'Edit vaccination' : 'Log a vaccination'}
      description={
        isEdit ? undefined : 'Record a dose given and when the next one is due.'
      }
    >
      <form className="form" onSubmit={onSubmit} noValidate>
        {formError && <Banner tone="error">{formError}</Banner>}

        {petLookup.data?.truncated && (
          <Banner tone="warning">
            Showing the first {petLookup.data.pets.length} of {petLookup.data.total} pets.
            If the animal isn&apos;t listed, open its profile and log the vaccination
            from there.
          </Banner>
        )}

        <SelectField
          label="Pet"
          required
          placeholder={petLookup.isLoading ? 'Loading pets…' : 'Select a pet'}
          options={petOptions}
          disabled={petLookup.isLoading || Boolean(defaultPetId && !isEdit)}
          error={errors.pet?.message}
          {...register('pet')}
        />

        <TextField
          label="Vaccine name"
          required
          placeholder="e.g. Rabies, DHPP"
          error={errors.vaccine_name?.message}
          {...register('vaccine_name')}
        />

        <div className="form__row">
          <TextField
            label="Date given"
            type="date"
            required
            max={today()}
            error={errors.date_given?.message}
            {...register('date_given')}
          />
          <TextField
            label="Next due"
            type="date"
            required
            error={errors.next_due?.message}
            {...register('next_due')}
          />
        </div>

        <div className="form__actions">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Log vaccination'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
