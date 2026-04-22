import React from 'react'
import { clsx } from 'clsx'
import type { DeviceType, DeviceStatus, ConflictStatus, ConflictType } from '../../types'

type BadgeVariant =
  | 'green'
  | 'red'
  | 'blue'
  | 'yellow'
  | 'gray'
  | 'purple'
  | 'orange'
  | 'indigo'
  | 'teal'
  | 'pink'

const variantClasses: Record<BadgeVariant, string> = {
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-blue-100 text-blue-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  gray: 'bg-gray-100 text-gray-700',
  purple: 'bg-purple-100 text-purple-800',
  orange: 'bg-orange-100 text-orange-800',
  indigo: 'bg-indigo-100 text-indigo-800',
  teal: 'bg-teal-100 text-teal-800',
  pink: 'bg-pink-100 text-pink-800',
}

interface BadgeProps {
  children: React.ReactNode
  variant: BadgeVariant
  className?: string
  size?: 'sm' | 'md'
}

export const Badge: React.FC<BadgeProps> = ({ children, variant, className, size = 'md' }) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-xs',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

// Device status badge
export const DeviceStatusBadge: React.FC<{ status: DeviceStatus }> = ({ status }) => {
  const config: Record<DeviceStatus, { label: string; variant: BadgeVariant }> = {
    active: { label: 'Attivo', variant: 'green' },
    inactive: { label: 'Inattivo', variant: 'gray' },
    planned: { label: 'Pianificato', variant: 'blue' },
    decommissioned: { label: 'Dismesso', variant: 'red' },
  }
  const { label, variant } = config[status]
  return <Badge variant={variant}>{label}</Badge>
}

// Device type badge
export const DeviceTypeBadge: React.FC<{ type: DeviceType }> = ({ type }) => {
  const config: Record<DeviceType, { label: string; variant: BadgeVariant }> = {
    switch: { label: 'Switch', variant: 'blue' },
    router: { label: 'Router', variant: 'green' },
    access_point: { label: 'Access Point', variant: 'purple' },
    server: { label: 'Server', variant: 'orange' },
    patch_panel: { label: 'Patch Panel', variant: 'gray' },
    pdu: { label: 'PDU', variant: 'yellow' },
    firewall: { label: 'Firewall', variant: 'red' },
    ups: { label: 'UPS', variant: 'yellow' },
    unmanaged_switch: { label: 'Switch non gestito', variant: 'indigo' },
    workstation: { label: 'Workstation', variant: 'teal' },
    printer: { label: 'Stampante', variant: 'pink' },
    camera: { label: 'Telecamera', variant: 'indigo' },
    phone: { label: 'Telefono', variant: 'teal' },
    other: { label: 'Altro', variant: 'gray' },
  }
  const { label, variant } = config[type]
  return <Badge variant={variant}>{label}</Badge>
}

// Conflict status badge
export const ConflictStatusBadge: React.FC<{ status: ConflictStatus }> = ({ status }) => {
  const config: Record<ConflictStatus, { label: string; variant: BadgeVariant }> = {
    pending: { label: 'In attesa', variant: 'yellow' },
    accepted: { label: 'Accettato', variant: 'green' },
    rejected: { label: 'Rifiutato', variant: 'red' },
    ignored: { label: 'Ignorato', variant: 'gray' },
  }
  const { label, variant } = config[status]
  return <Badge variant={variant}>{label}</Badge>
}

// Conflict type badge
export const ConflictTypeBadge: React.FC<{ type: ConflictType }> = ({ type }) => {
  const config: Partial<Record<ConflictType, { label: string; variant: BadgeVariant }>> = {
    new_interface: { label: 'Nuova interfaccia', variant: 'green' },
    changed_ip: { label: 'Cambio IP', variant: 'blue' },
    missing_interface: { label: 'Interfaccia mancante', variant: 'red' },
    new_mac: { label: 'Nuovo MAC', variant: 'indigo' },
    changed_mac: { label: 'Cambio MAC', variant: 'indigo' },
    suspected_unmanaged_switch: { label: 'Switch non gestito', variant: 'orange' },
    new_device_discovered: { label: 'Nuovo device', variant: 'teal' },
    changed_hostname: { label: 'Cambio hostname', variant: 'teal' },
    duplicate_device: { label: 'Dispositivo duplicato', variant: 'red' },
    port_cable_conflict: { label: 'Conflitto cavo/porta', variant: 'purple' },
    other: { label: 'Altro', variant: 'gray' },
  }
  const c = config[type] ?? { label: type, variant: 'gray' as BadgeVariant }
  return <Badge variant={c.variant}>{c.label}</Badge>
}

// User role badge
export const UserRoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const config: Record<string, { label: string; variant: BadgeVariant }> = {
    admin: { label: 'Admin', variant: 'red' },
    operator: { label: 'Operatore', variant: 'blue' },
    viewer: { label: 'Visualizzatore', variant: 'gray' },
  }
  const c = config[role] ?? { label: role, variant: 'gray' as BadgeVariant }
  return <Badge variant={c.variant}>{c.label}</Badge>
}

export default Badge
