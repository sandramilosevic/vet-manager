/**
 * Typed service layer — every HTTP call the app makes lives here.
 *
 * Components and hooks never touch axios directly; they call these functions.
 * That keeps the API contract in one auditable place and means a backend change
 * is a one-file change.
 *
 * Paths mirror `vetmanager/urls.py` exactly, including trailing slashes (Django
 * would otherwise 301-redirect and drop the request body on POST).
 */

import { api, buildParams } from './client'
import type {
  Clinic,
  ClinicFilters,
  ClinicGroup,
  ClinicPayload,
  HistoryRow,
  Invitation,
  InvitationCreatePayload,
  InvitationFilters,
  LoginPayload,
  Me,
  MedicalRecord,
  MedicalRecordFilters,
  MedicalRecordPayload,
  Owner,
  OwnerFilters,
  OwnerPayload,
  Paginated,
  Pet,
  PetFilters,
  PetPayload,
  TokenPair,
  User,
  UserUpdatePayload,
  Vaccination,
  VaccinationFilters,
  VaccinationPayload,
} from './types'

/* ------------------------------------------------------------------ */
/* auth                                                                */
/* ------------------------------------------------------------------ */

export const authApi = {
  /** Throttled at 5/minute. `username` — for invited users this equals email. */
  login: async (payload: LoginPayload): Promise<TokenPair> => {
    const { data } = await api.post<TokenPair>('/auth/login/', payload)
    return data
  },

  /** Blacklists the refresh token server-side. Throttled at 10/minute. */
  logout: async (refresh: string): Promise<void> => {
    await api.post('/accounts/logout/', { refresh })
  },

  /** Always succeeds with the same message — the backend refuses to reveal
   *  whether an email is registered. Throttled at 5/hour. */
  requestPasswordReset: async (email: string): Promise<string> => {
    const { data } = await api.post<{ message: string }>('/accounts/password-reset/', {
      email,
    })
    return data.message
  },

  /** `uid` and `token` come from the emailed link. Throttled at 10/hour. */
  confirmPasswordReset: async (
    uid: string,
    token: string,
    password: string,
  ): Promise<string> => {
    const { data } = await api.post<{ message: string }>(
      '/accounts/password-reset/confirm/',
      { uid, token, password },
    )
    return data.message
  },

  /** Creates the account from an invite token. Throttled at 10/hour. */
  acceptInvitation: async (token: string, password: string): Promise<string> => {
    const { data } = await api.post<{ message: string }>(
      '/accounts/invitations/accept/',
      { token, password },
    )
    return data.message
  },
}

/* ------------------------------------------------------------------ */
/* accounts — users & invitations (ADMIN only)                         */
/* ------------------------------------------------------------------ */

export const meApi = {
  /** The caller's own profile — role and clinic straight from the server. */
  retrieve: async (): Promise<Me> => {
    const { data } = await api.get<Me>('/accounts/me/')
    return data
  },
}

export const usersApi = {
  list: async (page = 1): Promise<Paginated<User>> => {
    const { data } = await api.get<Paginated<User>>('/accounts/users/', {
      params: buildParams({ page }),
    })
    return data
  },

  retrieve: async (id: number): Promise<User> => {
    const { data } = await api.get<User>(`/accounts/users/${id}/`)
    return data
  },

  update: async (id: number, payload: UserUpdatePayload): Promise<User> => {
    const { data } = await api.patch<User>(`/accounts/users/${id}/`, payload)
    return data
  },

  /** The backend does NOT delete the row — it sets `is_active = False`. */
  deactivate: async (id: number): Promise<void> => {
    await api.delete(`/accounts/users/${id}/`)
  },
}

export const invitationsApi = {
  /** Every invitation in the caller's practice. Never includes the token. */
  list: async (filters: InvitationFilters = {}): Promise<Paginated<Invitation>> => {
    const { data } = await api.get<Paginated<Invitation>>('/accounts/invitations/', {
      params: buildParams(filters),
    })
    return data
  },

  /**
   * Throttled at 20/day (the list is not). The 201 response deliberately omits
   * the token — it is only ever emailed, so the UI cannot show an invite link.
   */
  create: async (payload: InvitationCreatePayload): Promise<Invitation> => {
    const { data } = await api.post<Invitation>('/accounts/invitations/', payload)
    return data
  },

  revoke: async (id: number): Promise<string> => {
    const { data } = await api.post<{ message: string }>(
      `/accounts/invitations/${id}/revoke/`,
    )
    return data.message
  },
}

/* ------------------------------------------------------------------ */
/* clinics                                                             */
/* ------------------------------------------------------------------ */

export const clinicGroupApi = {
  /** The tenant the logged-in user belongs to. 404 if they have no clinic. */
  retrieve: async (): Promise<ClinicGroup> => {
    const { data } = await api.get<ClinicGroup>('/clinics/')
    return data
  },

  /** ADMIN only. */
  update: async (payload: { name: string }): Promise<ClinicGroup> => {
    const { data } = await api.patch<ClinicGroup>('/clinics/', payload)
    return data
  },
}

export const clinicsApi = {
  list: async (filters: ClinicFilters = {}): Promise<Paginated<Clinic>> => {
    const { data } = await api.get<Paginated<Clinic>>('/clinics/locations/', {
      params: buildParams(filters),
    })
    return data
  },

  retrieve: async (id: number): Promise<Clinic> => {
    const { data } = await api.get<Clinic>(`/clinics/locations/${id}/`)
    return data
  },

  /** ADMIN only. `group` is assigned server-side from the caller's tenant. */
  create: async (payload: ClinicPayload): Promise<Clinic> => {
    const { data } = await api.post<Clinic>('/clinics/locations/', payload)
    return data
  },

  /** ADMIN only. */
  update: async (id: number, payload: Partial<ClinicPayload>): Promise<Clinic> => {
    const { data } = await api.patch<Clinic>(`/clinics/locations/${id}/`, payload)
    return data
  },

  /** ADMIN only. Soft-delete on the backend. */
  remove: async (id: number): Promise<void> => {
    await api.delete(`/clinics/locations/${id}/`)
  },
}

/* ------------------------------------------------------------------ */
/* owners                                                              */
/* ------------------------------------------------------------------ */

export const ownersApi = {
  list: async (filters: OwnerFilters = {}): Promise<Paginated<Owner>> => {
    const { data } = await api.get<Paginated<Owner>>('/owners/', {
      params: buildParams(filters),
    })
    return data
  },

  retrieve: async (id: number): Promise<Owner> => {
    const { data } = await api.get<Owner>(`/owners/${id}/`)
    return data
  },

  create: async (payload: OwnerPayload): Promise<Owner> => {
    const { data } = await api.post<Owner>('/owners/', payload)
    return data
  },

  update: async (id: number, payload: Partial<OwnerPayload>): Promise<Owner> => {
    const { data } = await api.patch<Owner>(`/owners/${id}/`, payload)
    return data
  },

  /** ADMIN only. Soft-delete on the backend. */
  remove: async (id: number): Promise<void> => {
    await api.delete(`/owners/${id}/`)
  },
}

/* ------------------------------------------------------------------ */
/* pets & vaccinations                                                 */
/* ------------------------------------------------------------------ */

export const petsApi = {
  list: async (filters: PetFilters = {}): Promise<Paginated<Pet>> => {
    const { data } = await api.get<Paginated<Pet>>('/pets/', {
      params: buildParams(filters),
    })
    return data
  },

  retrieve: async (id: number): Promise<Pet> => {
    const { data } = await api.get<Pet>(`/pets/${id}/`)
    return data
  },

  create: async (payload: PetPayload): Promise<Pet> => {
    const { data } = await api.post<Pet>('/pets/', payload)
    return data
  },

  update: async (id: number, payload: Partial<PetPayload>): Promise<Pet> => {
    const { data } = await api.patch<Pet>(`/pets/${id}/`, payload)
    return data
  },

  /** ADMIN only. Hard delete — will 409/500 if vaccinations still reference it
   *  (the FK is PROTECT), so the UI warns before calling this. */
  remove: async (id: number): Promise<void> => {
    await api.delete(`/pets/${id}/`)
  },

  /** Audit trail: every revision of this pet, newest first. */
  history: async (id: number, page = 1): Promise<Paginated<HistoryRow<Pet>>> => {
    const { data } = await api.get<Paginated<HistoryRow<Pet>>>(
      `/pets/${id}/history/`,
      { params: buildParams({ page }) },
    )
    return data
  },
}

export const vaccinationsApi = {
  list: async (filters: VaccinationFilters = {}): Promise<Paginated<Vaccination>> => {
    const { data } = await api.get<Paginated<Vaccination>>('/pets/vaccinations/', {
      params: buildParams(filters),
    })
    return data
  },

  retrieve: async (id: number): Promise<Vaccination> => {
    const { data } = await api.get<Vaccination>(`/pets/vaccinations/${id}/`)
    return data
  },

  create: async (payload: VaccinationPayload): Promise<Vaccination> => {
    const { data } = await api.post<Vaccination>('/pets/vaccinations/', payload)
    return data
  },

  update: async (
    id: number,
    payload: Partial<VaccinationPayload>,
  ): Promise<Vaccination> => {
    const { data } = await api.patch<Vaccination>(`/pets/vaccinations/${id}/`, payload)
    return data
  },

  /** ADMIN only. */
  remove: async (id: number): Promise<void> => {
    await api.delete(`/pets/vaccinations/${id}/`)
  },

  history: async (
    id: number,
    page = 1,
  ): Promise<Paginated<HistoryRow<Vaccination>>> => {
    const { data } = await api.get<Paginated<HistoryRow<Vaccination>>>(
      `/pets/vaccinations/${id}/history/`,
      { params: buildParams({ page }) },
    )
    return data
  },
}

/* ------------------------------------------------------------------ */
/* medical records                                                     */
/* ------------------------------------------------------------------ */

export const medicalRecordsApi = {
  list: async (filters: MedicalRecordFilters = {}): Promise<Paginated<MedicalRecord>> => {
    const { data } = await api.get<Paginated<MedicalRecord>>('/medical-records/', {
      params: buildParams(filters),
    })
    return data
  },

  retrieve: async (id: number): Promise<MedicalRecord> => {
    const { data } = await api.get<MedicalRecord>(`/medical-records/${id}/`)
    return data
  },

  /** VET or ADMIN only. The authoring vet is taken from the access token. */
  create: async (payload: MedicalRecordPayload): Promise<MedicalRecord> => {
    const { data } = await api.post<MedicalRecord>('/medical-records/', payload)
    return data
  },

  /** VET or ADMIN only. */
  update: async (
    id: number,
    payload: Partial<MedicalRecordPayload>,
  ): Promise<MedicalRecord> => {
    const { data } = await api.patch<MedicalRecord>(`/medical-records/${id}/`, payload)
    return data
  },

  /** ADMIN only. Soft-delete on the backend. */
  remove: async (id: number): Promise<void> => {
    await api.delete(`/medical-records/${id}/`)
  },

  /** Who changed a diagnosis, and when — readable by every clinic member. */
  history: async (
    id: number,
    page = 1,
  ): Promise<Paginated<HistoryRow<MedicalRecord>>> => {
    const { data } = await api.get<Paginated<HistoryRow<MedicalRecord>>>(
      `/medical-records/${id}/history/`,
      { params: buildParams({ page }) },
    )
    return data
  },
}
