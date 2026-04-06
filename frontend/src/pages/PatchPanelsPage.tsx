import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Edit2, Grid3X3, Link, Plus, Server, Trash2 } from 'lucide-react'
import { patchPanelsApi } from '../api/patchPanels'
import { devicesApi } from '../api/devices'
import { cabinetsApi } from '../api/cabinets'
import LoadingSpinner from '../components/common/LoadingSpinner'
import EmptyState from '../components/common/EmptyState'
import Modal from '../components/common/Modal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import PortEditModal from '../components/patchpanel/PortEditModal'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import type { Device, DeviceCreate, PatchPortDetail } from '../types'

// ─── Compact port button ─────────────────────────────────────────────────────

const PortDot: React.FC<{
  port: PatchPortDetail
  index: number
  selected: boolean
  onClick: () => void
}> = ({ port, index, selected, onClick }) => {
  const hasLink = port.linked_interface !== null
  const hasRoom = !!port.interface.room_destination
  const m = port.interface.name.match(/(\d+)$/)
  const num = m ? m[1] : String(index + 1)

  const bg = hasLink
    ? 'bg-green-500 border-green-600 text-white'
    : hasRoom
    ? 'bg-yellow-400 border-yellow-500 text-gray-900'
    : 'bg-gray-100 border-gray-300 text-gray-400'

  const tooltip = [
    `Porta ${num}`,
    port.interface.label,
    port.interface.room_destination ? `→ ${port.interface.room_destination}` : null,
    port.linked_interface ? `Connessa: ${port.linked_interface.device_name ?? '?'} ${port.linked_interface.name}` : null,
  ].filter(Boolean).join(' | ')

  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={`flex items-center justify-center border rounded text-xs font-bold transition-all hover:opacity-75 flex-shrink-0 ${bg} ${
        selected ? 'ring-2 ring-primary-500 ring-offset-1' : ''
      }`}
      style={{ width: 30, height: 30 }}
    >
      {num}
    </button>
  )
}

// ─── Expanded patch panel content ────────────────────────────────────────────

const PatchPanelExpanded: React.FC<{
  deviceId: number
  cabinetId: number | null
  cabinetName: string | null
}> = ({ deviceId, cabinetId, cabinetName }) => {
  const [selectedPortId, setSelectedPortId] = useState<number | null>(null)
  const [editingPort, setEditingPort] = useState<PatchPortDetail | null>(null)

  const { data: ports, refetch, isLoading } = useQuery<PatchPortDetail[]>({
    queryKey: ['patch-panel-ports', deviceId],
    queryFn: () => patchPanelsApi.getPorts(deviceId),
    staleTime: 30_000,
  })

  if (isLoading) return <div className="py-6 flex justify-center"><LoadingSpinner /></div>
  if (!ports || ports.length === 0) return <p className="text-sm text-gray-400 py-4">Nessuna porta configurata.</p>

  const linkedCount = ports.filter(p => p.linked_interface !== null).length
  const roomCount = ports.filter(p => p.interface.room_destination && !p.linked_interface).length
  const freeCount = ports.length - linkedCount - roomCount

  const getPortNum = (p: PatchPortDetail, i: number) => {
    const m = p.interface.name.match(/(\d+)$/)
    return m ? parseInt(m[1]) : i + 1
  }

  return (
    <div className="border-t border-gray-100 pt-4 space-y-4">
      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" />
          {linkedCount} collegate
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-yellow-400 inline-block" />
          {roomCount} solo stanza
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-gray-200 border border-gray-300 inline-block" />
          {freeCount} libere
        </span>
      </div>

      {/* Port row */}
      <div className="bg-gray-800 rounded-xl p-3 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {ports.map((port, i) => (
            <PortDot
              key={port.interface.id}
              port={port}
              index={i}
              selected={selectedPortId === port.interface.id}
              onClick={() =>
                setSelectedPortId(prev => prev === port.interface.id ? null : port.interface.id)
              }
            />
          ))}
        </div>
      </div>

      {/* Port table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
            <tr>
              <th className="text-left px-4 py-2.5 w-16">Porta</th>
              <th className="text-left px-4 py-2.5">Etichetta</th>
              <th className="text-left px-4 py-2.5">Armadio</th>
              <th className="text-left px-4 py-2.5">Destinazione</th>
              <th className="text-left px-4 py-2.5">Connessa a</th>
              <th className="px-4 py-2.5 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ports.map((port, i) => {
              const num = getPortNum(port, i)
              const isSelected = selectedPortId === port.interface.id
              const hasLink = port.linked_interface !== null

              return (
                <tr
                  key={port.interface.id}
                  onClick={() => setSelectedPortId(prev => prev === port.interface.id ? null : port.interface.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Porta */}
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold border ${
                      hasLink
                        ? 'bg-green-500 border-green-600 text-white'
                        : port.interface.room_destination
                        ? 'bg-yellow-400 border-yellow-500 text-gray-900'
                        : 'bg-gray-100 border-gray-300 text-gray-500'
                    }`}>
                      {num}
                    </span>
                  </td>

                  {/* Etichetta */}
                  <td className="px-4 py-2.5 text-gray-700">
                    {port.interface.label ?? <span className="text-gray-300">—</span>}
                  </td>

                  {/* Armadio */}
                  <td className="px-4 py-2.5 text-gray-500 text-xs">
                    {cabinetName ?? <span className="text-gray-300">—</span>}
                  </td>

                  {/* Destinazione */}
                  <td className="px-4 py-2.5 text-gray-600">
                    {port.interface.room_destination ?? <span className="text-gray-300">—</span>}
                  </td>

                  {/* Connessa a */}
                  <td className="px-4 py-2.5">
                    {hasLink ? (
                      <span className="inline-flex items-center gap-1.5 text-green-700 font-mono text-xs bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                        <Link size={10} />
                        {port.linked_interface!.device_name ?? '?'} — {port.linked_interface!.name}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>

                  {/* Modifica */}
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={e => { e.stopPropagation(); setEditingPort(port) }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
                    >
                      <Edit2 size={11} />
                      Modifica
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      <PortEditModal
        isOpen={!!editingPort}
        onClose={() => setEditingPort(null)}
        port={editingPort}
        deviceId={deviceId}
        cabinetId={cabinetId}
        onSaved={() => { refetch(); setEditingPort(null) }}
      />
    </div>
  )
}

// ─── Patch panel card ────────────────────────────────────────────────────────

const PatchPanelCard: React.FC<{
  pp: Device
  onEdit: (pp: Device) => void
  onDelete: (pp: Device) => void
}> = ({ pp, onEdit, onDelete }) => {
  const { isAdmin } = useAuthStore()
  const [expanded, setExpanded] = useState(false)
  const cabinetName = pp.cabinet_name ?? null
  const cabinetId = pp.cabinet_id ?? null

  return (
    <div className={`bg-white rounded-xl border transition-all ${
      expanded ? 'border-primary-300 shadow-sm col-span-full' : 'border-gray-200 hover:border-primary-200 hover:shadow-sm'
    }`}>
      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start gap-3">
          {/* Expand button (left side) */}
          <button
            onClick={() => setExpanded(prev => !prev)}
            className="flex items-center gap-3 min-w-0 flex-1 text-left"
          >
            <div className={`p-2 rounded-lg flex-shrink-0 ${expanded ? 'bg-primary-100' : 'bg-gray-100'}`}>
              <Grid3X3 size={18} className={expanded ? 'text-primary-600' : 'text-gray-500'} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{pp.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {cabinetName ?? 'Senza armadio'}
                {pp.model && <span className="ml-2 text-gray-400">{pp.model}</span>}
              </p>
            </div>
          </button>

          {/* Actions (right side) */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {isAdmin() && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); onEdit(pp) }}
                  title="Modifica patch panel"
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onDelete(pp) }}
                  title="Elimina patch panel"
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
            <button
              onClick={() => setExpanded(prev => !prev)}
              className={`p-1.5 rounded-lg transition-colors ${expanded ? 'text-primary-500' : 'text-gray-400'}`}
            >
              {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5">
          <PatchPanelExpanded deviceId={pp.id} cabinetId={cabinetId} cabinetName={cabinetName} />
        </div>
      )}
    </div>
  )
}

// ─── Cabinet group ────────────────────────────────────────────────────────────

interface CabinetGroup {
  cabinetId: number | null
  cabinetName: string | null
  pps: Device[]
}

// ─── PP form type ─────────────────────────────────────────────────────────────

interface PPForm {
  name: string
  model: string
  port_count: number | ''
  cabinet_id: number | ''
  notes: string
}

const emptyForm: PPForm = { name: '', model: '', port_count: '', cabinet_id: '', notes: '' }

// ─── Page ────────────────────────────────────────────────────────────────────

const PatchPanelsPage: React.FC = () => {
  const { isAdmin } = useAuthStore()
  const { addToast } = useUiStore()
  const qc = useQueryClient()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPP, setEditingPP] = useState<Device | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Device | null>(null)
  const [form, setForm] = useState<PPForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['patch-panels-all'],
    queryFn: () => patchPanelsApi.list({ page: 1, size: 500 }),
    staleTime: 30_000,
  })

  const { data: cabinetsData } = useQuery({
    queryKey: ['cabinets', 'all'],
    queryFn: () => cabinetsApi.list({ size: 100 }),
    staleTime: 60_000,
    enabled: isModalOpen,
  })

  const createMutation = useMutation({
    mutationFn: (f: PPForm) => devicesApi.create({
      name: f.name,
      device_type: 'patch_panel',
      status: 'active',
      model: f.model || null,
      port_count: f.port_count !== '' ? Number(f.port_count) : null,
      cabinet_id: f.cabinet_id !== '' ? Number(f.cabinet_id) : null,
      notes: f.notes || null,
      primary_ip: null, management_ip: null, mac_address: null,
      serial_number: null, asset_tag: null, u_position: null, u_height: 1,
      vendor_id: null, os_version: null, snmp_community: null, snmp_version: 2,
      ssh_username: null, ssh_password: null, ssh_port: 22,
    } as DeviceCreate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patch-panels-all'] })
      qc.invalidateQueries({ queryKey: ['devices'] })
      addToast('Patch panel creato', 'success')
      closeModal()
    },
    onError: () => { setFormError('Errore durante la creazione'); addToast('Errore durante la creazione', 'error') },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, f }: { id: number; f: PPForm }) => devicesApi.update(id, {
      name: f.name,
      model: f.model || null,
      cabinet_id: f.cabinet_id !== '' ? Number(f.cabinet_id) : null,
      notes: f.notes || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patch-panels-all'] })
      qc.invalidateQueries({ queryKey: ['devices'] })
      addToast('Patch panel aggiornato', 'success')
      closeModal()
    },
    onError: () => { setFormError('Errore durante il salvataggio'); addToast('Errore durante il salvataggio', 'error') },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => devicesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patch-panels-all'] })
      qc.invalidateQueries({ queryKey: ['devices'] })
      addToast('Patch panel eliminato', 'success')
      setDeleteTarget(null)
    },
    onError: () => addToast('Errore durante l\'eliminazione', 'error'),
  })

  const openCreate = () => {
    setEditingPP(null)
    setForm(emptyForm)
    setFormError(null)
    setIsModalOpen(true)
  }

  const openEdit = (pp: Device) => {
    setEditingPP(pp)
    setForm({
      name: pp.name,
      model: pp.model ?? '',
      port_count: '',              // non modificabile dopo la creazione
      cabinet_id: pp.cabinet_id ?? '',
      notes: pp.notes ?? '',
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingPP(null)
    setFormError(null)
  }

  const handleSubmit = () => {
    if (!form.name.trim()) { setFormError('Il nome è obbligatorio'); return }
    if (!editingPP && (form.port_count === '' || Number(form.port_count) < 1)) {
      setFormError('Inserisci il numero di porte (minimo 1)')
      return
    }
    if (editingPP) {
      updateMutation.mutate({ id: editingPP.id, f: form })
    } else {
      createMutation.mutate(form)
    }
  }

  // Group by cabinet
  const groups: CabinetGroup[] = []
  for (const pp of data?.items ?? []) {
    const existing = groups.find(g => g.cabinetId === (pp.cabinet_id ?? null))
    if (existing) existing.pps.push(pp)
    else groups.push({ cabinetId: pp.cabinet_id ?? null, cabinetName: pp.cabinet_name ?? null, pps: [pp] })
  }
  groups.sort((a, b) => {
    if (a.cabinetName === null) return 1
    if (b.cabinetName === null) return -1
    return a.cabinetName.localeCompare(b.cabinetName)
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patch Panel</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data ? `${data.total} patch panel in ${groups.length} armadi` : 'Gestisci le porte dei patch panel'}
          </p>
        </div>
        {isAdmin() && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus size={15} />
            Nuovo patch panel
          </button>
        )}
      </div>

      {isLoading ? (
        <LoadingSpinner centered />
      ) : data?.items.length === 0 ? (
        <EmptyState
          icon={<Grid3X3 size={48} />}
          title="Nessun patch panel"
          description="Crea il primo patch panel per iniziare a gestire le connessioni fisiche."
          action={isAdmin() ? { label: 'Nuovo patch panel', onClick: openCreate } : undefined}
        />
      ) : (
        <div className="space-y-8">
          {groups.map(group => (
            <div key={group.cabinetId ?? 'none'} className="space-y-3">
              {/* Cabinet header */}
              <div className="flex items-center gap-2">
                <Server size={15} className="text-gray-400 flex-shrink-0" />
                <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  {group.cabinetName ?? 'Senza armadio'}
                </h2>
                <span className="text-xs text-gray-400">({group.pps.length})</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* PP cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {group.pps.map(pp => (
                  <PatchPanelCard
                    key={pp.id}
                    pp={pp}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingPP ? `Modifica — ${editingPP.name}` : 'Nuovo patch panel'}
        size="md"
        footer={
          <>
            <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Annulla
            </button>
            <button onClick={handleSubmit} disabled={isPending} className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {isPending ? 'Salvataggio...' : 'Salva'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{formError}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="es. PP-01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
            </div>

            {/* Numero porte (solo creazione) */}
            {!editingPP && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numero porte *</label>
                <input
                  type="number"
                  min={1}
                  max={512}
                  value={form.port_count}
                  onChange={e => setForm(p => ({ ...p, port_count: e.target.value ? Number(e.target.value) : '' }))}
                  placeholder="es. 24"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-400 mt-1">Non modificabile dopo la creazione</p>
              </div>
            )}

            {/* Armadio */}
            <div className={editingPP ? 'sm:col-span-1' : ''}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Armadio</label>
              <select
                value={form.cabinet_id}
                onChange={e => setForm(p => ({ ...p, cabinet_id: e.target.value ? Number(e.target.value) : '' }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">— Nessun armadio —</option>
                {cabinetsData?.items.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Modello */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modello</label>
              <input
                type="text"
                value={form.model}
                onChange={e => setForm(p => ({ ...p, model: e.target.value }))}
                placeholder="es. Panduit 24P"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Note */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Elimina patch panel"
        message={`Sei sicuro di voler eliminare "${deleteTarget?.name}"? Tutti i cavi collegati alle sue porte verranno rimossi.`}
        confirmLabel="Elimina"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id) }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default PatchPanelsPage
