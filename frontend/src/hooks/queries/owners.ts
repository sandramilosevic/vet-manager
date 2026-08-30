import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ownersApi } from '../../api/resources'
import type { OwnerFilters, OwnerPayload } from '../../api/types'
import { queryKeys } from './keys'

export function useOwners(filters: OwnerFilters) {
  return useQuery({
    queryKey: queryKeys.owners.list(filters),
    queryFn: () => ownersApi.list(filters),
    placeholderData: (previous) => previous,
    staleTime: 0,
  })
}

export function useOwner(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.owners.detail(id ?? 0),
    queryFn: () => ownersApi.retrieve(id as number),
    enabled: typeof id === 'number' && Number.isFinite(id),
  })
}

const MAX_LOOKUP_PAGES = 12

export function useOwnerLookup(enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.owners.all, 'lookup'],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const first = await ownersApi.list({ page: 1, ordering: 'last_name' })
      const owners = [...first.results]
      let page = 2

      while (owners.length < first.count && page <= MAX_LOOKUP_PAGES) {
        const next = await ownersApi.list({ page, ordering: 'last_name' })
        owners.push(...next.results)
        if (!next.next) break
        page += 1
      }

      return {
        owners,
        truncated: owners.length < first.count,
        total: first.count,
      }
    },
  })
}

export function useCreateOwner() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: OwnerPayload) => ownersApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.owners.all })
    },
  })
}

export function useUpdateOwner() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<OwnerPayload> }) =>
      ownersApi.update(id, payload),
    onSuccess: (owner) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.owners.all })
      queryClient.setQueryData(queryKeys.owners.detail(owner.id), owner)
    },
  })
}

export function useDeleteOwner() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => ownersApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.owners.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.pets.all })
    },
  })
}