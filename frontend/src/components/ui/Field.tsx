import { useId } from 'react'
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

interface BaseProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  /** Hide the visual label but keep it for assistive tech. */
  hideLabel?: boolean
}

function FieldShell({
  label,
  error,
  hint,
  required,
  hideLabel,
  id,
  children,
}: BaseProps & { id: string; children: ReactNode }) {
  return (
    <div className="field">
      <label className={hideLabel ? 'sr-only' : 'field__label'} htmlFor={id}>
        {label}
        {required && (
          <span className="field__required" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <span className="field__hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {/* role=alert so screen readers announce validation failures immediately */}
      {error && (
        <span className="field__error" id={`${id}-error`} role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

function describedBy(id: string, error?: string, hint?: string): string | undefined {
  if (error) return `${id}-error`
  if (hint) return `${id}-hint`
  return undefined
}

/* ------------------------------------------------------------------ */

type TextFieldProps = BaseProps & InputHTMLAttributes<HTMLInputElement>

export function TextField({
  label,
  error,
  hint,
  required,
  hideLabel,
  className = '',
  id: providedId,
  ...rest
}: TextFieldProps) {
  const generatedId = useId()
  const id = providedId ?? generatedId

  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint}
      required={required}
      hideLabel={hideLabel}
      id={id}
    >
      <input
        id={id}
        className={`input ${error ? 'input--invalid' : ''} ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        aria-required={required || undefined}
        {...rest}
      />
    </FieldShell>
  )
}

/* ------------------------------------------------------------------ */

export interface SelectOption {
  value: string
  label: string
}

type SelectFieldProps = BaseProps &
  SelectHTMLAttributes<HTMLSelectElement> & {
    options: SelectOption[]
    placeholder?: string
  }

export function SelectField({
  label,
  error,
  hint,
  required,
  hideLabel,
  options,
  placeholder,
  className = '',
  id: providedId,
  ...rest
}: SelectFieldProps) {
  const generatedId = useId()
  const id = providedId ?? generatedId

  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint}
      required={required}
      hideLabel={hideLabel}
      id={id}
    >
      <select
        id={id}
        className={`select ${error ? 'select--invalid' : ''} ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        aria-required={required || undefined}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

/* ------------------------------------------------------------------ */

type TextAreaFieldProps = BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>

export function TextAreaField({
  label,
  error,
  hint,
  required,
  hideLabel,
  className = '',
  id: providedId,
  ...rest
}: TextAreaFieldProps) {
  const generatedId = useId()
  const id = providedId ?? generatedId

  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint}
      required={required}
      hideLabel={hideLabel}
      id={id}
    >
      <textarea
        id={id}
        className={`textarea ${error ? 'textarea--invalid' : ''} ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        aria-required={required || undefined}
        {...rest}
      />
    </FieldShell>
  )
}
