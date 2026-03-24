import apiClient from './client'
import type { DashboardStats, DashboardSnapshot } from '../types'

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<DashboardStats>('/dashboard/stats')
    return response.data
  },

  getHistory: async (days = 30): Promise<DashboardSnapshot[]> => {
    const response = await apiClient.get<DashboardSnapshot[]>('/dashboard/history', { params: { days } })
    return response.data
  },
}
