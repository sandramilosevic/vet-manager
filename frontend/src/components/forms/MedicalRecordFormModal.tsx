import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { SelectField, TextAreaField, TextField } from '../ui/Field'
import { Banner } from '../ui/States'
import {
  useCreateMedicalRecord,
  useUpdateMedicalRecord,
} from '../../hooks/queries/medicalRecords'
import { usePetLookup } from '../../hooks/queries/pets'
import { useToast } from '../../hooks/useToast'
import { normalizeError } from '../../api/errors'
import {
  applyServerErrors,
  medicalRecordSchema,
  type MedicalRecordForm,
} from '../../lib/schemas'
import { SPECIES_LABELS, type MedicalRecord, type MedicalRecordPayload } from '../../api/types'
import { today } from '../../lib/format'

interface Props {
  open: boolean
  record?: MedicalRecord | null
  defaultPetId?: number
  onClose: () => void
}

const EMPTY: MedicalRecordForm = {
  pet: 0,
  visit_date: '',
  diagnosis: '',
  meds: '',
  treatment_notes: '',
  weight: '',
  temperature: '',
  warnings: '',
}

const FIELDS = Object.keys(EMPTY)

function toPayload(values: MedicalRecordForm): MedicalRecordPayload {
  return {
    pet: Number(values.pet),
    visit_date: values.visit_date,
    diagnosis: values.diagnosis,
    meds: values.meds ?? '',
    treatment_notes: values.treatment_notes ?? '',
    // DecimalFields are nullable; the API rejects "" but accepts null.
    weight: values.weight === '' ? null : values.weight,
    temperature: values.temperature === '' ? null : values.temperature,
    warnings: values.warnings ?? '',
  }
}

/** Creating or editing a record requires the VET or ADMIN role on the backend. */
export function MedicalRecordFormModal({ open, record, defaultPetId, onClose }: Props) {
  const isEdit = Boolean(record)
  const createRecord = useCreateMedicalRecord()
  const updateRecord = useUpdateMedicalRecord()
  const petLookup = usePetLookup(open)
  const { notifySuccess } = useToast()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MedicalRecordForm>({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: EMPTY,
  })

  useEffect(() => {
    if (!open) return
    setFormError(null)
    reset(
      record
        ? {
            pet: record.pet,
            visit_date: record.visit_date,
            diagnosis: record.diagnosis,
            meds: record.meds ?? '',
            treatment_notes: record.treatment_notes ?? '',
            weight: record.weight ?? '',
            temperature: record.temperature ?? '',
            warnings: record.warnings ?? '',
          }
        : { ...EMPTY, pet: defaultPetId ?? 0, visit_date: today() },
    )
  }, [open, record, defaultPetId, reset])

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
    try {
      const payload = toPayload(values)
      if (record) {
        await updateRecord.mutateAsync({ id: record.id, payload })
        notifySuccess('Medical record updated')
      } else {
        await createRecord.mutateAsync(payload)
        notifySuccess('Medical record created')
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
      title={isEdit ? 'Edit medical record' : 'New medical record'}
      description="The authoring vet is recorded automatically from your account."
    >
      <form className="form" onSubmit={onSubmit} noValidate>
        {formError && <Banner tone="error">{formError}</Banner>}

        {petLookup.data?.truncated && (
          <Banner tone="warning">
            Showing the first {petLookup.data.pets.length} of {petLookup.data.total} pets.
            If the animal isn&apos;t listed, open its profile and add the record there.
          </Banner>
        )}

        <div className="form__row">
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
            label="Visit date"
            type="date"
            required
            max={today()}
            error={errors.visit_date?.message}
            {...register('visit_date')}
          />
        </div>

        <TextAreaField
          label="Diagnosis"
          required
          error={errors.diagnosis?.message}
          {...register('diagnosis')}
        />

        <div className="form__row">
          <TextField
            label="Weight (kg)"
            type="number"
            step="0.01"
            min="0"
            max="999.99"
            inputMode="decimal"
            error={errors.weight?.message}
            {...register('weight')}
          />
          <TextField
            label="Temperature (°C)"
            type="number"
            step="0.1"
            min="20"
            max="99.9"
            inputMode="decimal"
            error={errors.temperature?.message}
            {...register('temperature')}
          />
        </div>

        <TextAreaField
          label="Medication"
          hint="Drugs prescribed or administered, with dosage."
          error={errors.meds?.message}
          {...register('meds')}
        />

        <TextAreaField
          label="Treatment notes"
          error={errors.treatment_notes?.message}
          {...register('treatment_notes')}
        />

        <TextAreaField
          label="Warnings"
          hint="Anything that must be flagged at the next visit."
          error={errors.warnings?.message}
          {...register('warnings')}
        />

        <div className="form__actions">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create record'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
