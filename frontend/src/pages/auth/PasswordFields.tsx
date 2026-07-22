import type { UseFormRegister, FieldErrors } from 'react-hook-form'
import { TextField } from '../../components/ui/Field'
import { passwordStrength, type SetPasswordForm } from '../../lib/schemas'

interface PasswordFieldsProps {
  register: UseFormRegister<SetPasswordForm>
  errors: FieldErrors<SetPasswordForm>
  /** Watched value — used only for the local strength meter. */
  value: string
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Strong'] as const
const STRENGTH_CLASSES = ['', 'weak', 'fair', 'strong'] as const

/** Shared by the invite-accept and password-reset flows. */
export function PasswordFields({ register, errors, value }: PasswordFieldsProps) {
  const strength = passwordStrength(value)

  return (
    <>
      <div>
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          hint="At least 8 characters, and not all numbers."
          error={errors.password?.message}
          {...register('password')}
        />
        {/* Computed locally; the password is never sent anywhere for scoring. */}
        <div className="meter" aria-hidden="true">
          {[1, 2, 3].map((segment) => (
            <span
              key={segment}
              className={`meter__seg ${
                strength >= segment ? `meter__seg--${STRENGTH_CLASSES[strength]}` : ''
              }`}
            />
          ))}
        </div>
        {strength > 0 && (
          <span className="field__hint" aria-live="polite">
            Strength: {STRENGTH_LABELS[strength]}
          </span>
        )}
      </div>

      <TextField
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        required
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
    </>
  )
}
