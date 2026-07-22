import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Badge, Card, PageHeader } from '../../components/ui/Layout'
import { Button } from '../../components/ui/Button'
import { SelectField, TextField } from '../../components/ui/Field'
import { Pagination } from '../../components/ui/Pagination'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import {
  Banner,
  EmptyState,
  ErrorState,
  LoadingState,
  TableSkeleton,
} from '../../components/ui/States'
import {
  useCreateInvitation,
  useDeactivateUser,
  useInvitations,
  useRevokeInvitation,
  useUpdateUser,
  useUsers,
} from '../../hooks/queries/staff'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { useCooldown } from '../../hooks/useCooldown'
import { normalizeError } from '../../api/errors'
import {
  applyServerErrors,
  inviteSchema,
  userEditSchema,
  type InviteForm,
  type UserEditForm,
} from '../../lib/schemas'
import {
  ROLES,
  ROLE_LABELS,
  type InvitationStatus,
  type Role,
  type User,
} from '../../api/types'
import { formatDateTime, orDash } from '../../lib/format'

const ROLE_OPTIONS = ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }))

const STATUS_TONES = {
  sent: 'accent',
  accepted: 'success',
  expired: 'neutral',
  revoked: 'danger',
} as const

export function StaffPage() {
  const { claims } = useAuth()
  const { notifySuccess, notifyError } = useToast()

  const [page, setPage] = useState(1)
  const users = useUsers(page)
  const updateUser = useUpdateUser()
  const deactivateUser = useDeactivateUser()

  const [editing, setEditing] = useState<User | null>(null)
  const [pendingDeactivate, setPendingDeactivate] = useState<User | null>(null)

  const handleDeactivate = async () => {
    if (!pendingDeactivate) return
    try {
      await deactivateUser.mutateAsync(pendingDeactivate.id)
      notifySuccess('User deactivated')
      setPendingDeactivate(null)
    } catch (error) {
      notifyError(error)
    }
  }

  const results = users.data?.results ?? []

  return (
    <>
      <PageHeader
        title="Staff & invitations"
        description="Manage who can access your practice and what they're allowed to do. Roles are enforced by the API, not just hidden here."
      />

      <div className="stack stack--loose">
        <Card title="Team members" subtitle={`${users.data?.count ?? 0} in this practice`} flush>
          {users.isError ? (
            <ErrorState error={users.error} onRetry={() => users.refetch()} />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <caption className="sr-only">Team members</caption>
                <thead>
                  <tr>
                    <th scope="col">Email</th>
                    <th scope="col">Role</th>
                    <th scope="col">User id</th>
                    <th scope="col" className="table__actions">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>

                {users.isLoading ? (
                  <TableSkeleton columns={4} />
                ) : (
                  <tbody>
                    {results.map((user) => {
                      const isSelf = claims?.user_id === user.id
                      return (
                        <tr key={user.id}>
                          <td className="table__primary">
                            {user.email}{' '}
                            {isSelf && <Badge tone="accent">You</Badge>}
                          </td>
                          <td>
                            <Badge tone={user.role === 'ADMIN' ? 'accent' : 'neutral'}>
                              {ROLE_LABELS[user.role]}
                            </Badge>
                          </td>
                          <td className="muted">#{user.id}</td>
                          <td className="table__actions">
                            <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
                              <Button size="sm" variant="ghost" onClick={() => setEditing(user)}>
                                Edit
                              </Button>
                              {/* Deactivating yourself would lock you out mid-session. */}
                              {!isSelf && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setPendingDeactivate(user)}
                                >
                                  Deactivate
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                )}
              </table>

              {!users.isLoading && results.length === 0 && (
                <EmptyState
                  icon="⚇"
                  title="No team members found"
                  description="Invite a colleague below to give them access to this practice."
                />
              )}
            </div>
          )}

          {users.data && (
            <div className="card__footer">
              <Pagination
                page={page}
                count={users.data.count}
                hasNext={Boolean(users.data.next)}
                hasPrevious={Boolean(users.data.previous)}
                onPageChange={setPage}
                busy={users.isFetching}
              />
            </div>
          )}
        </Card>

        <InvitationsSection />
      </div>

      <EditUserModal user={editing} onClose={() => setEditing(null)} mutate={updateUser} />

      <ConfirmDialog
        open={pendingDeactivate !== null}
        title="Deactivate this user?"
        description={
          <>
            <strong>{pendingDeactivate?.email}</strong> will no longer be able to sign in.
            Their account and everything they authored is kept — this is a deactivation,
            not a deletion.
          </>
        }
        confirmLabel="Deactivate"
        destructive
        loading={deactivateUser.isPending}
        onConfirm={handleDeactivate}
        onCancel={() => setPendingDeactivate(null)}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Edit user                                                           */
/* ------------------------------------------------------------------ */

function EditUserModal({
  user,
  onClose,
  mutate,
}: {
  user: User | null
  onClose: () => void
  mutate: ReturnType<typeof useUpdateUser>
}) {
  const { notifySuccess } = useToast()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UserEditForm>({
    resolver: zodResolver(userEditSchema),
    defaultValues: { email: '', role: 'VET' },
  })

  useEffect(() => {
    if (!user) return
    setFormError(null)
    reset({ email: user.email, role: user.role })
  }, [user, reset])

  const onSubmit = handleSubmit(async (values) => {
    if (!user) return
    setFormError(null)
    try {
      await mutate.mutateAsync({
        id: user.id,
        payload: { email: values.email, role: values.role as Role },
      })
      notifySuccess('User updated')
      onClose()
    } catch (error) {
      const normalized = normalizeError(error)
      const unmatched = applyServerErrors(normalized.fieldErrors, setError, [
        'email',
        'role',
      ])
      setFormError(
        unmatched[0] ??
          (Object.keys(normalized.fieldErrors).length ? null : normalized.message),
      )
    }
  })

  return (
    <Modal
      open={user !== null}
      onClose={onClose}
      title="Edit team member"
      description="Clinic assignment is fixed by the API and cannot be changed here."
    >
      <form className="form" onSubmit={onSubmit} noValidate>
        {formError && <Banner tone="error">{formError}</Banner>}

        <TextField
          label="Email"
          type="email"
          required
          error={errors.email?.message}
          {...register('email')}
        />

        <SelectField
          label="Role"
          required
          options={ROLE_OPTIONS}
          hint="Admins manage staff and clinics; vets author medical records; staff have read access."
          error={errors.role?.message}
          {...register('role')}
        />

        <div className="form__actions">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Invitations                                                         */
/* ------------------------------------------------------------------ */

function InvitationsSection() {
  const { notifySuccess } = useToast()
  const cooldown = useCooldown()
  const createInvitation = useCreateInvitation()
  const revokeInvitation = useRevokeInvitation()

  const [formError, setFormError] = useState<string | null>(null)
  const [pendingRevoke, setPendingRevoke] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<InvitationStatus | ''>('')
  const [page, setPage] = useState(1)

  const invitations = useInvitations({
    page,
    status: statusFilter || undefined,
    ordering: '-created_at',
  })
  const rows = invitations.data?.results ?? []

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'VET' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const invitation = await createInvitation.mutateAsync({
        email: values.email,
        role: values.role as Role,
      })
      notifySuccess(`Invitation emailed to ${invitation.email}`)
      reset({ email: '', role: values.role })
    } catch (error) {
      if (cooldown.handleError(error)) {
        setFormError(normalizeError(error).message)
        return
      }
      const normalized = normalizeError(error)
      const unmatched = applyServerErrors(normalized.fieldErrors, setError, [
        'email',
        'role',
      ])
      setFormError(
        unmatched[0] ??
          (Object.keys(normalized.fieldErrors).length ? null : normalized.message),
      )
    }
  })

  const handleRevoke = async () => {
    if (pendingRevoke === null) return
    try {
      await revokeInvitation.mutateAsync(pendingRevoke)
      notifySuccess('Invitation revoked')
    } catch (error) {
      setFormError(normalizeError(error).message)
    } finally {
      setPendingRevoke(null)
    }
  }

  return (
    <div className="grid grid--halves">
      <Card
        title="Invite a colleague"
        subtitle="They'll receive an email with a link that expires in 3 days."
      >
        <form className="form" onSubmit={onSubmit} noValidate>
          {formError && <Banner tone="error">{formError}</Banner>}

          <TextField
            label="Email address"
            type="email"
            required
            error={errors.email?.message}
            {...register('email')}
          />

          <SelectField
            label="Role"
            required
            options={ROLE_OPTIONS}
            error={errors.role?.message}
            {...register('role')}
          />

          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={cooldown.isCoolingDown}
          >
            {cooldown.isCoolingDown ? cooldown.label : 'Send invitation'}
          </Button>

          <p className="text-xs muted">
            Invitations are limited to 20 per day across the practice. The invite link is
            only ever sent by email — it is never shown here, so it can&apos;t leak
            through a screenshot or a shared screen.
          </p>
        </form>
      </Card>

      <Card
        title="Invitations"
        subtitle={`${invitations.data?.count ?? 0} in this practice`}
        actions={
          <select
            className="select"
            aria-label="Filter invitations by status"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as InvitationStatus | '')
              setPage(1)
            }}
            style={{ width: 'auto' }}
          >
            <option value="">All statuses</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="revoked">Revoked</option>
            <option value="expired">Expired</option>
          </select>
        }
      >
        <div className="stack stack--tight">
          {invitations.isError ? (
            <ErrorState error={invitations.error} onRetry={() => invitations.refetch()} />
          ) : invitations.isLoading ? (
            <LoadingState label="Loading invitations…" />
          ) : rows.length === 0 ? (
            <EmptyState
              icon="✉"
              title={
                statusFilter ? 'No invitations with that status' : 'No invitations yet'
              }
              description="Invitations you send are listed here so you can track and revoke them."
            />
          ) : (
            <>
              <ul className="stack stack--tight">
                {rows.map((invitation) => (
                  <li
                    key={invitation.id}
                    className="row row--between"
                    style={{
                      padding: 'var(--space-3)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                    }}
                  >
                    <span>
                      <span style={{ display: 'block' }}>{invitation.email}</span>
                      <span className="text-xs muted">
                        {ROLE_LABELS[invitation.role]} · invited by{' '}
                        {orDash(invitation.invited_by_email)} · expires{' '}
                        {formatDateTime(invitation.expires_at)}
                      </span>
                    </span>
                    <span className="row">
                      {/* `status` stays "sent" past the expiry date — the
                          backend's is_expired flag is what tells them apart. */}
                      {invitation.status === 'sent' && invitation.is_expired ? (
                        <Badge tone="neutral">expired</Badge>
                      ) : (
                        <Badge tone={STATUS_TONES[invitation.status]}>
                          {invitation.status}
                        </Badge>
                      )}
                      {invitation.status === 'sent' && !invitation.is_expired && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPendingRevoke(invitation.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              {invitations.data && (
                <Pagination
                  page={page}
                  count={invitations.data.count}
                  hasNext={Boolean(invitations.data.next)}
                  hasPrevious={Boolean(invitations.data.previous)}
                  onPageChange={setPage}
                  busy={invitations.isFetching}
                />
              )}
            </>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={pendingRevoke !== null}
        title="Revoke this invitation?"
        description="The emailed link stops working immediately. You can send a fresh invitation afterwards."
        confirmLabel="Revoke"
        destructive
        loading={revokeInvitation.isPending}
        onConfirm={handleRevoke}
        onCancel={() => setPendingRevoke(null)}
      />
    </div>
  )
}
