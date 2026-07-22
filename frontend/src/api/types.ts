/**
 * Types mirroring the Django REST API contract.
 *
 * These are hand-written from the backend's OpenAPI schema (`schema.yaml`,
 * served at `/api/docs/`) and its serializers — field names, nullability and
 * read-only-ness match the backend exactly. If the backend contract changes,
 * this file is the single place to update.
 */

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

/** DRF PageNumberPagination envelope. Backend PAGE_SIZE is 15. */
export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export const PAGE_SIZE = 15

export type Role = 'ADMIN' | 'VET' | 'STAFF'

export const ROLES: Role[] = ['ADMIN', 'VET', 'STAFF']

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  VET: 'Vet',
  STAFF: 'Staff',
}

export type InvitationStatus = 'sent' | 'accepted' | 'expired' | 'revoked'

export type Species = 'dog' | 'cat' | 'rabbit' | 'bird' | 'hamster' | 'other'

export const SPECIES: Species[] = ['dog', 'cat', 'rabbit', 'bird', 'hamster', 'other']

export const SPECIES_LABELS: Record<Species, string> = {
  dog: 'Dog',
  cat: 'Cat',
  rabbit: 'Rabbit',
  bird: 'Bird',
  hamster: 'Hamster',
  other: 'Other',
}

export type Gender = 'female' | 'male'

export const GENDERS: Gender[] = ['female', 'male']

export const GENDER_LABELS: Record<Gender, string> = {
  female: 'Female',
  male: 'Male',
}

/* ------------------------------------------------------------------ */
/* auth                                                                */
/* ------------------------------------------------------------------ */

export interface LoginPayload {
  /**
   * The backend authenticates on `username`, not `email` (SimpleJWT default
   * USERNAME_FIELD). For users created through an invitation the backend sets
   * `username = email`, so in practice an email works — but the field is
   * genuinely `username`.
   */
  username: string
  password: string
}

export interface TokenPair {
  access: string
  refresh: string
}

/** Custom claims added by `MyTokenObtainPairSerializer` on the backend. */
export interface AccessTokenClaims {
  user_id: number
  role: Role
  clinic_id: string | null
  email: string
  exp: number
  iat: number
}

/* ------------------------------------------------------------------ */
/* accounts                                                            */
/* ------------------------------------------------------------------ */

export interface User {
  id: number
  /** ClinicGroup id. Read-only — cannot be changed through the API. */
  clinic: number | null
  email: string
  role: Role
}

/** `GET /accounts/me/` — the authoritative answer to "who am I?". */
export interface Me {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: Role
  clinic: number | null
  clinic_name: string | null
}

export type UserUpdatePayload = Partial<Pick<User, 'email' | 'role'>>

/**
 * Response returned when an invitation is created. Deliberately excludes
 * `token` — the backend only ever sends the token by email so it cannot leak
 * through logs, proxies or dev tools.
 */
export interface Invitation {
  id: number
  email: string
  clinic_name: string
  role: Role
  status: InvitationStatus
  /** `status` stays "sent" past the expiry date; this is what distinguishes them. */
  is_expired: boolean
  invited_by: number | null
  invited_by_email: string | null
  created_at: string
  expires_at: string
}

export interface InvitationCreatePayload {
  email: string
  role: Role
}

export interface InvitationFilters {
  email__icontains?: string
  status?: InvitationStatus
  role?: Role
  /** Only invitations that are still usable (sent and not yet expired). */
  pending?: boolean
  ordering?: string
  page?: number
}

/* ------------------------------------------------------------------ */
/* clinics                                                             */
/* ------------------------------------------------------------------ */

/** The tenant itself — the practice/franchise the logged-in user belongs to. */
export interface ClinicGroup {
  id: number
  name: string
}

/** A single physical clinic location inside the tenant. */
export interface Clinic {
  id: number
  /** ClinicGroup id — read-only, set server-side from the caller's tenant. */
  group: number
  name: string
  address: string
  city: string
  phone_number: string
  email: string
}

export type ClinicPayload = Omit<Clinic, 'id' | 'group'>

export interface ClinicFilters {
  name__icontains?: string
  city__icontains?: string
  page?: number
}

/* ------------------------------------------------------------------ */
/* owners                                                              */
/* ------------------------------------------------------------------ */

export interface Owner {
  id: number
  first_name: string
  last_name: string
  phone_number: string
  /** Read-only, `auto_now_add` on the backend. */
  registration_date: string
  email: string
  address: string
}

export type OwnerPayload = Omit<Owner, 'id' | 'registration_date'>

export interface OwnerFilters {
  first_name__icontains?: string
  last_name__icontains?: string
  email__icontains?: string
  /** One of: first_name, last_name, registration_date (prefix `-` to reverse). */
  ordering?: string
  page?: number
}

/* ------------------------------------------------------------------ */
/* pets                                                                */
/* ------------------------------------------------------------------ */

export interface Pet {
  id: number
  /** Owner id. The backend scopes valid choices to the caller's clinic. */
  owner: number
  /** Read-only "First Last", so tables don't need a separate owner fetch. */
  owner_name: string
  name: string
  species: Species
  gender: Gender
  breed: string
  date_of_birth: string | null
  birth_year: number | null
  description: string
  allergies: string
  diet: string
}

export type PetPayload = Omit<Pet, 'id' | 'owner_name'>

export interface PetFilters {
  owner?: number
  owner__last_name__icontains?: string
  ordering?: string
  name__icontains?: string
  species?: Species
  species__icontains?: string
  gender?: Gender
  breed__icontains?: string
  date_of_birth?: string
  date_of_birth__gte?: string
  date_of_birth__lte?: string
  birth_year?: number
  birth_year__gte?: number
  birth_year__lte?: number
  page?: number
}

/* ------------------------------------------------------------------ */
/* vaccinations                                                        */
/* ------------------------------------------------------------------ */

export interface Vaccination {
  id: number
  pet: number
  /** Read-only, resolved server-side. */
  pet_name: string
  vaccine_name: string
  date_given: string
  next_due: string
}

export type VaccinationPayload = Omit<Vaccination, 'id' | 'pet_name'>

export interface VaccinationFilters {
  pet?: number
  pet__name__icontains?: string
  vaccine_name__icontains?: string
  date_given?: string
  date_given__gte?: string
  date_given__lte?: string
  next_due?: string
  next_due__gte?: string
  next_due__lte?: string
  ordering?: string
  page?: number
}

/* ------------------------------------------------------------------ */
/* medical records                                                     */
/* ------------------------------------------------------------------ */

export interface MedicalRecord {
  id: number
  pet: number
  pet_name: string
  visit_date: string
  diagnosis: string
  meds: string
  treatment_notes: string
  /** DRF serialises DecimalField as a string. */
  weight: string | null
  temperature: string | null
  warnings: string
  /** Authoring vet — read-only, set server-side from the request user. */
  vet: number | null
  vet_email: string | null
  created_at: string
  updated_at: string
}

export type MedicalRecordPayload = Omit<
  MedicalRecord,
  'id' | 'pet_name' | 'vet' | 'vet_email' | 'created_at' | 'updated_at'
>

export interface MedicalRecordFilters {
  pet?: number
  pet__name__icontains?: string
  vet?: number
  visit_date?: string
  visit_date__gte?: string
  visit_date__lte?: string
  /** `visit_date` or `-visit_date`. */
  ordering?: string
  page?: number
}

/* ------------------------------------------------------------------ */
/* history (django-simple-history audit trail)                         */
/* ------------------------------------------------------------------ */

/** `+` created · `~` updated · `-` deleted */
export type HistoryType = '+' | '~' | '-'

/** Metadata every history row carries, plus a snapshot of the tracked fields. */
export interface HistoryEntry<T> {
  history_id: number
  history_date: string
  history_type: HistoryType
  history_type_label: string
  /** Email of whoever made the change, when the request was authenticated. */
  history_user: string | null
  snapshot: T
}

/** Raw row as it comes off the wire: metadata and snapshot fields are flat. */
export type HistoryRow<T> = Omit<HistoryEntry<T>, 'snapshot'> & T
