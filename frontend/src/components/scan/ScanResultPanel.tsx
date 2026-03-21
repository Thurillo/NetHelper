import React, { useEffect, useRef, useState } from 'react'
import { XCircle, Wifi, WifiOff, PlusCircle, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useScanJobPolling, useCancelScan } from '../../hooks/useScanJobs'
import { useCreateDevice } from '../../hooks/useDevices'
import { vendorsApi } from '../../api/vendors'
import StatusDot from '../common/StatusDot'
import type { ScanJob } from '../../types'

interface FoundHost {
  ip: string
  open_ports: number[]
  hostname: string | null
  ping: boolean
  mac: string | null
  vendor: string | null
}

interface AddDeviceModalProps {
  host: FoundHost
  vendors: { id: number; name: string }[]
  onClose: () => void
  onSuccess: () => void
}

const AddDeviceModal: React.FC<AddDeviceModalProps> = ({ host, vendors, onClose, onSuccess }) => {
  const createDevice = useCreateDevice()
  const [name, setName] = useState(host.hostname || host.ip)
  const [deviceType, setDeviceType] = useState('server')
  const [vendorId, setVendorId] = useState<number | ''>('')
  const [model, setModel] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await createDevice.mutateAsync({
        name,
        device_type: deviceType as any,
        primary_ip: host.ip,
        management_ip: host.ip,
        vendor_id: vendorId !== '' ? Number(vendorId) : null,
        model: model || null,
        notes: [
          notes,
          host.mac ? `MAC: ${host.mac}` : '',
          host.vendor ? `Vendor MAC: ${host.vendor}` : '',
        ].filter(Boolean).join('\n') || null,
      })
      onSuccess()
      onClose()
    } catch {
      setError('Errore durante la creazione del dispositivo')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Aggiungi dispositivo — {host.ip}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

          {/* Pre-filled info */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1 text-gray-600 font-mono">
            <div><span className="text-gray-400">IP:</span> {host.ip}</div>
            {host.mac && <div><span className="text-gray-400">MAC:</span> {host.mac}</div>}
            {host.vendor && <div><span className="text-gray-400">Vendor:</span> {host.vendor}</div>}
            {host.open_ports.length > 0 && (
              <div><span className="text-gray-400">Porte:</span> {host.open_ports.join(', ')}</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo dispositivo *</label>
            <select
              value={deviceType}
              onChange={e => setDeviceType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="server">Server</option>
              <option value="switch">Switch</option>
              <option value="router">Router</option>
              <option value="firewall">Firewall</option>
              <option value="access_point">Access Point</option>
              <option value="printer">Stampante</option>
              <option value="workstation">Workstation</option>
              <option value="other">Altro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
            <select
              value={vendorId}
              onChange={e => setVendorId(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">— Nessuno —</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            {host.vendor && (
              <p className="text-xs text-gray-400 mt-1">
                Suggerito dal MAC: <strong>{host.vendor}</strong>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Modello</label>
            <input
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="es. PowerEdge R730"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={createDevice.isPending}
              className="flex-1 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
            >
              {createDevice.isPending ? 'Creazione...' : 'Crea dispositivo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface ScanResultPanelProps {
  job: ScanJob
}

const ScanResultPanel: React.FC<ScanResultPanelProps> = ({ job: initialJob }) => {
  const isRunning = initialJob.status === 'running' || initialJob.status === 'pending'
  const { data: liveJob } = useScanJobPolling(initialJob.id, isRunning)
  const job = liveJob ?? initialJob
  const cancelScan = useCancelScan()
  const logRef = useRef<HTMLPreElement>(null)
  const isIpRange = job.scan_type === 'ip_range'
  const [addHost, setAddHost] = useState<FoundHost | null>(null)
  const [addedIps, setAddedIps] = useState<Set<string>>(new Set())

  const { data: vendorsData } = useQuery({
    queryKey: ['vendors', 'all'],
    queryFn: () => vendorsApi.list({ size: 200 }),
    staleTime: 60_000,
  })
  const vendors = vendorsData?.items ?? []

  const summary = job.result_summary as Record<string, unknown> | null
  const foundHosts: FoundHost[] = (summary?.found_hosts as FoundHost[]) ?? []
  const aliveHosts = summary?.alive_hosts as number | undefined
  const totalIps = summary?.total_ips as number | undefined

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [job.log_output])

  return (
    <>
      <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-800 border-b border-gray-700">
          <StatusDot status={job.status} showLabel />
          <span className="text-sm text-gray-300 font-mono">
            Job #{job.id}
            {job.device && ` — ${job.device.name}`}
            {job.range_start_ip && ` — ${job.range_start_ip} → ${job.range_end_ip}`}
          </span>
          {isRunning && (
            <button
              onClick={() => cancelScan.mutate(job.id)}
              disabled={cancelScan.isPending}
              className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <XCircle size={12} />
              Annulla
            </button>
          )}
        </div>

        {/* Log output */}
        <pre
          ref={logRef}
          className="text-xs text-green-400 font-mono p-4 overflow-y-auto bg-gray-900"
          style={{ maxHeight: '180px', minHeight: '60px' }}
        >
          {job.log_output || (isRunning ? 'Avvio scansione...' : 'Nessun output disponibile')}
          {isRunning && <span className="animate-pulse">█</span>}
        </pre>

        {/* IP Range: found hosts table */}
        {isIpRange && job.status === 'completed' && (
          <div className="border-t border-gray-700">
            <div className="px-4 py-2 bg-gray-800 flex items-center gap-3">
              <span className="text-xs text-gray-400">
                Host trovati:{' '}
                <span className={`font-bold ${(aliveHosts ?? 0) > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                  {aliveHosts ?? 0}
                </span>
                {totalIps !== undefined && <span className="text-gray-500"> / {totalIps} IP</span>}
              </span>
            </div>

            {foundHosts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-gray-300">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-500">
                      <th className="text-left px-4 py-2">IP</th>
                      <th className="text-left px-4 py-2">MAC</th>
                      <th className="text-left px-4 py-2">Vendor</th>
                      <th className="text-left px-4 py-2">Hostname</th>
                      <th className="text-left px-4 py-2">Porte</th>
                      <th className="text-center px-3 py-2">Ping</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {foundHosts.map((h) => (
                      <tr key={h.ip} className="border-b border-gray-800 hover:bg-gray-800">
                        <td className="px-4 py-2 font-mono text-green-300">{h.ip}</td>
                        <td className="px-4 py-2 font-mono text-gray-400">{h.mac ?? '—'}</td>
                        <td className="px-4 py-2 text-gray-400 max-w-[140px] truncate" title={h.vendor ?? ''}>
                          {h.vendor ?? '—'}
                        </td>
                        <td className="px-4 py-2 text-gray-400">{h.hostname ?? '—'}</td>
                        <td className="px-4 py-2">
                          {h.open_ports.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {h.open_ports.map((p) => (
                                <span key={p} className="px-1.5 py-0.5 bg-blue-900 text-blue-300 rounded font-mono">
                                  {p}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {h.ping
                            ? <Wifi size={12} className="text-green-400 inline" />
                            : <WifiOff size={12} className="text-gray-600 inline" />}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => setAddHost(h)}
                            disabled={addedIps.has(h.ip)}
                            title={addedIps.has(h.ip) ? 'Già aggiunto' : 'Aggiungi come dispositivo'}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                              addedIps.has(h.ip)
                                ? 'bg-green-900 text-green-400 cursor-default'
                                : 'bg-gray-700 text-gray-300 hover:bg-primary-700 hover:text-white'
                            }`}
                          >
                            <PlusCircle size={11} />
                            {addedIps.has(h.ip) ? 'Aggiunto' : 'Aggiungi'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-4 py-3 text-xs text-gray-500">Nessun host raggiungibile trovato.</p>
            )}
          </div>
        )}

        {/* Device scan summary */}
        {!isIpRange && job.status === 'completed' && summary && (
          <div className="grid grid-cols-4 gap-px bg-gray-700 border-t border-gray-700">
            {[
              { label: 'Interfacce', value: (summary.interfaces_collected as number) ?? 0 },
              { label: 'Voci MAC', value: (summary.mac_entries_collected as number) ?? 0 },
              { label: 'ARP', value: (summary.arp_entries_collected as number) ?? 0 },
              { label: 'Conflitti', value: (summary.conflicts_created as number) ?? 0, warning: ((summary.conflicts_created as number) ?? 0) > 0 },
            ].map((stat) => (
              <div key={stat.label} className="bg-gray-800 px-4 py-3 text-center">
                <p className={`text-lg font-bold ${stat.warning ? 'text-orange-400' : 'text-white'}`}>
                  {stat.value}
                </p>
                <p className="text-xs text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {job.error_message && (
          <div className="px-4 py-3 bg-red-900 border-t border-red-700">
            <p className="text-sm text-red-200">{job.error_message}</p>
          </div>
        )}
      </div>

      {/* Add device modal */}
      {addHost && (
        <AddDeviceModal
          host={addHost}
          vendors={vendors}
          onClose={() => setAddHost(null)}
          onSuccess={() => setAddedIps(prev => new Set([...prev, addHost.ip]))}
        />
      )}
    </>
  )
}

export default ScanResultPanel
