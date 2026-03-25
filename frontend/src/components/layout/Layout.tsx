import React from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import ToastContainer from '../common/ToastContainer'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { usePendingCount } from '../../hooks/useConflicts'
import { useScanNotifier } from '../../hooks/useScanNotifier'

const Layout: React.FC = () => {
  const { user, accessToken } = useAuthStore()
  const { sidebarOpen, setSidebarOpen } = useUiStore()

  // Keep pending conflicts count in sync
  usePendingCount()
  // Show toast notifications when scans finish
  useScanNotifier()

  if (!user || !accessToken) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-screen bg-surface-100 overflow-hidden">
      {/* Mobile backdrop — closes sidebar when tapped */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}

export default Layout
