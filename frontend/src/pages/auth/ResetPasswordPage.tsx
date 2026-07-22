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

/**
 * Route: `/reset-password/:uid/:token` — the exact shape the backend builds
 * into its emails (`services.request_password_reset`).
 */
export function ResetPasswordPage() {
  const { uid, token } = useParams<{ uid: string; token: string }>()
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
    if (!uid || !token) return
    setFormError(null)
    try {
      await authApi.confirmPasswordReset(uid, token, values.password)
      setDone(true)
      // Give the confirmation a moment to be read, then move to sign-in.
      window.setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (error) {
      if (cooldown.handleError(error)) {
        setFormError(normalizeError(error).message)
        return
      }
      // The backend returns one generic message for expired/invalid/unknown
      // links, plus specific messages for weak passwords. Both are safe to show.
      setFormError(normalizeError(error).message)
    }
  })

  if (!uid || !token) {
    return (
      <AuthLayout title="Invalid reset link" footer={<Link to="/login">Back to sign in</Link>}>
        <Banner tone="error">
          This link is missing information. Request a new one from the sign-in page.
        </Banner>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle={done ? undefined : 'This link can only be used once.'}
      footer={<Link to="/login">Back to sign in</Link>}
    >
      {done ? (
        <Banner tone="success">
          Your password has been reset. Taking you to the sign-in page…
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
            {cooldown.isCoolingDown ? cooldown.label : 'Set new password'}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
