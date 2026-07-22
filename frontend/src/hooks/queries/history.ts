import { useQuery } from '@tanstack/react-query'
import {
  medicalRecordsApi,
  petsApi,
  vaccinationsApi,
} from '../../api/resources'
import { queryKeys } from './keys'

/**
 * Audit trails from django-simple-history. These are only fetched when a
 * history panel is actually opened — nobody needs a change log on page load.
 */

export function usePetHistory(id: number | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.history('pets', id ?? 0),
    queryFn: () => petsApi.history(id as number),
    enabled: enabled && typeof id === 'number' && Number.isFinite(id),
  })
}

export function useVaccinationHistory(id: number | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.history('vaccinations', id ?? 0),
    queryFn: () => vaccinationsApi.history(id as number),
    enabled: enabled && typeof id === 'number' && Number.isFinite(id),
  })
}

export function useMedicalRecordHistory(id: number | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.history('medical-records', id ?? 0),
    queryFn: () => medicalRecordsApi.history(id as number),
    enabled: enabled && typeof id === 'number' && Number.isFinite(id),
  })
}
