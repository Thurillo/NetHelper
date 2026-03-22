import { useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { scanJobsApi } from '../api/scanJobs'
import { useUiStore } from '../store/uiStore'
import { useAuthStore } from '../store/authStore'

const SCAN_TYPE_LABELS: Record<string, string> = {
  snmp_full: 'SNMP Full',
  snmp_mac: 'MAC Table',
  snmp_arp: 'ARP',
  snmp_lldp: 'LLDP',
  ssh_full: 'SSH Full',
  ip_range: 'Range IP',
}

export function useScanNotifier() {
  const { accessToken: token } = useAuthStore()
  const { addToast } = useUiStore()
  const runningIds = useRef<Set<number>>(new Set())
  const initialized = useRef(false)

  const { data } = useQuery({
    queryKey: ['scan-jobs-active'],
    queryFn: () => scanJobsApi.list({ page: 1, size: 20 }),
    refetchInterval: (query) => {
      // Poll every 5s only when there are running jobs, else every 30s
      const items = query.state.data?.items ?? []
      const hasRunning = items.some(j => j.status === 'running' || j.status === 'pending')
      return hasRunning ? 5000 : 30_000
    },
    enabled: !!token,
    staleTime: 0,
  })

  useEffect(() => {
    const jobs = data?.items ?? []

    if (!initialized.current) {
      // First load: seed the running set without notifying
      jobs.forEach(j => {
        if (j.status === 'running' || j.status === 'pending') {
          runningIds.current.add(j.id)
        }
      })
      initialized.current = true
      return
    }

    const currentIds = new Set(jobs.map(j => j.id))

    // Check jobs that were running and now show as completed/failed
    jobs.forEach(j => {
      if (runningIds.current.has(j.id)) {
        if (j.status === 'completed') {
          const typeLabel = SCAN_TYPE_LABELS[j.scan_type] ?? j.scan_type
          addToast(`Scansione ${typeLabel} completata`, 'success')
          runningIds.current.delete(j.id)
        } else if (j.status === 'failed') {
          const typeLabel = SCAN_TYPE_LABELS[j.scan_type] ?? j.scan_type
          addToast(`Scansione ${typeLabel} fallita`, 'error')
          runningIds.current.delete(j.id)
        } else if (j.status === 'cancelled') {
          runningIds.current.delete(j.id)
        }
      }
    })

    // Also remove from runningIds any job that disappeared from the list
    runningIds.current.forEach(id => {
      if (!currentIds.has(id)) runningIds.current.delete(id)
    })

    // Add newly running jobs to the set
    jobs.forEach(j => {
      if (j.status === 'running' || j.status === 'pending') {
        runningIds.current.add(j.id)
      }
    })
  }, [data, addToast])
}
