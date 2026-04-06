import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, X, AlertCircle } from 'lucide-react'

interface ProgressPayload {
  current_index: number
  total: number
  current_name: string
  message: string
  is_finished: boolean
  error: string | null
}

interface InstallationOverlayProps {
  onClose: () => void
  batchStatus: ProgressPayload | null
}

export default function InstallationOverlay({ onClose, batchStatus }: InstallationOverlayProps) {
  if (!batchStatus) return null

  const progress = (batchStatus.current_index / batchStatus.total) * 100

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {batchStatus.is_finished ? 'Installations terminées' : 'Installation en cours'}
            </h2>
            {batchStatus.is_finished && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            )}
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              {!batchStatus.is_finished ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="flex-shrink-0"
                >
                  <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary" />
                </motion.div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-8 h-8 text-success" />
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {batchStatus.current_name || (batchStatus.is_finished ? 'Succès !' : 'Initialisation...')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {batchStatus.message}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-gradient-to-r from-primary to-accent"
              />
            </div>
            <div className="mt-2 text-right text-xs font-medium text-gray-500">
              {batchStatus.current_index} / {batchStatus.total}
            </div>
          </div>

          {/* Error Message */}
          {batchStatus.error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold">Erreur :</p>
                <p className="line-clamp-3">{batchStatus.error}</p>
              </div>
            </motion.div>
          )}

          {/* Close Button (when finished) */}
          {batchStatus.is_finished && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold hover:opacity-90 transition-opacity"
            >
              Fermer
            </motion.button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
