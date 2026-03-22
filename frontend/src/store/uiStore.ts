import { create } from 'zustand'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface UiState {
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  pendingConflicts: number
  setPendingConflicts: (n: number) => void
  toasts: Toast[]
  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void
}

export const useUiStore = create<UiState>()((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  pendingConflicts: 0,
  setPendingConflicts: (n) => set({ pendingConflicts: n }),
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = `${Date.now()}-${Math.random()}`
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }))
    setTimeout(() => set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) })), 5000)
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) })),
}))
