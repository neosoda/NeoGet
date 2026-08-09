import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, ArrowRight, CheckCircle2, Download, RefreshCw, ShieldAlert, Sparkles } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { UpgradeResult } from '../types'
import { useSystemStatus } from '../hooks/useSystemStatus'

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

const formatVersion = (ver?: string) => {
  if (!ver || ver === 'Unknown' || ver === 'Inconnue' || ver === 'unknown') {
    return 'Inconnue'
  }
  return ver.startsWith('v') || ver.startsWith('V') ? ver : `v${ver}`
}

export default function UpgradesView({ loading, onUpgrade }: UpgradesViewProps) {
  const { isAdmin } = useSystemStatus()
  const [upgrades, setUpgrades] = useState<UpgradeResult[]>([])
  const [scanning, setScanning] = useState(false)
  const [hasScanned, setHasScanned] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localLoading, setLocalLoading] = useState<Set<string>>(new Set())
  const [upgradingAll, setUpgradingAll] = useState(false)
  const [recentlyUpgraded, setRecentlyUpgraded] = useState<Set<string>>(new Set())

  const scanUpgrades = async () => {
    setScanning(true)
    setError(null)
    try {
      const includeUnknown = localStorage.getItem('neoget-winget-include-unknown') === 'true'
      const results = await invoke<UpgradeResult[]>('check_upgrades', { includeUnknown })
      const normalizedResults = results
        .map(normalizeUpgradeResult)
        .filter((app): app is UpgradeResult => app !== null && !recentlyUpgraded.has(app.id))

      console.info(
        `[UpgradesView] Successfully fetched ${results.length} upgrades; ${normalizedResults.length} displayable upgrades.`,
        normalizedResults.slice(0, 10)
      )
      setUpgrades(normalizedResults)
      setHasScanned(true)
    } catch (e) {
      console.error(e)
      setError('Impossible de charger les mises à jour. Vérifiez que WinGet fonctionne correctement.')
    } finally {
      setScanning(false)
    }
  }

  useEffect(() => {
    scanUpgrades()

    const handleUpgradedEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail && detail.id) {
        setRecentlyUpgraded(prev => new Set(prev).add(detail.id))
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
    if (upgrades.length === 0 || upgradingAll) return
    const confirmed = confirm(`Voulez-vous lancer la mise à jour de ${upgrades.length} logiciels ?`)
    if (!confirmed) return

    setUpgradingAll(true)
    setError(null)
    try {
      const mode = localStorage.getItem('neoget-install-mode') === 'interactive' ? 'interactive' : 'silent'
      const items = upgrades.map(u => ({ id: u.id, name: u.name }))
      const result = await invoke<string>('upgrade_software_batch', { items, mode })
      console.info('[UpgradesView] Batch de mise à jour lancé :', result)
    } catch (e) {
      console.error('[UpgradesView] Échec du batch :', e)
      setError(`Impossible de démarrer la mise à jour groupée : ${e}`)
    } finally {
      setUpgradingAll(false)
    }
  }

  const handleRelaunchAdmin = async () => {
    try {
      await invoke('relaunch_as_admin')
    } catch (e) {
      console.error('Erreur relancement admin:', e)
    }
  }

  return (
    <div className="space-y-5 pb-24">
      {!isAdmin && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-600 dark:text-amber-400">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <p className="text-sm font-bold">Privilèges Administrateur recommandés</p>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                  Certains logiciels (ex: MEGAsync, Battle.net) exigent les droits administrateur pour être mis à jour.
                </p>
              </div>
            </div>
            <button
              onClick={handleRelaunchAdmin}
              className="btn-secondary shrink-0 border-amber-500/40 text-amber-600 hover:bg-amber-500/20 dark:text-amber-300"
              type="button"
            >
              <ShieldAlert className="h-4 w-4" />
              Relancer en Administrateur
            </button>
          </div>
        </div>
      )}

      <div className="surface-strong p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="page-title">Centre de mises à jour</h2>
            <p className="page-copy mt-2">
              Scannez les paquets obsolètes, priorisez les versions disponibles et gardez le poste propre.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={scanUpgrades} disabled={scanning || upgradingAll} className="btn-secondary" type="button">
              <RefreshCw className={`h-4 w-4 ${scanning ? 'animate-spin' : ''}`} />
              {scanning ? 'Recherche...' : 'Rechercher'}
            </button>
            {upgrades.length > 0 && (
              <button onClick={handleUpgradeAll} disabled={scanning || upgradingAll || localLoading.size > 0} className="btn-accent" type="button">
                <Download className="h-4 w-4" />
                {upgradingAll ? 'Mise à jour...' : `Tout mettre à jour (${upgrades.length})`}
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-2xl font-extrabold text-slate-950 dark:text-white">{upgrades.length}</p>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">mises à jour</p>
          </div>
          <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-2xl font-extrabold text-slate-950 dark:text-white">{localLoading.size}</p>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">en cours</p>
          </div>
          <div className="rounded-lg border border-success/20 bg-success/10 p-3">
            <p className="text-2xl font-extrabold text-emerald-700 dark:text-success">WinGet</p>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700/80 dark:text-success/80">source</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-error/25 bg-error/10 p-4 text-error">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {scanning ? (
          <motion.div
            key="upgrades-scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="surface-soft flex min-h-[360px] flex-col items-center justify-center p-8 text-center"
          >
            <div className="h-14 w-14 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
            <h3 className="mt-5 font-heading text-lg font-extrabold text-slate-950 dark:text-white">Analyse en cours</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">Lecture des paquets installés et des versions disponibles.</p>
          </motion.div>
        ) : upgrades.length > 0 ? (
          <motion.div
            key="upgrades-list"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="surface-strong overflow-hidden"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_160px_160px_150px] gap-4 border-b border-slate-200/70 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:border-white/10 max-lg:hidden">
              <span>Logiciel</span>
              <span>Version actuelle</span>
              <span>Disponible</span>
              <span className="text-right">Action</span>
            </div>
            <div className="divide-y divide-slate-200/70 dark:divide-white/10">
              {upgrades.map((app, idx) => {
                const isUpgrading = localLoading.has(app.id) || loading.has(app.id)
                return (
                  <div key={`${app.id}-${idx}`} className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_160px_160px_150px] lg:items-center">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-extrabold text-slate-950 dark:text-white">{app.name}</h3>
                      <p className="mt-1 truncate font-mono text-xs font-semibold text-slate-500">{app.id}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">Source : {app.source || 'WinGet'}</p>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-500">
                      <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-white/[0.055]">{formatVersion(app.version)}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-success">
                      <ArrowRight className="h-3.5 w-3.5 text-slate-500 max-lg:hidden" />
                      <span className="rounded-md border border-success/20 bg-success/10 px-2 py-1">{formatVersion(app.available)}</span>
                    </div>
                    <button
                      onClick={() => handleUpgrade(app.id, app.name)}
                      disabled={isUpgrading}
                      className="btn-primary justify-center px-3 py-2 text-xs"
                      type="button"
                    >
                      {isUpgrading ? (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      {isUpgrading ? 'Mise à jour...' : 'Mettre à jour'}
                    </button>
                  </div>
                )
              })}
            </div>
          </motion.div>
        ) : hasScanned ? (
          <motion.div
            key="upgrades-clean"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="surface-soft flex min-h-[360px] flex-col items-center justify-center p-8 text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-success/20 bg-success/10 text-success">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="mt-5 font-heading text-lg font-extrabold text-slate-950 dark:text-white">Tout est à jour</h3>
            <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
              Aucun logiciel obsolète détecté. Votre environnement peut respirer.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="upgrades-idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="surface-soft flex min-h-[360px] flex-col items-center justify-center p-8 text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <Sparkles className="h-8 w-8" />
            </div>
            <h3 className="mt-5 font-heading text-lg font-extrabold text-slate-950 dark:text-white">Prêt à scanner</h3>
            <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
              Lancez une recherche pour voir les paquets qui peuvent être mis à jour.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
