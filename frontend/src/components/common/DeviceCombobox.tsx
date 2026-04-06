import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { devicesApi } from '../../api/devices'
import { DeviceTypeBadge } from './Badge'
import type { Device, DeviceType } from '../../types'

interface DeviceComboboxProps {
  value: number | null
  onChange: (deviceId: number | null, device: Device | null) => void
  excludeDeviceId?: number
  excludeDeviceType?: DeviceType | DeviceType[]
  deviceType?: DeviceType
  placeholder?: string
  disabled?: boolean
  className?: string
}

/**
 * Combobox con ricerca server-side per selezionare un dispositivo.
 * Sostituisce i <select size=500> nei modal di collegamento porte.
 */
const DeviceCombobox: React.FC<DeviceComboboxProps> = ({
  value,
  onChange,
  excludeDeviceId,
  excludeDeviceType,
  deviceType,
  placeholder = 'Cerca dispositivo...',
  disabled = false,
  className = '',
}) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Cerca devices con debounce implicito (staleTime bassa)
  const { data, isFetching } = useQuery({
    queryKey: ['device-combobox', search, deviceType, excludeDeviceType],
    queryFn: () => devicesApi.list({
      search: search || undefined,
      device_type: deviceType,
      exclude_device_type: Array.isArray(excludeDeviceType) ? excludeDeviceType[0] : excludeDeviceType,
      size: 30,
      page: 1,
    }),
    enabled: open,
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  })

  // Recupera il dispositivo selezionato (per mostrare il nome quando closed)
  const { data: selectedDevice } = useQuery({
    queryKey: ['device-combobox-selected', value],
    queryFn: () => devicesApi.get(value!),
    enabled: !!value,
    staleTime: 60_000,
  })

  const items = (data?.items ?? []).filter(d => d.id !== excludeDeviceId)

  // Chiudi al click fuori
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Focus input quando si apre
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const handleSelect = useCallback((device: Device) => {
    onChange(device.id, device)
    setOpen(false)
    setSearch('')
  }, [onChange])

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null, null)
    setSearch('')
  }

  const displayName = selectedDevice
    ? selectedDevice.name + (selectedDevice.primary_ip ? ` — ${selectedDevice.primary_ip}` : '')
    : null

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(p => !p)}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2 text-sm
          border border-gray-300 rounded-lg bg-white text-left
          hover:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${open ? 'border-primary-400 ring-2 ring-primary-500' : ''}
        `}
      >
        <span className={displayName ? 'text-gray-900 truncate' : 'text-gray-400 truncate'}>
          {displayName ?? placeholder}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {value && !disabled && (
            <span
              onClick={handleClear}
              className="p-0.5 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search size={14} className="text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filtra..."
              className="flex-1 text-sm outline-none bg-transparent"
            />
            {isFetching && (
              <span className="w-3.5 h-3.5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            )}
          </div>

          {/* Results */}
          <ul className="max-h-56 overflow-y-auto py-1">
            {items.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-gray-400">
                {isFetching ? 'Caricamento...' : 'Nessun risultato'}
              </li>
            ) : (
              items.map(device => (
                <li key={device.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(device)}
                    className={`
                      w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm
                      hover:bg-primary-50 transition-colors
                      ${device.id === value ? 'bg-primary-50 font-medium' : ''}
                    `}
                  >
                    <DeviceTypeBadge type={device.device_type} />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate font-medium text-gray-900">{device.name}</span>
                      {device.primary_ip && (
                        <span className="block text-xs text-gray-400 font-mono">{device.primary_ip}</span>
                      )}
                    </span>
                    {device.cabinet_name && (
                      <span className="text-xs text-gray-400 flex-shrink-0">{device.cabinet_name}</span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

export default DeviceCombobox
