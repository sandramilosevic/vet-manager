import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { vaccinationsApi } from '../../api/resources'
import type { VaccinationFilters, VaccinationPayload } from '../../api/types'
import { queryKeys } from './keys'

export function useVaccinations(filters: VaccinationFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.vaccinations.list(filters),
    queryFn: () => vaccinationsApi.list(filters),
    enabled,
    placeholderData: (previous) => previous,
  })
}

export function useVaccination(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.vaccinations.detail(id ?? 0),
    queryFn: () => vaccinationsApi.retrieve(id as number),
    enabled: typeof id === 'number' && Number.isFinite(id),
  })
}

export function useCreateVaccination() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: VaccinationPayload) => vaccinationsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vaccinations.all })
    },
  })
}

export function useUpdateVaccination() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: Partial<VaccinationPayload>
    }) => vaccinationsApi.update(id, payload),
    onSuccess: (vaccination) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vaccinations.all })
      queryClient.setQueryData(queryKeys.vaccinations.detail(vaccination.id), vaccination)
    },
  })
}

export function useDeleteVaccination() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => vaccinationsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vaccinations.all })
    },
  })
}
