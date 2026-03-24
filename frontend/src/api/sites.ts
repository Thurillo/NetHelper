import apiClient from './client'
import type { Site, SiteCreate, PaginatedResponse, Cabinet } from '../types'

export const sitesApi = {
  list: async (params?: { page?: number; size?: number; search?: string }): Promise<PaginatedResponse<Site>> => {
    const response = await apiClient.get<PaginatedResponse<Site>>('/sites', { params })
    return response.data
  },

  get: async (id: number): Promise<Site> => {
    const response = await apiClient.get<Site>(`/sites/${id}`)
    return response.data
  },

  create: async (data: SiteCreate): Promise<Site> => {
    const response = await apiClient.post<Site>('/sites', data)
    return response.data
  },

  update: async (id: number, data: Partial<SiteCreate>): Promise<Site> => {
    const response = await apiClient.patch<Site>(`/sites/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/sites/${id}`)
  },

  getCabinets: async (siteId: number): Promise<Cabinet[]> => {
    const response = await apiClient.get<{ items: Cabinet[] }>(`/sites/${siteId}/cabinets`)
    return response.data.items ?? (response.data as unknown as Cabinet[])
  },

  getFloorPlan: async (siteId: number): Promise<{ floor_plan: string; floor_plan_name: string }> => {
    const response = await apiClient.get<{ floor_plan: string; floor_plan_name: string }>(`/sites/${siteId}/floor-plan`)
    return response.data
  },

  uploadFloorPlan: async (siteId: number, floorPlan: string, floorPlanName: string): Promise<Site> => {
    const response = await apiClient.put<Site>(`/sites/${siteId}/floor-plan`, { floor_plan: floorPlan, floor_plan_name: floorPlanName })
    return response.data
  },

  deleteFloorPlan: async (siteId: number): Promise<void> => {
    await apiClient.delete(`/sites/${siteId}/floor-plan`)
  },
}
