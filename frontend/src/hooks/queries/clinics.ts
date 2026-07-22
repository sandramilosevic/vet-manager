import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clinicGroupApi, clinicsApi } from '../../api/resources'
import type { ClinicFilters, ClinicPayload } from '../../api/types'
import { queryKeys } from './keys'

/** The tenant (practice/franchise) the current user belongs to. */
export function useClinicGroup() {
  return useQuery({
    queryKey: queryKeys.clinicGroup,
    queryFn: () => clinicGroupApi.retrieve(),
    staleTime: 5 * 60_000,
    // A user with no clinic assigned gets a 404 here; retrying won't help.
    retry: false,
  })
}

export function useUpdateClinicGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { name: string }) => clinicGroupApi.update(payload),
    onSuccess: (group) => {
      queryClient.setQueryData(queryKeys.clinicGroup, group)
    },
  })
}

export function useClinics(filters: ClinicFilters) {
  return useQuery({
    queryKey: queryKeys.clinics.list(filters),
    queryFn: () => clinicsApi.list(filters),
    placeholderData: (previous) => previous,
  })
}

export function useCreateClinic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ClinicPayload) => clinicsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clinics.all })
    },
  })
}

export function useUpdateClinic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<ClinicPayload> }) =>
      clinicsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clinics.all })
    },
  })
}

export function useDeleteClinic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => clinicsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clinics.all })
    },
  })
}
