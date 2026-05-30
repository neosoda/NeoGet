import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'

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

      window.setTimeout(() => {
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
    <div className="fixed bottom-5 right-5 z-[9999] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success'
          const isError = toast.type === 'error'

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.16 } }}
              className={`rounded-lg border p-3 shadow-soft-dark backdrop-blur-2xl ${
                isSuccess
                  ? 'border-success/25 bg-success/15 text-success'
                  : isError
                    ? 'border-error/25 bg-error/15 text-error'
                    : 'border-primary/25 bg-primary/15 text-primary'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {isSuccess && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />}
                  {isError && <XCircle className="mt-0.5 h-5 w-5 shrink-0" />}
                  {!isSuccess && !isError && <Info className="mt-0.5 h-5 w-5 shrink-0" />}
                  <p className="text-sm font-bold leading-5 text-slate-950 dark:text-white">{toast.message}</p>
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="rounded-md p-0.5 text-slate-500 transition hover:bg-white/10 hover:text-white"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
