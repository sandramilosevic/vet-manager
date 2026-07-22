import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { petsApi } from '../../api/resources'
import type { PetFilters, PetPayload } from '../../api/types'
import { queryKeys } from './keys'

export function usePets(filters: PetFilters) {
  return useQuery({
    queryKey: queryKeys.pets.list(filters),
    queryFn: () => petsApi.list(filters),
    placeholderData: (previous) => previous,
  })
}

export function usePet(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.pets.detail(id ?? 0),
    queryFn: () => petsApi.retrieve(id as number),
    enabled: typeof id === 'number' && Number.isFinite(id),
  })
}

const MAX_LOOKUP_PAGES = 12

/** See `useOwnerLookup` — same rationale: the API only returns FK ids. */
export function usePetLookup(enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.pets.all, 'lookup'],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const first = await petsApi.list({ page: 1 })
      const pets = [...first.results]
      let page = 2

      while (pets.length < first.count && page <= MAX_LOOKUP_PAGES) {
        const next = await petsApi.list({ page })
        pets.push(...next.results)
        if (!next.next) break
        page += 1
      }

      return { pets, truncated: pets.length < first.count, total: first.count }
    },
  })
}

export function useCreatePet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: PetPayload) => petsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pets.all })
    },
  })
}

export function useUpdatePet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<PetPayload> }) =>
      petsApi.update(id, payload),
    onSuccess: (pet) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pets.all })
      queryClient.setQueryData(queryKeys.pets.detail(pet.id), pet)
    },
  })
}

export function useDeletePet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => petsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pets.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.vaccinations.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.medicalRecords.all })
    },
  })
}
