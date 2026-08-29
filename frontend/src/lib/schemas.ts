/**
 * Client-side form schemas.
 *
 * These mirror the backend's model constraints (max_length, required, choices)
 * so users get instant feedback instead of a round-trip. They are a UX layer
 * only — the backend re-validates everything, and any error it returns is
 * surfaced on the offending field (see `applyServerErrors`).
 */

import { z } from 'zod'
import { GENDERS, ROLES, SPECIES } from '../api/types'

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`)

const optionalText = (max: number) => z.string().trim().max(max).or(z.literal(''))

/** Django's EmailValidator is stricter than most; this catches the obvious cases. */
const email = z.string().trim().email('Enter a valid email address')

/**
 * Matches Django's default AUTH_PASSWORD_VALIDATORS: at least 8 characters,
 * not entirely numeric. "Too common" and "too similar to your username" can
 * only be judged server-side, so those come back as backend errors.
 */
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be 128 characters or fewer')
  .refine((value) => !/^\d+$/.test(value), 'Password cannot be entirely numeric')

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date')

const optionalIsoDate = isoDate.or(z.literal(''))

/* ------------------------------------------------------------------ */
/* auth                                                                */
/* ------------------------------------------------------------------ */

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})
export type LoginForm = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({ email })
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

export const setPasswordSchema = z
  .object({
    password,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
export type SetPasswordForm = z.infer<typeof setPasswordSchema>

/* ------------------------------------------------------------------ */
/* owners                                                              */
/* ------------------------------------------------------------------ */

export const ownerSchema = z.object({
  first_name: requiredText('First name', 100),
  last_name: requiredText('Last name', 100),
  phone_number: requiredText('Phone number', 20),
  // Optional on the model (blank=True), but must be valid when provided.
  email: email.or(z.literal('')),
  address: optionalText(100),
})
export type OwnerForm = z.infer<typeof ownerSchema>

/* ------------------------------------------------------------------ */
/* pets                                                                */
/* ------------------------------------------------------------------ */

const currentYear = new Date().getFullYear()

export const petSchema = z
  .object({
    owner: z.coerce.number({ invalid_type_error: 'Select an owner' }).int().positive('Select an owner'),
    name: requiredText('Name', 100),
    species: z.enum(SPECIES as [string, ...string[]], {
      errorMap: () => ({ message: 'Select a species' }),
    }),
    gender: z.enum(GENDERS as [string, ...string[]], {
      errorMap: () => ({ message: 'Select a gender' }),
    }),
    breed: optionalText(100),
    date_of_birth: optionalIsoDate,
    birth_year: z
      .union([z.literal(''), z.coerce.number().int()])
      .refine(
        (value) => value === '' || (value >= 1900 && value <= currentYear),
        `Birth year must be between 1900 and ${currentYear}`,
      ),
    description: z.string().max(2000).or(z.literal('')),
    allergies: z.string().max(2000).or(z.literal('')),
    diet: optionalText(200),
  })
  .superRefine((data, ctx) => {
    // A pet cannot be born in the future.
    if (data.date_of_birth && data.date_of_birth > new Date().toISOString().slice(0, 10)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date_of_birth'],
        message: 'Date of birth cannot be in the future',
      })
    }
    // Mirrors Pet.clean() and PetSerializer.validate() on the backend.
    if (data.date_of_birth && data.birth_year !== '') {
      const yearFromDate = Number(data.date_of_birth.slice(0, 4))
      if (yearFromDate !== Number(data.birth_year)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['birth_year'],
          message: 'Birth year must match the year in date of birth',
        })
      }
    }
  })
export type PetForm = z.infer<typeof petSchema>

/* ------------------------------------------------------------------ */
/* vaccinations                                                        */
/* ------------------------------------------------------------------ */

export const vaccinationSchema = z
  .object({
    pet: z.coerce.number({ invalid_type_error: 'Select a pet' }).int().positive('Select a pet'),
    vaccine_name: requiredText('Vaccine name', 100),
    date_given: isoDate,
    next_due: isoDate,
  })
  .superRefine((data, ctx) => {
    if (data.date_given > new Date().toISOString().slice(0, 10)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date_given'],
        message: 'Date given cannot be in the future',
      })
    }
    if (data.next_due <= data.date_given) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['next_due'],
        message: 'Next due date must be after the date given',
      })
    }
  })
export type VaccinationForm = z.infer<typeof vaccinationSchema>

/* ------------------------------------------------------------------ */
/* medical records                                                     */
/* ------------------------------------------------------------------ */

export const medicalRecordSchema = z.object({
  pet: z.coerce.number({ invalid_type_error: 'Select a pet' }).int().positive('Select a pet'),
  visit_date: isoDate.refine(
    (value) => value <= new Date().toISOString().slice(0, 10),
    'Visit date cannot be in the future',
  ),
  diagnosis: z.string().trim().min(1, 'Diagnosis is required').max(5000),
  meds: z.string().max(5000).or(z.literal('')),
  treatment_notes: z.string().max(5000).or(z.literal('')),
  // Kept as strings because `<input type="number">` yields strings and the API
  // serialises DecimalField as a string too. Bounds mirror the model:
  // weight is DecimalField(max_digits=5, decimal_places=2) -> up to 999.99.
  weight: z
    .string()
    .refine(
      (value) => value === '' || (Number(value) > 0 && Number(value) <= 999.99),
      'Weight must be between 0 and 999.99 kg',
    ),
  // temperature is DecimalField(max_digits=3, decimal_places=1) -> up to 99.9.
  temperature: z
    .string()
    .refine(
      (value) => value === '' || (Number(value) >= 20 && Number(value) <= 99.9),
      'Temperature must be between 20 and 99.9 °C',
    ),
  warnings: z.string().max(2000).or(z.literal('')),
})
export type MedicalRecordForm = z.infer<typeof medicalRecordSchema>

/* ------------------------------------------------------------------ */
/* clinics & staff                                                     */
/* ------------------------------------------------------------------ */

export const clinicSchema = z.object({
  name: requiredText('Name', 100),
  address: requiredText('Address', 100),
  city: requiredText('City', 100),
  phone_number: requiredText('Phone number', 20),
  email: email.max(254),
})
export type ClinicForm = z.infer<typeof clinicSchema>

export const clinicGroupSchema = z.object({
  name: requiredText('Practice name', 100),
})
export type ClinicGroupForm = z.infer<typeof clinicGroupSchema>

export const inviteSchema = z.object({
  email: email.max(254),
  role: z.enum(ROLES as [string, ...string[]], {
    errorMap: () => ({ message: 'Select a role' }),
  }),
})
export type InviteForm = z.infer<typeof inviteSchema>

export const userEditSchema = z.object({
  email: email.max(254),
  role: z.enum(ROLES as [string, ...string[]], {
    errorMap: () => ({ message: 'Select a role' }),
  }),
})
export type UserEditForm = z.infer<typeof userEditSchema>

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Pushes backend field errors onto the matching react-hook-form fields.
 * The backend is the source of truth: rules we can't express client-side
 * (uniqueness, password commonness, cross-clinic scoping) only surface here.
 */
export function applyServerErrors(
  fieldErrors: Record<string, string>,
  setError: (name: never, error: { type: string; message: string }) => void,
  knownFields: string[],
): string[] {
  const unmatched: string[] = []

  for (const [field, message] of Object.entries(fieldErrors)) {
    if (knownFields.includes(field)) {
      setError(field as never, { type: 'server', message })
    } else {
      unmatched.push(message)
    }
  }

  return unmatched
}

/** Rough strength signal for new-password fields. Never sent anywhere. */
export function passwordStrength(value: string): 0 | 1 | 2 | 3 {
  if (!value) return 0
  let score = 0
  if (value.length >= 8) score += 1
  if (value.length >= 12) score += 1
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1
  if (/\d/.test(value) && /[^\w\s]/.test(value)) score += 1
  if (/^\d+$/.test(value)) return 1
  return Math.min(3, score) as 0 | 1 | 2 | 3
}
