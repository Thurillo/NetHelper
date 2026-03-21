import React, { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import { patchPanelsApi } from '../../api/patchPanels'
import { useDevices } from '../../hooks/useDevices'
import { devicesApi } from '../../api/devices'
import type { PatchPortDetail, NetworkInterface, Device } from '../../types'

interface PortEditModalProps {
  isOpen: boolean
  onClose: () => void
  port: PatchPortDetail | null
  deviceId: number
  cabinetId: number | null
  onSaved: () => void
}

type ConnectionTarget = 'none' | 'switch' | 'patch_panel'

/** Estrae il numero porta dal nome (es. "port-5" → 5) */
function extractPortNumber(name: string): string {
  const m = name.match(/(\d+)$/)
  return m ? m[1] : name
}

const PortEditModal: React.FC<PortEditModalProps> = ({
  isOpen, onClose, port, deviceId, cabinetId, onSaved,
}) => {
  const [label, setLabel] = useState('')
  const [roomDestination, setRoomDestination] = useState('')
  const [notes, setNotes] = useState('')

  // Connessione switch
  const [selectedSwitchId, setSelectedSwitchId] = useState<number | ''>('')
  const [switchInterfaces, setSwitchInterfaces] = useState<NetworkInterface[]>([])
  const [selectedSwitchPortId, setSelectedSwitchPortId] = useState<number | ''>('')

  // Connessione patch panel
  const [selectedPpId, setSelectedPpId] = useState<number | ''>('')
  const [ppPorts, setPpPorts] = useState<PatchPortDetail[]>([])
  const [selectedPpPortId, setSelectedPpPortId] = useState<number | ''>('')

  const [connTarget, setConnTarget] = useState<ConnectionTarget>('none')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Switch: solo quelli nello stesso armadio o senza armadio
  const { data: allSwitches } = useDevices({ device_type: 'switch', size: 200 })
  const switches = (allSwitches?.items ?? []).filter((sw: Device) =>
    sw.cabinet_id === null || sw.cabinet_id === undefined || sw.cabinet_id === cabinetId
  )

  // Tutti i patch panel (per connessione cross-armadio)
  const { data: allPPs } = useDevices({ device_type: 'patch_panel', size: 200 })
  const otherPPs = (allPPs?.items ?? []).filter((pp: Device) => pp.id !== deviceId)

  useEffect(() => {
    if (port) {
      setLabel(port.interface.label ?? '')
      setRoomDestination(port.interface.room_destination ?? '')
      setNotes(port.interface.notes ?? '')
      setSelectedSwitchId('')
      setSelectedSwitchPortId('')
      setSelectedPpId('')
      setSelectedPpPortId('')
      setSwitchInterfaces([])
      setPpPorts([])
      setConnTarget('none')
      setError(null)
    }
  }, [port])

  // Carica porte switch quando viene selezionato uno switch
  useEffect(() => {
    if (selectedSwitchId) {
      devicesApi.getInterfaces(selectedSwitchId as number)
        .then(setSwitchInterfaces)
        .catch(() => setSwitchInterfaces([]))
      setSelectedSwitchPortId('')
    } else {
      setSwitchInterfaces([])
      setSelectedSwitchPortId('')
    }
  }, [selectedSwitchId])

  // Carica porte patch panel quando viene selezionato un PP
  useEffect(() => {
    if (selectedPpId) {
      patchPanelsApi.getPorts(selectedPpId as number)
        .then(ports => setPpPorts(ports.filter(p => p.linked_interface === null)))
        .catch(() => setPpPorts([]))
      setSelectedPpPortId('')
    } else {
      setPpPorts([])
      setSelectedPpPortId('')
    }
  }, [selectedPpId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!port) return
    setIsLoading(true)
    setError(null)
    try {
      const portId = port.interface.id

      // 1. Salva metadati
      await patchPanelsApi.updatePort(deviceId, portId, {
        label: label || null,
        room_destination: roomDestination || null,
        notes: notes || null,
      })

      // 2. Determina nuovo target interfaccia
      let newLinkInterfaceId: number | null = null
      if (connTarget === 'switch' && selectedSwitchPortId) {
        newLinkInterfaceId = Number(selectedSwitchPortId)
      } else if (connTarget === 'patch_panel' && selectedPpPortId) {
        newLinkInterfaceId = Number(selectedPpPortId)
      }

      const oldLinkId = port.linked_interface?.id ?? null

      if (newLinkInterfaceId !== null && newLinkInterfaceId !== oldLinkId) {
        if (oldLinkId && port.cable_id) {
          await patchPanelsApi.unlinkPort(deviceId, portId)
        }
        await patchPanelsApi.linkPort(deviceId, portId, newLinkInterfaceId)
      }

      onSaved()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore durante il salvataggio'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnlink = async () => {
    if (!port || !port.cable_id) return
    setIsLoading(true)
    setError(null)
    try {
      await patchPanelsApi.unlinkPort(deviceId, port.interface.id)
      onSaved()
      onClose()
    } catch {
      setError('Errore durante la rimozione del collegamento')
    } finally {
      setIsLoading(false)
    }
  }

  const portNum = port ? extractPortNumber(port.interface.name) : '—'
  const currentLinkLabel = port?.linked_interface
    ? `${port.linked_interface.device_name ?? '?'} → ${port.linked_interface.name}`
    : null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Modifica porta ${portNum}`}
      size="lg"
      closeOnBackdrop={false}
      footer={
        <>
          {port?.linked_interface && (
            <button
              type="button"
              onClick={handleUnlink}
              disabled={isLoading}
              className="mr-auto px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
            >
              Rimuovi collegamento
            </button>
          )}
          <button type="button" onClick={onClose} disabled={isLoading}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Annulla
          </button>
          <button type="submit" form="port-edit-form" disabled={isLoading}
            className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
            {isLoading ? 'Salvataggio...' : 'Salva'}
          </button>
        </>
      }
    >
      <form id="port-edit-form" onSubmit={handleSave} className="space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Etichetta porta</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="es. Scrivania 101"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Destinazione fisica</label>
          <input
            type="text"
            value={roomDestination}
            onChange={(e) => setRoomDestination(e.target.value)}
            placeholder="es. Ufficio A, Stanza 101, Piano 2"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <p className="text-xs text-gray-400 mt-1">Dove esce fisicamente questo cavo</p>
        </div>

        {/* Collegamento attuale */}
        {currentLinkLabel && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-500 mb-0.5">Collegata a</p>
            <p className="text-sm font-medium text-green-800 font-mono">{currentLinkLabel}</p>
          </div>
        )}

        {/* Tipo connessione */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {currentLinkLabel ? 'Cambia collegamento' : 'Collega a'}
          </label>
          <div className="flex gap-2">
            {(['none', 'switch', 'patch_panel'] as ConnectionTarget[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setConnTarget(t)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  connTarget === t
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                }`}
              >
                {t === 'none' ? 'Nessuno' : t === 'switch' ? 'Switch' : 'Patch Panel'}
              </button>
            ))}
          </div>
        </div>

        {/* Switch selector */}
        {connTarget === 'switch' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Switch</label>
              <select
                value={selectedSwitchId}
                onChange={(e) => setSelectedSwitchId(e.target.value ? Number(e.target.value) : '')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">-- Seleziona switch --</option>
                {switches.map((sw) => (
                  <option key={sw.id} value={sw.id}>
                    {sw.name}{sw.cabinet_name ? ` (${sw.cabinet_name})` : ''}
                  </option>
                ))}
              </select>
              {cabinetId && (
                <p className="text-xs text-gray-400 mt-1">
                  Solo switch nello stesso armadio o non ancora assegnati
                </p>
              )}
            </div>
            {switchInterfaces.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Porta dello switch</label>
                <select
                  value={selectedSwitchPortId}
                  onChange={(e) => setSelectedSwitchPortId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- Seleziona porta --</option>
                  {switchInterfaces.map((iface) => (
                    <option key={iface.id} value={iface.id}>
                      {iface.name}{iface.label ? ` (${iface.label})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {/* Patch Panel selector */}
        {connTarget === 'patch_panel' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patch Panel</label>
              <select
                value={selectedPpId}
                onChange={(e) => setSelectedPpId(e.target.value ? Number(e.target.value) : '')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">-- Seleziona patch panel --</option>
                {otherPPs.map((pp) => (
                  <option key={pp.id} value={pp.id}>
                    {pp.name}{pp.cabinet_name ? ` (${pp.cabinet_name})` : ''}
                  </option>
                ))}
              </select>
            </div>
            {ppPorts.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Porta del patch panel</label>
                <select
                  value={selectedPpPortId}
                  onChange={(e) => setSelectedPpPortId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- Seleziona porta --</option>
                  {ppPorts.map((p) => (
                    <option key={p.interface.id} value={p.interface.id}>
                      {extractPortNumber(p.interface.name)}
                      {p.interface.label ? ` — ${p.interface.label}` : ''}
                      {p.interface.room_destination ? ` → ${p.interface.room_destination}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {selectedPpId !== '' && ppPorts.length === 0 && (
              <p className="text-xs text-orange-500">Nessuna porta libera disponibile su questo patch panel.</p>
            )}
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </div>
      </form>
    </Modal>
  )
}

export default PortEditModal
