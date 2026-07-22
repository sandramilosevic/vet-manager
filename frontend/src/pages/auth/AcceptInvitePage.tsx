import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AuthLayout } from './AuthLayout'
import { PasswordFields } from './PasswordFields'
import { Button } from '../../components/ui/Button'
import { Banner } from '../../components/ui/States'
import { useCooldown } from '../../hooks/useCooldown'
import { authApi } from '../../api/resources'
import { normalizeError } from '../../api/errors'
import { setPasswordSchema, type SetPasswordForm } from '../../lib/schemas'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Route: `/invite/:token` — matches the link the backend emails
 * (`services._send_invitation_email`).
 *
 * The invite token is the only credential here, so it is used once and never
 * persisted, logged, or shown on screen.
 */
export function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const cooldown = useCooldown()
  const [done, setDone] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordForm>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    if (!token) return
    setFormError(null)
    try {
      await authApi.acceptInvitation(token, values.password)
      setDone(true)
      window.setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (error) {
      if (cooldown.handleError(error)) {
        setFormError(normalizeError(error).message)
        return
      }
      setFormError(normalizeError(error).message)
    }
  })

  if (!token || !UUID_PATTERN.test(token)) {
    return (
      <AuthLayout
        title="Invalid invitation link"
        footer={<Link to="/login">Back to sign in</Link>}
      >
        <Banner tone="error">
          This invitation link doesn&apos;t look right. Ask the administrator who invited
          you to send a new one.
        </Banner>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Accept your invitation"
      subtitle={
        done
          ? undefined
          : 'Choose a password to activate your account. Your username will be the email address the invitation was sent to.'
      }
      footer={<Link to="/login">Already have an account? Sign in</Link>}
    >
      {done ? (
        <Banner tone="success">
          Your account is ready. Taking you to the sign-in page…
        </Banner>
      ) : (
        <form className="form" onSubmit={onSubmit} noValidate>
          {formError && <Banner tone="error">{formError}</Banner>}

          <PasswordFields register={register} errors={errors} value={watch('password')} />

          <Button
            type="submit"
            variant="primary"
            block
            loading={isSubmitting}
            disabled={cooldown.isCoolingDown}
          >
            {cooldown.isCoolingDown ? cooldown.label : 'Create my account'}
          </Button>

          <p className="text-xs muted" style={{ textAlign: 'center' }}>
            Invitations expire 3 days after they are sent and can only be used once.
          </p>
        </form>
      )}
    </AuthLayout>
  )
}
