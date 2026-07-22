import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { TextField } from '../ui/Field'
import { Banner } from '../ui/States'
import { useCreateOwner, useUpdateOwner } from '../../hooks/queries/owners'
import { useToast } from '../../hooks/useToast'
import { normalizeError } from '../../api/errors'
import { applyServerErrors, ownerSchema, type OwnerForm } from '../../lib/schemas'
import type { Owner } from '../../api/types'

interface Props {
  open: boolean
  /** Present when editing; omit to create. */
  owner?: Owner | null
  onClose: () => void
  onCreated?: (owner: Owner) => void
}

const EMPTY: OwnerForm = {
  first_name: '',
  last_name: '',
  phone_number: '',
  email: '',
  address: '',
}

const FIELDS = Object.keys(EMPTY)

export function OwnerFormModal({ open, owner, onClose, onCreated }: Props) {
  const isEdit = Boolean(owner)
  const createOwner = useCreateOwner()
  const updateOwner = useUpdateOwner()
  const { notifySuccess } = useToast()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OwnerForm>({
    resolver: zodResolver(ownerSchema),
    defaultValues: EMPTY,
  })

  // Re-seed the form each time the dialog opens so a cancelled edit doesn't
  // leak its values into the next one.
  useEffect(() => {
    if (!open) return
    setFormError(null)
    reset(
      owner
        ? {
            first_name: owner.first_name,
            last_name: owner.last_name,
            phone_number: owner.phone_number,
            email: owner.email ?? '',
            address: owner.address ?? '',
          }
        : EMPTY,
    )
  }, [open, owner, reset])

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      if (owner) {
        await updateOwner.mutateAsync({ id: owner.id, payload: values })
        notifySuccess('Owner updated')
      } else {
        const created = await createOwner.mutateAsync(values)
        notifySuccess('Owner added')
        onCreated?.(created)
      }
      onClose()
    } catch (error) {
      // The backend is the real validator — e.g. it enforces email uniqueness
      // per clinic, which the client cannot know about.
      const normalized = normalizeError(error)
      const unmatched = applyServerErrors(normalized.fieldErrors, setError, FIELDS)
      setFormError(unmatched[0] ?? (Object.keys(normalized.fieldErrors).length ? null : normalized.message))
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit owner' : 'New owner'}
      description={
        isEdit
          ? 'Update this owner’s contact details.'
          : 'Add a pet owner to your practice. You can register their pets next.'
      }
    >
      <form className="form" onSubmit={onSubmit} noValidate>
        {formError && <Banner tone="error">{formError}</Banner>}

        <div className="form__row">
          <TextField
            label="First name"
            required
            autoComplete="given-name"
            error={errors.first_name?.message}
            {...register('first_name')}
          />
          <TextField
            label="Last name"
            required
            autoComplete="family-name"
            error={errors.last_name?.message}
            {...register('last_name')}
          />
        </div>

        <div className="form__row">
          <TextField
            label="Phone number"
            required
            type="tel"
            autoComplete="tel"
            error={errors.phone_number?.message}
            {...register('phone_number')}
          />
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            hint="Optional, but must be unique within your practice."
            error={errors.email?.message}
            {...register('email')}
          />
        </div>

        <TextField
          label="Address"
          autoComplete="street-address"
          error={errors.address?.message}
          {...register('address')}
        />

        <div className="form__actions">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Add owner'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
