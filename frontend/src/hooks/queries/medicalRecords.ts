import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { medicalRecordsApi } from '../../api/resources'
import type { MedicalRecordFilters, MedicalRecordPayload } from '../../api/types'
import { queryKeys } from './keys'

export function useMedicalRecords(filters: MedicalRecordFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.medicalRecords.list(filters),
    queryFn: () => medicalRecordsApi.list(filters),
    enabled,
    placeholderData: (previous) => previous,
  })
}

export function useMedicalRecord(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.medicalRecords.detail(id ?? 0),
    queryFn: () => medicalRecordsApi.retrieve(id as number),
    enabled: typeof id === 'number' && Number.isFinite(id),
  })
}

export function useCreateMedicalRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: MedicalRecordPayload) => medicalRecordsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.medicalRecords.all })
    },
  })
}

export function useUpdateMedicalRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: Partial<MedicalRecordPayload>
    }) => medicalRecordsApi.update(id, payload),
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.medicalRecords.all })
      queryClient.setQueryData(queryKeys.medicalRecords.detail(record.id), record)
    },
  })
}

export function useDeleteMedicalRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => medicalRecordsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.medicalRecords.all })
    },
  })
}
