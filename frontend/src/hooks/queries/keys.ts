import type {
  ClinicFilters,
  InvitationFilters,
  MedicalRecordFilters,
  OwnerFilters,
  PetFilters,
  VaccinationFilters,
} from '../../api/types'

/**
 * Central query-key factory. Every cache entry is derived from here so that
 * invalidation after a mutation is exact rather than guesswork.
 */
export const queryKeys = {
  clinicGroup: ['clinic-group'] as const,

  clinics: {
    all: ['clinics'] as const,
    list: (filters: ClinicFilters) => ['clinics', 'list', filters] as const,
    detail: (id: number) => ['clinics', 'detail', id] as const,
  },

  owners: {
    all: ['owners'] as const,
    list: (filters: OwnerFilters) => ['owners', 'list', filters] as const,
    detail: (id: number) => ['owners', 'detail', id] as const,
  },

  pets: {
    all: ['pets'] as const,
    list: (filters: PetFilters) => ['pets', 'list', filters] as const,
    detail: (id: number) => ['pets', 'detail', id] as const,
  },

  vaccinations: {
    all: ['vaccinations'] as const,
    list: (filters: VaccinationFilters) => ['vaccinations', 'list', filters] as const,
    detail: (id: number) => ['vaccinations', 'detail', id] as const,
  },

  medicalRecords: {
    all: ['medical-records'] as const,
    list: (filters: MedicalRecordFilters) => ['medical-records', 'list', filters] as const,
    detail: (id: number) => ['medical-records', 'detail', id] as const,
  },

  users: {
    all: ['users'] as const,
    list: (page: number) => ['users', 'list', page] as const,
    detail: (id: number) => ['users', 'detail', id] as const,
  },

  invitations: {
    all: ['invitations'] as const,
    list: (filters: InvitationFilters) => ['invitations', 'list', filters] as const,
  },

  me: ['me'] as const,

  /** Audit trails, keyed by resource and record id. */
  history: (resource: 'pets' | 'vaccinations' | 'medical-records', id: number) =>
    ['history', resource, id] as const,
} as const
