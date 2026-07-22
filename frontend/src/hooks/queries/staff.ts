import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invitationsApi, usersApi } from '../../api/resources'
import type {
  InvitationCreatePayload,
  InvitationFilters,
  UserUpdatePayload,
} from '../../api/types'
import { queryKeys } from './keys'

/* ------------------------------------------------------------------ */
/* Users (ADMIN only)                                                  */
/* ------------------------------------------------------------------ */

export function useUsers(page: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.list(page),
    queryFn: () => usersApi.list(page),
    enabled,
    placeholderData: (previous) => previous,
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UserUpdatePayload }) =>
      usersApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })
}

/** DELETE on the backend deactivates (`is_active = False`) rather than erases. */
export function useDeactivateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => usersApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })
}

/* ------------------------------------------------------------------ */
/* Invitations                                                         */
/* ------------------------------------------------------------------ */

/**
 * Every invitation in the practice, straight from the API. The response never
 * carries the invite token — that is only ever emailed — so listing them is
 * safe: an admin can audit and revoke, but cannot accept on someone's behalf.
 */
export function useInvitations(filters: InvitationFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.invitations.list(filters),
    queryFn: () => invitationsApi.list(filters),
    enabled,
    placeholderData: (previous) => previous,
  })
}

export function useCreateInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: InvitationCreatePayload) => invitationsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invitations.all })
    },
  })
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => invitationsApi.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invitations.all })
    },
  })
}
