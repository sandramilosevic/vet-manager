import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { TextField } from '../ui/Field'
import { Banner } from '../ui/States'
import { useCreateClinic, useUpdateClinic } from '../../hooks/queries/clinics'
import { useToast } from '../../hooks/useToast'
import { normalizeError } from '../../api/errors'
import { applyServerErrors, clinicSchema, type ClinicForm } from '../../lib/schemas'
import type { Clinic } from '../../api/types'

interface Props {
  open: boolean
  clinic?: Clinic | null
  onClose: () => void
}

const EMPTY: ClinicForm = {
  name: '',
  address: '',
  city: '',
  phone_number: '',
  email: '',
}

const FIELDS = Object.keys(EMPTY)

/** ADMIN only — the backend rejects create/update from other roles. */
export function ClinicFormModal({ open, clinic, onClose }: Props) {
  const isEdit = Boolean(clinic)
  const createClinic = useCreateClinic()
  const updateClinic = useUpdateClinic()
  const { notifySuccess } = useToast()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ClinicForm>({
    resolver: zodResolver(clinicSchema),
    defaultValues: EMPTY,
  })

  useEffect(() => {
    if (!open) return
    setFormError(null)
    reset(
      clinic
        ? {
            name: clinic.name,
            address: clinic.address,
            city: clinic.city,
            phone_number: clinic.phone_number,
            email: clinic.email,
          }
        : EMPTY,
    )
  }, [open, clinic, reset])

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      if (clinic) {
        await updateClinic.mutateAsync({ id: clinic.id, payload: values })
        notifySuccess('Location updated')
      } else {
        await createClinic.mutateAsync(values)
        notifySuccess('Location added')
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
      title={isEdit ? 'Edit location' : 'New location'}
      description="Locations belong to your practice and are visible to everyone in it."
    >
      <form className="form" onSubmit={onSubmit} noValidate>
        {formError && <Banner tone="error">{formError}</Banner>}

        <TextField
          label="Name"
          required
          error={errors.name?.message}
          {...register('name')}
        />

        <div className="form__row">
          <TextField
            label="Address"
            required
            error={errors.address?.message}
            {...register('address')}
          />
          <TextField
            label="City"
            required
            error={errors.city?.message}
            {...register('city')}
          />
        </div>

        <div className="form__row">
          <TextField
            label="Phone number"
            type="tel"
            required
            error={errors.phone_number?.message}
            {...register('phone_number')}
          />
          <TextField
            label="Email"
            type="email"
            required
            error={errors.email?.message}
            {...register('email')}
          />
        </div>

        <div className="form__actions">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Add location'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
