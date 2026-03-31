import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Server } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cabinetsApi } from '../api/cabinets'
import { sitesApi } from '../api/sites'
import { useAuthStore } from '../store/authStore'
import Modal from '../components/common/Modal'
import Pagination from '../components/common/Pagination'
import LoadingSpinner from '../components/common/LoadingSpinner'
import type { Cabinet, CabinetCreate, SiteCreate } from '../types'

// Device type labels in Italian
const DEVICE_TYPE_LABELS: Record<string, string> = {
  switch: 'Switch',
  router: 'Router',
  access_point: 'AP',
  server: 'Server',
  patch_panel: 'Patch Panel',
  pdu: 'PDU',
  firewall: 'Firewall',
  ups: 'UPS',
  unmanaged_switch: 'Switch NG',
  workstation: 'Workstation',
  printer: 'Stampante',
  camera: 'Telecamera',
  phone: 'Telefono',
  other: 'Altro',
}

// Color for each device type chip
const DEVICE_TYPE_COLORS: Record<string, string> = {
  switch: 'bg-blue-100 text-blue-700',
  router: 'bg-green-100 text-green-700',
  access_point: 'bg-purple-100 text-purple-700',
  server: 'bg-orange-100 text-orange-700',
  patch_panel: 'bg-gray-100 text-gray-600',
  pdu: 'bg-yellow-100 text-yellow-700',
  firewall: 'bg-red-100 text-red-700',
  ups: 'bg-yellow-100 text-yellow-700',
  unmanaged_switch: 'bg-indigo-100 text-indigo-700',
  workstation: 'bg-teal-100 text-teal-700',
  printer: 'bg-pink-100 text-pink-700',
  camera: 'bg-indigo-100 text-indigo-700',
  phone: 'bg-teal-100 text-teal-600',
  other: 'bg-gray-100 text-gray-500',
}

interface CabinetCardProps {
  cabinet: Cabinet
  onEdit: (c: Cabinet) => void
  isAdmin: boolean
}

const CabinetCard: React.FC<CabinetCardProps> = ({ cabinet, onEdit, isAdmin }) => {
  const navigate = useNavigate()
  const usedU = cabinet.used_u ?? 0
  const totalU = cabinet.u_count
  const fillPct = totalU > 0 ? Math.round((usedU / totalU) * 100) : 0
  const deviceCount = cabinet.devices_count ?? 0
  const summary = cabinet.devices_summary ?? {}

  const barColor =
    fillPct >= 85 ? 'bg-red-500' :
    fillPct >= 60 ? 'bg-orange-400' :
    fillPct > 0   ? 'bg-primary-500' :
    'bg-gray-200'

  // Sort device types: switches first, patch panels last, rest in between
  const ORDER = ['switch', 'router', 'firewall', 'access_point', 'server', 'unmanaged_switch', 'workstation', 'ups', 'pdu', 'printer', 'camera', 'phone', 'other', 'patch_panel']
  const sortedTypes = Object.entries(summary).sort(
    ([a], [b]) => (ORDER.indexOf(a) ?? 99) - (ORDER.indexOf(b) ?? 99)
  )

  return (
    <div
      onClick={() => navigate(`/armadi/${cabinet.id}`)}
      className="bg-white rounded-xl border border-gray-200 p-5 hover:border-primary-300 hover:shadow-sm transition-all cursor-pointer group"
    >
      {/* Top row: name + edit */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate group-hover:text-primary-700 transition-colors">
            {cabinet.name}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">{cabinet.site?.name ?? '—'}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isAdmin && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(cabinet) }}
              className="text-xs text-gray-400 hover:text-primary-600 transition-colors opacity-0 group-hover:opacity-100"
            >
              Modifica
            </button>
          )}
          <span className="text-xs text-gray-400 font-mono">{totalU}U</span>
        </div>
      </div>

      {/* Fill bar */}
      <div className="mt-3 mb-2">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span className="flex items-center gap-1">
            <Server size={11} />
            {deviceCount} {deviceCount === 1 ? 'dispositivo' : 'dispositivi'}
          </span>
          <span className={fillPct > 0 ? 'font-medium' : ''}>
            {usedU}U / {totalU}U
            {fillPct > 0 && <span className={`ml-1 ${fillPct >= 85 ? 'text-red-500' : fillPct >= 60 ? 'text-orange-500' : 'text-gray-400'}`}>({fillPct}%)</span>}
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.min(fillPct, 100)}%` }}
          />
        </div>
      </div>

      {/* Device type chips */}
      {sortedTypes.length > 0 ? (
        <div className="flex flex-wrap gap-1 mt-2">
          {sortedTypes.map(([type, count]) => (
            <span
              key={type}
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${DEVICE_TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-500'}`}
            >
              {count > 1 && <span className="font-bold">{count}×</span>}
              {DEVICE_TYPE_LABELS[type] ?? type}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 mt-2">Armadio vuoto</p>
      )}
    </div>
  )
}

const CabinetsPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const siteIdParam = searchParams.get('site_id') ? Number(searchParams.get('site_id')) : undefined
  const { isAdmin } = useAuthStore()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<Cabinet | null>(null)
  const [form, setForm] = useState<CabinetCreate>({ name: '', site_id: siteIdParam ?? 0, u_count: 42 })
  const [error, setError] = useState<string | null>(null)
  const [showSiteModal, setShowSiteModal] = useState(false)
  const [siteForm, setSiteForm] = useState<SiteCreate>({ name: '', address: null })
  const [siteError, setSiteError] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['cabinets', { site_id: siteIdParam, page }],
    queryFn: () => cabinetsApi.list({ site_id: siteIdParam, page, size: 20 }),
    staleTime: 30_000,
  })

  const { data: sitesData } = useQuery({
    queryKey: ['sites', 'all'],
    queryFn: () => sitesApi.list({ size: 100 }),
    staleTime: 60_000,
  })

  const createSite = useMutation({
    mutationFn: (d: SiteCreate) => sitesApi.create(d),
    onSuccess: (newSite) => {
      qc.invalidateQueries({ queryKey: ['sites'] })
      setForm((f) => ({ ...f, site_id: newSite.id }))
      setShowSiteModal(false)
      setSiteForm({ name: '', address: null })
      setSiteError(null)
    },
    onError: () => setSiteError('Errore durante la creazione della locazione'),
  })

  const handleCreateSite = () => {
    if (!siteForm.name.trim()) { setSiteError('Il nome è obbligatorio'); return }
    createSite.mutate(siteForm)
  }

  const createCabinet = useMutation({
    mutationFn: (d: CabinetCreate) => cabinetsApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cabinets'] }); closeModal() },
    onError: () => setError('Errore durante il salvataggio'),
  })

  const updateCabinet = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CabinetCreate> }) => cabinetsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cabinets'] }); closeModal() },
    onError: () => setError('Errore durante il salvataggio'),
  })

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', site_id: siteIdParam ?? 0, u_count: 42 })
    setError(null)
    setIsModalOpen(true)
  }

  const openEdit = (c: Cabinet) => {
    setEditing(c)
    setForm({ name: c.name, site_id: c.site_id, u_count: c.u_count, description: c.description ?? undefined })
    setError(null)
    setIsModalOpen(true)
  }

  const closeModal = () => { setIsModalOpen(false); setEditing(null); setError(null) }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.site_id) { setError('Nome e locazione sono obbligatori'); return }
    if (editing) updateCabinet.mutate({ id: editing.id, data: form })
    else createCabinet.mutate(form)
  }

  const cabinets = data?.items ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Armadi</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data ? `${data.total} armad${data.total === 1 ? 'io' : 'i'}` : 'Gestisci gli armadi rack'}
          </p>
        </div>
        {isAdmin() && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700">
            <Plus size={16} />Nuovo Armadio
          </button>
        )}
      </div>

      {isLoading ? (
        <LoadingSpinner centered />
      ) : cabinets.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Server size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Nessun armadio trovato</p>
          <p className="text-sm mt-1">Crea il primo armadio rack.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {cabinets.map((cabinet) => (
              <CabinetCard
                key={cabinet.id}
                cabinet={cabinet}
                onEdit={openEdit}
                isAdmin={isAdmin()}
              />
            ))}
          </div>
          {data && <Pagination page={page} pages={data.pages} total={data.total} size={data.size} onPageChange={setPage} />}
        </>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editing ? 'Modifica armadio' : 'Nuovo armadio'} size="md"
        footer={
          <>
            <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Annulla</button>
            <button onClick={handleSubmit} disabled={createCabinet.isPending || updateCabinet.isPending} className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {createCabinet.isPending || updateCabinet.isPending ? 'Salvataggio...' : 'Salva'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Locazione *</label>
            <div className="flex gap-1">
              <select value={form.site_id} onChange={(e) => setForm((f) => ({ ...f, site_id: Number(e.target.value) }))} required className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value={0}>-- Seleziona locazione --</option>
                {sitesData?.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button type="button" onClick={() => { setSiteForm({ name: '', address: null }); setSiteError(null); setShowSiteModal(true) }}
                className="px-2 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600" title="Crea nuova locazione">
                <Plus size={16} />
              </button>
            </div>
            {!sitesData?.items.length && (
              <p className="text-xs text-amber-600 mt-1">Nessuna locazione disponibile. Creane una con il pulsante +</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dimensione (U)</label>
            <input type="number" min={1} max={100} value={form.u_count} onChange={(e) => setForm((f) => ({ ...f, u_count: Number(e.target.value) }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <input type="text" value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value || null }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </form>
      </Modal>
      {/* Inline site creation modal */}
      <Modal isOpen={showSiteModal} onClose={() => setShowSiteModal(false)} title="Nuova locazione" size="sm"
        footer={
          <>
            <button onClick={() => setShowSiteModal(false)} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Annulla</button>
            <button onClick={handleCreateSite} disabled={createSite.isPending} className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {createSite.isPending ? 'Salvataggio...' : 'Crea'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {siteError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{siteError}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input type="text" value={siteForm.name} onChange={(e) => setSiteForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="es. Locazione principale" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo (opzionale)</label>
            <input type="text" value={siteForm.address ?? ''} onChange={(e) => setSiteForm((p) => ({ ...p, address: e.target.value || null }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="es. Via Roma 1, Milano" />
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default CabinetsPage
