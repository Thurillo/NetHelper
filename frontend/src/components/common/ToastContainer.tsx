import React from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useUiStore } from '../../store/uiStore'

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUiStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-sm pointer-events-auto max-w-sm
            ${toast.type === 'success' ? 'bg-green-600 text-white' : ''}
            ${toast.type === 'error' ? 'bg-red-600 text-white' : ''}
            ${toast.type === 'info' ? 'bg-gray-800 text-white' : ''}
          `}
        >
          <div className="flex-shrink-0 mt-0.5">
            {toast.type === 'success' && <CheckCircle size={16} />}
            {toast.type === 'error' && <AlertCircle size={16} />}
            {toast.type === 'info' && <Info size={16} />}
          </div>
          <span className="flex-1 leading-snug">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

export default ToastContainer
