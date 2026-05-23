import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }))
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type: 'success' | 'error' | 'info' }>
      const newToast: Toast = {
        id: Math.random().toString(36).substring(2, 9),
        message: customEvent.detail.message,
        type: customEvent.detail.type
      }
      setToasts(prev => [...prev, newToast])

      // Auto-remove after 4 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newToast.id))
      }, 4000)
    }

    window.addEventListener('show-toast', handleToastEvent)
    return () => window.removeEventListener('show-toast', handleToastEvent)
  }, [])

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success'
          const isError = toast.type === 'error'

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`p-4 rounded-2xl shadow-xl backdrop-blur-md border flex items-start gap-3 justify-between ${
                isSuccess
                  ? 'bg-success/90 dark:bg-success/20 border-success/30 text-white dark:text-success'
                  : isError
                  ? 'bg-red-600/90 dark:bg-red-950/40 border-red-500/30 text-white dark:text-red-400'
                  : 'bg-primary/95 dark:bg-gray-800/95 border-gray-200 dark:border-gray-700 text-white dark:text-white'
              }`}
            >
              <div className="flex items-start gap-3">
                {isSuccess && <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                {isError && <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                {!isSuccess && !isError && <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                <p className="text-sm font-semibold leading-snug break-words">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-0.5 rounded-lg hover:bg-white/10 dark:hover:bg-white/5 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
