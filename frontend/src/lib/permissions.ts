/**
 * Role capability map — a client-side MIRROR of the backend's permission
 * classes (`apps/accounts/permissions.py` plus each view's `get_permissions`).
 *
 * This exists so the UI is not MISLEADING: we don't show a delete button that
 * is guaranteed to 403. It is NOT a security control. The backend enforces
 * every one of these rules independently, and a user who bypasses the UI gets
 * rejected there. Whenever these two disagree, the backend wins.
 */

import type { Role } from '../api/types'

export interface Capabilities {
  // accounts
  viewStaff: boolean
  manageStaff: boolean
  inviteStaff: boolean
  // clinics
  editClinicGroup: boolean
  createClinicLocation: boolean
  editClinicLocation: boolean
  deleteClinicLocation: boolean
  // owners
  editOwner: boolean
  deleteOwner: boolean
  // pets
  editPet: boolean
  deletePet: boolean
  // vaccinations
  editVaccination: boolean
  deleteVaccination: boolean
  // medical records
  createMedicalRecord: boolean
  editMedicalRecord: boolean
  deleteMedicalRecord: boolean
}

export function capabilitiesFor(role: Role | null): Capabilities {
  const isAdmin = role === 'ADMIN'
  const isVetOrAdmin = role === 'VET' || role === 'ADMIN'
  const isAuthenticated = role !== null

  return {
    // UserListView / UserDetailView: [IsAuthenticated, IsAdmin]
    viewStaff: isAdmin,
    manageStaff: isAdmin,
    // SendInvitationView / RevokeInvitationView: [IsAuthenticated, IsAdmin]
    inviteStaff: isAdmin,

    // ClinicView: PUT/PATCH -> IsAdmin, GET -> any authenticated user
    editClinicGroup: isAdmin,
    // ClinicListCreateView: POST -> IsAdmin
    createClinicLocation: isAdmin,
    // ClinicDetailView: PUT/PATCH/DELETE -> IsAdmin
    editClinicLocation: isAdmin,
    deleteClinicLocation: isAdmin,

    // OwnerDetailView: DELETE -> IsAdmin, PUT/PATCH -> any authenticated user
    editOwner: isAuthenticated,
    deleteOwner: isAdmin,

    // PetDetailView: DELETE -> IsAdmin, PUT/PATCH -> any authenticated user
    editPet: isAuthenticated,
    deletePet: isAdmin,

    // VaccinationDetailView: DELETE -> IsAdmin, PUT/PATCH -> any authenticated user
    editVaccination: isAuthenticated,
    deleteVaccination: isAdmin,

    // MedicalRecordListCreateView: POST -> IsVetOrAdmin
    createMedicalRecord: isVetOrAdmin,
    // MedicalRecordDetailView: PUT/PATCH -> IsVetOrAdmin, DELETE -> IsAdmin
    editMedicalRecord: isVetOrAdmin,
    deleteMedicalRecord: isAdmin,
  }
}
