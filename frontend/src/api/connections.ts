import apiClient from './client'
import type { PaginatedResponse } from '../types'

export interface ConnectionPath {
  // Point A — end device
  device_id: number | null
  device_name: string | null
  device_type: string | null
  device_ip: string | null
  iface_a_id: number | null
  iface_a_name: string | null
  // Point B — patch panel (optional)
  pp_id: number | null
  pp_name: string | null
  pp_cabinet: string | null
  iface_b_pp_side: number | null
  iface_b_sw_side: number | null
  cable_ab_id: number | null
  // Point C — switch
  switch_id: number | null
  switch_name: string | null
  switch_ip: string | null
  iface_c_id: number | null
  iface_c_name: string | null
  cable_bc_id: number | null
}

export interface ConnectionFilters {
  q?: string
  switch_id?: number
  pp_id?: number
  device_id?: number
  cabinet_id?: number
  site_id?: number
  only_direct?: boolean
  page?: number
  size?: number
}

export const connectionsApi = {
  list: async (filters: ConnectionFilters = {}): Promise<PaginatedResponse<ConnectionPath>> => {
    const params: Record<string, string | number | boolean> = {}
    if (filters.q) params.q = filters.q
    if (filters.switch_id) params.switch_id = filters.switch_id
    if (filters.pp_id) params.pp_id = filters.pp_id
    if (filters.device_id) params.device_id = filters.device_id
    if (filters.cabinet_id) params.cabinet_id = filters.cabinet_id
    if (filters.site_id) params.site_id = filters.site_id
    if (filters.only_direct) params.only_direct = true
    params.page = filters.page ?? 1
    params.size = filters.size ?? 50
    const response = await apiClient.get<PaginatedResponse<ConnectionPath>>('/connections', { params })
    return response.data
  },
}
