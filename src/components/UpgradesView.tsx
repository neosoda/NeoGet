import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Download, CheckCircle2, AlertCircle, Sparkles, ArrowRight } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { UpgradeResult } from '../types'

interface UpgradesViewProps {
  loading: Set<string>
  onUpgrade: (id: string, name: string) => Promise<void>
}

function normalizeUpgradeResult(app: Partial<UpgradeResult> | null | undefined): UpgradeResult | null {
  if (!app) return null

  const name = String(app.name ?? '').trim()
  const id = String(app.id ?? '').trim()

  if (!name && !id) return null

  return {
    name: name || id,
    id: id || name,
    version: String(app.version ?? '').trim() || 'Inconnue',
    available: String(app.available ?? '').trim() || 'Inconnue',
    source: String(app.source ?? '').trim()
  }
}

export default function UpgradesView({ loading, onUpgrade }: UpgradesViewProps) {
  const [upgrades, setUpgrades] = useState<UpgradeResult[]>([])
  const [scanning, setScanning] = useState(false)
  const [hasScanned, setHasScanned] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localLoading, setLocalLoading] = useState<Set<string>>(new Set())

  const scanUpgrades = async () => {
    setScanning(true)
    setError(null)
    try {
      const results = await invoke<UpgradeResult[]>('check_upgrades')
      const normalizedResults = results
        .map(normalizeUpgradeResult)
        .filter((app): app is UpgradeResult => app !== null)

      console.info(
        `[UpgradesView] Successfully fetched ${results.length} upgrades; ${normalizedResults.length} displayable upgrades.`,
        normalizedResults.slice(0, 10)
      )
      setUpgrades(normalizedResults)
      setHasScanned(true)
    } catch (e) {
      console.error(e)
      setError("Impossible de charger les mises à jour. Assurez-vous que WinGet fonctionne correctement.")
    } finally {
      setScanning(false)
    }
  }

  useEffect(() => {
    scanUpgrades()

    const handleUpgradedEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail && detail.id) {
        setUpgrades(prev => prev.filter(item => item.id !== detail.id))
      }
    }
    window.addEventListener('software-upgraded', handleUpgradedEvent)
    return () => window.removeEventListener('software-upgraded', handleUpgradedEvent)
  }, [])

  const handleUpgrade = async (id: string, name: string) => {
    setLocalLoading(prev => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
    try {
      await onUpgrade(id, name)
    } catch (e) {
      console.error(e)
      alert(`Erreur lors de la mise à jour de ${name} : ${e}`)
    } finally {
      setLocalLoading(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleUpgradeAll = async () => {
    if (upgrades.length === 0) return
    const confirmed = confirm(`Voulez-vous lancer la mise à jour de ${upgrades.length} logiciels ?`)
    if (!confirmed) return

    // Mettre à jour séquentiellement
    for (const app of upgrades) {
      await handleUpgrade(app.id, app.name)
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <div className="space-y-8">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold font-heading text-gray-900 dark:text-white mb-2">
            Centre de Mises à jour
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Gardez votre système et vos applications à jour de manière sécurisée avec WinGet
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={scanUpgrades}
            disabled={scanning}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Recherche...' : 'Rechercher les mises à jour'}
          </button>
          {upgrades.length > 0 && (
            <button
              onClick={handleUpgradeAll}
              disabled={scanning || localLoading.size > 0}
              className="btn-accent flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Tout mettre à jour ({upgrades.length})
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-500/30 text-red-600 dark:text-red-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Main Area */}
      <AnimatePresence mode="wait">
        {scanning ? (
          <motion.div
            key="upgrades-scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center space-y-4"
          >
            <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              Analyse des packages système en cours...
            </p>
          </motion.div>
        ) : upgrades.length > 0 ? (
          <div
            key="upgrades-grid"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {upgrades.map((app, idx) => {
              const isUpgrading = localLoading.has(app.id) || loading.has(app.id)
              return (
                <motion.div key={`${app.id}-${idx}`} variants={itemVariants}>
                  <div className={`group card h-full flex flex-col hover:shadow-xl transition-all duration-300 ${isUpgrading ? 'border-primary ring-1 ring-primary/20' : ''}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                          {app.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-mono">
                            v{app.version}
                          </span>
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                          <span className="text-xs px-2 py-0.5 rounded-full bg-success/15 text-success font-semibold font-mono">
                            v{app.available}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-6 pb-6 border-t border-gray-200 dark:border-gray-700 pt-4 flex-1">
                      <code className="text-xs font-mono text-gray-500 dark:text-gray-500 break-all">
                        {app.id}
                      </code>
                      <p className="text-xs text-gray-400 mt-2">
                        Source : {app.source || 'WinGet'}
                      </p>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleUpgrade(app.id, app.name)}
                      disabled={isUpgrading}
                      className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpgrading ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                          Mise à jour...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Mettre à jour
                        </>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : hasScanned ? (
          <motion.div
            key="upgrades-clean"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Tout est à jour !</h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                Félicitations, aucun logiciel obsolète n'a été détecté sur votre ordinateur.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="upgrades-idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Analyser votre PC</h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                Lancez une recherche pour voir les logiciels installés pouvant être mis à jour.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
