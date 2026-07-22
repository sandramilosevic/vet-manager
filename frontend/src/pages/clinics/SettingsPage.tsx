import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, DetailList, PageHeader } from '../../components/ui/Layout'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Field'
import { Banner, ErrorState, LoadingState } from '../../components/ui/States'
import { useClinicGroup, useUpdateClinicGroup } from '../../hooks/queries/clinics'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { normalizeError } from '../../api/errors'
import { applyServerErrors, clinicGroupSchema, type ClinicGroupForm } from '../../lib/schemas'
import { ROLE_LABELS } from '../../api/types'
import { API_BASE_URL } from '../../lib/env'

export function SettingsPage() {
  const { can, email, role, claims } = useAuth()
  const { notifySuccess } = useToast()
  const group = useClinicGroup()
  const updateGroup = useUpdateClinicGroup()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ClinicGroupForm>({
    resolver: zodResolver(clinicGroupSchema),
    defaultValues: { name: '' },
  })

  useEffect(() => {
    if (group.data) reset({ name: group.data.name })
  }, [group.data, reset])

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await updateGroup.mutateAsync(values)
      notifySuccess('Practice name updated')
      reset(values)
    } catch (error) {
      const normalized = normalizeError(error)
      const unmatched = applyServerErrors(normalized.fieldErrors, setError, ['name'])
      setFormError(
        unmatched[0] ??
          (Object.keys(normalized.fieldErrors).length ? null : normalized.message),
      )
    }
  })

  return (
    <>
      <PageHeader
        title="Practice settings"
        description="Your practice is the tenant that owns every clinic, owner, pet and record you can see."
      />

      <div className="grid grid--halves">
        <Card title="Practice">
          {group.isLoading ? (
            <LoadingState label="Loading practice…" />
          ) : group.isError ? (
            <ErrorState
              error={group.error}
              onRetry={() => group.refetch()}
              title="No practice found"
            />
          ) : group.data ? (
            can.editClinicGroup ? (
              <form className="form" onSubmit={onSubmit} noValidate>
                {formError && <Banner tone="error">{formError}</Banner>}
                <TextField
                  label="Practice name"
                  required
                  hint="Shown in the header and on every invitation email."
                  error={errors.name?.message}
                  {...register('name')}
                />
                <div className="form__actions">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={isSubmitting}
                    disabled={!isDirty}
                  >
                    Save changes
                  </Button>
                </div>
              </form>
            ) : (
              <div className="stack">
                <DetailList
                  items={[
                    { label: 'Practice name', value: group.data.name },
                    { label: 'Practice id', value: `#${group.data.id}` },
                  ]}
                />
                <Banner tone="info">
                  Only administrators can rename the practice.
                </Banner>
              </div>
            )
          ) : null}
        </Card>

        <Card title="Your account">
          <div className="stack">
            <DetailList
              items={[
                { label: 'Email', value: email ?? '—' },
                { label: 'Role', value: role ? ROLE_LABELS[role] : '—' },
                { label: 'User id', value: claims ? `#${claims.user_id}` : '—' },
                {
                  label: 'Session',
                  value:
                    'Access tokens last 15 minutes and refresh automatically in the background.',
                },
              ]}
            />
            <Banner tone="info">
              To change your password, sign out and use “Forgot your password?” on the
              sign-in screen — the API has no in-app password change endpoint.
            </Banner>
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Connection" subtitle="Where this app is pointed">
          <DetailList
            items={[
              { label: 'API base URL', value: <code>{API_BASE_URL}</code> },
              { label: 'API version', value: 'v1' },
              {
                label: 'API documentation',
                value: (
                  <a
                    href={`${API_BASE_URL}/api/docs/`}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Open Swagger UI
                  </a>
                ),
              },
            ]}
          />
        </Card>
      </div>
    </>
  )
}
