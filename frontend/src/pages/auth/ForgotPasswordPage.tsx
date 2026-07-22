import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AuthLayout } from './AuthLayout'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Field'
import { Banner } from '../../components/ui/States'
import { useCooldown } from '../../hooks/useCooldown'
import { authApi } from '../../api/resources'
import { normalizeError } from '../../api/errors'
import { forgotPasswordSchema, type ForgotPasswordForm } from '../../lib/schemas'

export function ForgotPasswordPage() {
  const cooldown = useCooldown()
  const [sent, setSent] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await authApi.requestPasswordReset(values.email)
      // The backend answers identically whether or not the address exists, so
      // the UI must not imply anything about whether it did.
      setSent(true)
    } catch (error) {
      if (cooldown.handleError(error)) {
        setFormError(normalizeError(error).message)
        return
      }
      setFormError(normalizeError(error).message)
    }
  })

  return (
    <AuthLayout
      title="Reset your password"
      subtitle={
        sent
          ? undefined
          : 'We’ll email you a link to choose a new password. The link expires after a short time.'
      }
      footer={<Link to="/login">Back to sign in</Link>}
    >
      {sent ? (
        <div className="stack">
          <Banner tone="success">
            If an account exists for that email, a reset link is on its way. Check your
            inbox — and your spam folder.
          </Banner>
          <p className="text-sm secondary-text">
            Didn&apos;t get anything? This endpoint is limited to 5 requests per hour, so
            wait a little before trying again.
          </p>
        </div>
      ) : (
        <form className="form" onSubmit={onSubmit} noValidate>
          {formError && <Banner tone="error">{formError}</Banner>}

          <TextField
            label="Email address"
            type="email"
            autoComplete="email"
            autoFocus
            required
            error={errors.email?.message}
            {...register('email')}
          />

          <Button
            type="submit"
            variant="primary"
            block
            loading={isSubmitting}
            disabled={cooldown.isCoolingDown}
          >
            {cooldown.isCoolingDown ? cooldown.label : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
