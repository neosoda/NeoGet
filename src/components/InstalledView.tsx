import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Trash2, RefreshCw, AlertTriangle, Shield, CheckCircle2 } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { InstalledResult } from '../types'

interface InstalledViewProps {
  onUninstall: (id: string, name: string) => Promise<void>
}

function normalizeInstalledResult(app: Partial<InstalledResult> | null | undefined): InstalledResult | null {
  if (!app) return null

  const name = String(app.name ?? '').trim()
  const id = String(app.id ?? '').trim()

  if (!name && !id) return null

  return {
    name: name || id,
    id: id || name,
    version: String(app.version ?? '').trim() || 'Inconnue',
    available: String(app.available ?? '').trim(),
    source: String(app.source ?? '').trim()
  }
}

export default function InstalledView({ onUninstall }: InstalledViewProps) {
  const [installedApps, setInstalledApps] = useState<InstalledResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [uninstallingAppId, setUninstallingAppId] = useState<string | null>(null)
  const [confirmUninstallId, setConfirmUninstallId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const fetchInstalledApps = async () => {
    setLoading(true)
    setError(null)
    try {
      const results = await invoke<InstalledResult[]>('get_installed_software')
      const normalizedResults = results
        .map(normalizeInstalledResult)
        .filter((app): app is InstalledResult => app !== null)

      console.info(
        `[InstalledView] Successfully fetched ${results.length} installed apps; ${normalizedResults.length} displayable apps.`,
        normalizedResults.slice(0, 10)
      )
      setInstalledApps(normalizedResults)
    } catch (e) {
      console.error(e)
      setError("Impossible de récupérer la liste des logiciels installés.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInstalledApps()

    const handleUninstalledEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail && detail.id) {
        setInstalledApps(prev => prev.filter(app => app.id !== detail.id))
      }
    }
    window.addEventListener('software-uninstalled', handleUninstalledEvent)
    return () => window.removeEventListener('software-uninstalled', handleUninstalledEvent)
  }, [])

  const filteredApps = useMemo(() => {
    return installedApps.filter(app => {
      if (!app || typeof app.name !== 'string' || typeof app.id !== 'string') {
        return false
      }
      return app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             app.id.toLowerCase().includes(searchQuery.toLowerCase())
    })
  }, [installedApps, searchQuery])

  const handleUninstall = async (id: string, name: string) => {
    setConfirmUninstallId(null)
    setUninstallingAppId(id)
    setError(null)
    setSuccessMessage(null)
    try {
      await onUninstall(id, name)
    } catch (e) {
      console.error(e)
      setError(`Échec de la désinstallation de ${name} : ${e}`)
    } finally {
      setUninstallingAppId(null)
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <div className="space-y-8">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold font-heading text-gray-900 dark:text-white">
              Logiciels Installés
            </h2>
            {installedApps.length > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary dark:bg-primary/20 dark:text-white border border-primary/20 font-extrabold shadow-sm">
                {installedApps.length} applications
              </span>
            )}
          </div>
          <p className="text-gray-650 dark:text-gray-400 mt-1.5">
            Consultez tous les logiciels présents sur votre système et désinstallez-les proprement
          </p>
        </div>
        <button
          onClick={fetchInstalledApps}
          disabled={loading}
          className="btn-primary flex items-center justify-center gap-2 self-start"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Recherche...' : 'Actualiser la liste'}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-500/30 text-red-600 dark:text-red-400 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-500/30 text-green-600 dark:text-green-400 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher parmi les applications installées (ex: chrome, visual studio)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field pl-12"
          disabled={loading}
        />
      </div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="installed-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center space-y-4"
          >
            <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            <p className="text-gray-600 dark:text-gray-400 font-medium animate-pulse">
              Chargement de la liste des logiciels installés...
            </p>
          </motion.div>
        ) : filteredApps.length > 0 ? (
          <div
            key="installed-grid"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredApps.map((app, idx) => {
              const isUninstalling = uninstallingAppId === app.id
              const isConfirming = confirmUninstallId === app.id

              return (
                <motion.div key={`${app.id}-${idx}`} variants={itemVariants}>
                  <div className={`group card h-full flex flex-col hover:shadow-xl transition-all duration-300 ${isConfirming ? 'border-amber-500 ring-1 ring-amber-500/20 bg-amber-500/5' : ''} ${isUninstalling ? 'opacity-70 pointer-events-none' : ''}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-primary transition-colors line-clamp-1">
                          {app.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-mono font-medium">
                            v{app.version}
                          </span>
                          {app.source && (
                            <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                              <Shield className="w-3 h-3 text-success/70" />
                              {app.source}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mb-6 pb-6 border-t border-gray-200 dark:border-gray-700 pt-4 flex-1">
                      <code className="text-xs font-mono text-gray-500 dark:text-gray-500 break-all block">
                        {app.id}
                      </code>
                    </div>

                    <AnimatePresence mode="wait">
                      {isConfirming ? (
                        <motion.div
                          key="confirm-uninstall"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex gap-2 w-full"
                        >
                          <button
                            onClick={() => handleUninstall(app.id, app.name)}
                            className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors"
                          >
                            Confirmer
                          </button>
                          <button
                            onClick={() => setConfirmUninstallId(null)}
                            className="flex-1 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white text-xs font-bold transition-colors"
                          >
                            Annuler
                          </button>
                        </motion.div>
                      ) : (
                        <motion.button
                          key="uninstall-btn"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setConfirmUninstallId(app.id)}
                          disabled={isUninstalling}
                          className="w-full py-2.5 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-50 hover:text-white flex items-center justify-center gap-2 font-bold text-sm transition-all disabled:opacity-50"
                        >
                          {isUninstalling ? (
                            <>
                              <div className="animate-spin w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full" />
                              Désinstallation...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4" />
                              Désinstaller
                            </>
                          )}
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <motion.div
            key="installed-empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center space-y-4"
          >
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'Aucun logiciel ne correspond à votre recherche.' : 'Aucun logiciel trouvé sur votre système.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
