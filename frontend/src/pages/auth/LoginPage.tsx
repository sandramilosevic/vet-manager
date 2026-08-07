import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AuthLayout } from './AuthLayout'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Field'
import { Banner } from '../../components/ui/States'
import { useAuth } from '../../hooks/useAuth'
import { useCooldown } from '../../hooks/useCooldown'
import { normalizeError } from '../../api/errors'
import { loginSchema, type LoginForm } from '../../lib/schemas'

interface LocationState {
  from?: { pathname: string }
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const cooldown = useCooldown()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? '/'

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await login(values)
      navigate(redirectTo, { replace: true })
    } catch (error) {
      if (cooldown.handleError(error)) {
        setFormError(normalizeError(error).message)
        return
      }
      const normalized = normalizeError(error)
      setFormError(
        normalized.status === 401
          ? 'Incorrect username or password.'
          : normalized.message,
      )
    }
  })

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Enter your credentials to access your practice."
      footer={
        <>
          Joining a practice? Use the invitation link that was emailed to you — there is
          no public sign-up.
        </>
      }
    >
      <form className="form" onSubmit={onSubmit} noValidate>
        {formError && <Banner tone="error">{formError}</Banner>}

        <TextField
          label="Username"
          hint="Usually the email address your invitation was sent to."
          autoComplete="username"
          autoFocus
          required
          error={errors.username?.message}
          data-cy="login-username"
          {...register('username')}
        />

        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          error={errors.password?.message}
          data-cy="login-password"
          {...register('password')}
        />

        <Button
          type="submit"
          variant="primary"
          block
          loading={isSubmitting}
          disabled={cooldown.isCoolingDown}
          data-cy="login-submit"
        >
          {cooldown.isCoolingDown ? cooldown.label : 'Sign in'}
        </Button>

        <p className="text-sm" style={{ textAlign: 'center' }}>
          <Link to="/forgot-password" data-cy="forgot-password-link">
            Forgot your password?
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}