import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ownersApi } from '../../api/resources'
import type { OwnerFilters, OwnerPayload } from '../../api/types'
import { queryKeys } from './keys'

export function useOwners(filters: OwnerFilters) {
  return useQuery({
    queryKey: queryKeys.owners.list(filters),
    queryFn: () => ownersApi.list(filters),
    // Keeps the previous page visible while the next one loads, so the table
    // doesn't collapse to a spinner on every page change.
    placeholderData: (previous) => previous,
  })
}

export function useOwner(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.owners.detail(id ?? 0),
    queryFn: () => ownersApi.retrieve(id as number),
    enabled: typeof id === 'number' && Number.isFinite(id),
  })
}

/**
 * Loads every owner page so forms can render an owner picker and tables can
 * resolve `owner` FK ids to names — the API returns bare ids and offers no
 * bulk lookup. Capped so a large practice can't spiral into dozens of
 * requests; beyond the cap the picker falls back to a plain id field.
 */
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
        /** True when we stopped early — the UI says so instead of pretending. */
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
      // Pets hang off owners; a soft-deleted owner changes what's reachable.
      queryClient.invalidateQueries({ queryKey: queryKeys.pets.all })
    },
  })
}
