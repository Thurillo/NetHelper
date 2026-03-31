import React, { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Plus, Link2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { prefixesApi } from '../api/prefixes'
import { ipAddressesApi } from '../api/ipAddresses'
import { Badge } from '../components/common/Badge'
import Modal from '../components/common/Modal'
import Pagination from '../components/common/Pagination'
import LoadingSpinner from '../components/common/LoadingSpinner'
import type { IpAddressCreate, IpAddress } from '../types'

type SortKey = 'address' | 'dns_name' | 'device' | 'vendor' | 'site' | 'source'
type SortDir = 'asc' | 'desc'

function ipToNum(ip: string): number {
  return ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0
}

function sortIps(items: IpAddress[], key: SortKey, dir: SortDir): IpAddress[] {
  return [...items].sort((a, b) => {
    if (key === 'address') {
      const diff = ipToNum(a.address) - ipToNum(b.address)
      return dir === 'asc' ? diff : -diff
    }
    let av = '', bv = ''
    if (key === 'device') { av = a.device?.name ?? ''; bv = b.device?.name ?? '' }
    else if (key === 'vendor') { av = a.device?.vendor_name ?? ''; bv = b.device?.vendor_name ?? '' }
    else if (key === 'site') { av = a.device?.site_name ?? ''; bv = b.device?.site_name ?? '' }
    else if (key === 'dns_name') { av = a.dns_name ?? ''; bv = b.dns_name ?? '' }
    else { av = a.source ?? ''; bv = b.source ?? '' }
    const cmp = av.localeCompare(bv)
    return dir === 'asc' ? cmp : -cmp
  })
}

const PrefixDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const prefixId = Number(id)
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [isAddModal, setIsAddModal] = useState(false)
  const [addForm, setAddForm] = useState<IpAddressCreate>({ address: '', status: 'active' })
  const [addError, setAddError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('address')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const { data: prefix, isLoading } = useQuery({
    queryKey: ['prefixes', prefixId],
    queryFn: () => prefixesApi.get(prefixId),
    staleTime: 30_000,
  })

  const { data: ipData, isLoading: loadingIps } = useQuery({
    queryKey: ['prefixes', prefixId, 'ip-addresses', page],
    queryFn: () => prefixesApi.getIpAddresses(prefixId, { page, size: 20 }),
    staleTime: 30_000,
  })

  const { data: availableIps } = useQuery({
    queryKey: ['prefixes', prefixId, 'available-ips'],
    queryFn: () => prefixesApi.getAvailableIps(prefixId, 20),
    staleTime: 60_000,
  })

  const createIp = useMutation({
    mutationFn: (d: IpAddressCreate) => ipAddressesApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prefixes', prefixId] })
      setIsAddModal(false)
      setAddForm({ address: '', status: 'active' })
      setAddError(null)
    },
    onError: () => setAddError('Errore durante il salvataggio'),
  })

  const assignIps = useMutation({
    mutationFn: () => prefixesApi.assignIps(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['prefixes', prefixId] })
      alert(`Collegamento completato: ${res.updated} indirizzi associati ai prefissi.`)
    },
    onError: () => alert('Errore durante il collegamento automatico.'),
  })

  const handleAddIp = (e: React.FormEvent) => {
    e.preventDefault()
    if (!addForm.address) { setAddError('Indirizzo obbligatorio'); return }
    createIp.mutate({ ...addForm, prefix_id: prefixId })
  }

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sortedItems = useMemo(
    () => ipData?.items ? sortIps(ipData.items, sortKey, sortDir) : [],
    [ipData?.items, sortKey, sortDir]
  )

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={12} className="ml-1 opacity-40 inline" />
    return sortDir === 'asc'
      ? <ArrowUp size={12} className="ml-1 text-primary-600 inline" />
      : <ArrowDown size={12} className="ml-1 text-primary-600 inline" />
  }

  const thClass = 'px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700 whitespace-nowrap'

  if (isLoading) return <LoadingSpinner centered />
  if (!prefix) return <div className="text-center text-gray-500 py-12">Prefisso non trovato</div>

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/prefissi" className="hover:text-gray-700">Prefissi IP</Link>
        <span>/</span>
        <span className="text-gray-900 font-mono">{prefix.prefix}</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold font-mono text-gray-900">{prefix.prefix}</h1>
              <Badge variant={prefix.status === 'active' ? 'green' : prefix.status === 'deprecated' ? 'red' : 'gray'}>{prefix.status}</Badge>
              {prefix.is_pool && <Badge variant="indigo">Pool</Badge>}
              {prefix.vlan && <Badge variant="blue">VLAN {prefix.vlan.vid} — {prefix.vlan.name}</Badge>}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {prefix.site?.name ?? 'Nessuna locazione'}
              {prefix.description ? ` — ${prefix.description}` : ''}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => assignIps.mutate()}
              disabled={assignIps.isPending}
              title="Collega automaticamente gli IP ai prefissi e ai dispositivi corrispondenti"
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              <Link2 size={15} />
              {assignIps.isPending ? 'Associando...' : 'Associa IP'}
            </button>
            <button
              onClick={() => setIsAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700"
            >
              <Plus size={16} />
              Aggiungi IP
            </button>
          </div>
        </div>

        {/* Utilization bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>{prefix.used_ips ?? 0} usati su {prefix.total_ips ?? 0} totali</span>
            <span className="font-semibold">{(prefix.utilization_percent ?? 0).toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${(prefix.utilization_percent ?? 0) > 90 ? 'bg-red-500' : (prefix.utilization_percent ?? 0) > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(prefix.utilization_percent ?? 0, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* IP Addresses */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Indirizzi IP nel prefisso</h3>
          {ipData && <span className="text-sm text-gray-400">{ipData.total} indirizzi trovati</span>}
        </div>
        {loadingIps ? <LoadingSpinner centered /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className={thClass} onClick={() => handleSort('address')}>
                      Indirizzo IP <SortIcon col="address" />
                    </th>
                    <th className={thClass} onClick={() => handleSort('dns_name')}>
                      DNS / Hostname <SortIcon col="dns_name" />
                    </th>
                    <th className={thClass} onClick={() => handleSort('device')}>
                      Dispositivo <SortIcon col="device" />
                    </th>
                    <th className={thClass} onClick={() => handleSort('vendor')}>
                      Vendor <SortIcon col="vendor" />
                    </th>
                    <th className={thClass} onClick={() => handleSort('site')}>
                      Locazione <SortIcon col="site" />
                    </th>
                    <th className={thClass} onClick={() => handleSort('source')}>
                      Sorgente <SortIcon col="source" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedItems.map((ip) => (
                    <tr key={ip.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-mono font-semibold text-gray-900">{ip.address}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{ip.dns_name ?? '—'}</td>
                      <td className="px-5 py-3">
                        {ip.device
                          ? <span className="font-medium text-primary-700">{ip.device.name}</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{ip.device?.vendor_name ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{ip.device?.site_name ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${ip.source === 'ip_range_scan' ? 'bg-blue-50 text-blue-700' : ip.source === 'manual' ? 'bg-gray-100 text-gray-600' : 'bg-purple-50 text-purple-700'}`}>
                          {ip.source ?? '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {sortedItems.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-500 text-sm">Nessun indirizzo trovato in questo prefisso</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {ipData && <Pagination page={page} pages={ipData.pages} total={ipData.total} size={ipData.size} onPageChange={setPage} />}
          </>
        )}
      </div>

      {/* Available IPs */}
      {availableIps && availableIps.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">IP disponibili (primi {availableIps.length})</h3>
          <div className="flex flex-wrap gap-2">
            {availableIps.map((ip) => (
              <button
                key={ip}
                onClick={() => { setAddForm({ address: ip, status: 'active', prefix_id: prefixId }); setIsAddModal(true) }}
                className="font-mono text-xs px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100"
              >
                {ip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add IP modal */}
      <Modal isOpen={isAddModal} onClose={() => { setIsAddModal(false); setAddError(null) }} title="Aggiungi indirizzo IP" size="md"
        footer={
          <>
            <button onClick={() => { setIsAddModal(false); setAddError(null) }} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Annulla</button>
            <button onClick={handleAddIp} disabled={createIp.isPending} className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {createIp.isPending ? 'Salvataggio...' : 'Aggiungi'}
            </button>
          </>
        }
      >
        <form onSubmit={handleAddIp} className="space-y-4">
          {addError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{addError}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo IP *</label>
            <input type="text" value={addForm.address} onChange={(e) => setAddForm((f) => ({ ...f, address: e.target.value }))} placeholder="192.168.1.10" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">DNS</label>
            <input type="text" value={addForm.dns_name ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, dns_name: e.target.value || null }))} placeholder="host.example.com" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <input type="text" value={addForm.notes ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value || null }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default PrefixDetailPage
