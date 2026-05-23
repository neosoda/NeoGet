import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, CheckCircle2, RefreshCw, Search, ShieldCheck, Trash2, X } from 'lucide-react'
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
      setError('Impossible de récupérer la liste des logiciels installés.')
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
    const query = searchQuery.toLowerCase()
    return installedApps.filter(app =>
      app.name.toLowerCase().includes(query) ||
      app.id.toLowerCase().includes(query) ||
      app.version.toLowerCase().includes(query)
    )
  }, [installedApps, searchQuery])

  const handleUninstall = async (id: string, name: string) => {
    setConfirmUninstallId(null)
    setUninstallingAppId(id)
    setError(null)
    try {
      await onUninstall(id, name)
    } catch (e) {
      console.error(e)
      setError(`Échec de la désinstallation de ${name} : ${e}`)
    } finally {
      setUninstallingAppId(null)
    }
  }

  return (
    <div className="space-y-5 pb-24">
      <div className="surface-strong p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="page-title">Logiciels installés</h2>
            <p className="page-copy mt-2">
              Retrouvez les applications présentes sur le poste, filtrez rapidement et désinstallez sans perdre le fil.
            </p>
          </div>
          <button onClick={fetchInstalledApps} disabled={loading} className="btn-secondary self-start" type="button">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Actualisation...' : 'Actualiser'}
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-2xl font-extrabold text-slate-950 dark:text-white">{installedApps.length}</p>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">applications</p>
          </div>
          <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-2xl font-extrabold text-slate-950 dark:text-white">{filteredApps.length}</p>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">visibles</p>
          </div>
          <div className="rounded-lg border border-success/20 bg-success/10 p-3">
            <p className="text-2xl font-extrabold text-emerald-700 dark:text-success">Local</p>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700/80 dark:text-success/80">inventaire</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-error/25 bg-error/10 p-4 text-error">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        </div>
      )}

      <div className="surface-soft p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrer par nom, version ou package ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10"
            disabled={loading}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="installed-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="surface-soft flex min-h-[360px] flex-col items-center justify-center p-8 text-center"
          >
            <div className="h-14 w-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <h3 className="mt-5 font-heading text-lg font-extrabold text-slate-950 dark:text-white">Inventaire en cours</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">Lecture des applications installées localement.</p>
          </motion.div>
        ) : filteredApps.length > 0 ? (
          <motion.div
            key="installed-list"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="surface-strong overflow-hidden"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_140px_130px_180px] gap-4 border-b border-slate-200/70 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:border-white/10 max-lg:hidden">
              <span>Application</span>
              <span>Version</span>
              <span>Source</span>
              <span className="text-right">Gestion</span>
            </div>
            <div className="divide-y divide-slate-200/70 dark:divide-white/10">
              {filteredApps.map((app, idx) => {
                const isUninstalling = uninstallingAppId === app.id
                const isConfirming = confirmUninstallId === app.id

                return (
                  <div key={`${app.id}-${idx}`} className={`grid gap-4 px-4 py-4 transition lg:grid-cols-[minmax(0,1fr)_140px_130px_180px] lg:items-center ${isUninstalling ? 'opacity-60' : ''}`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 shrink-0 text-success" />
                        <h3 className="truncate text-sm font-extrabold text-slate-950 dark:text-white">{app.name}</h3>
                      </div>
                      <p className="mt-1 truncate font-mono text-xs font-semibold text-slate-500">{app.id}</p>
                    </div>
                    <span className="w-fit rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-500 dark:bg-white/[0.055]">
                      v{app.version}
                    </span>
                    <span className="text-xs font-bold text-slate-500">{app.source || 'Local'}</span>

                    {isConfirming ? (
                      <div className="flex gap-2 lg:justify-end">
                        <button
                          onClick={() => handleUninstall(app.id, app.name)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-error px-3 py-2 text-xs font-bold text-white"
                          type="button"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Confirmer
                        </button>
                        <button
                          onClick={() => setConfirmUninstallId(null)}
                          className="btn-secondary px-3 py-2 text-xs"
                          type="button"
                        >
                          <X className="h-3.5 w-3.5" />
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmUninstallId(app.id)}
                        disabled={isUninstalling}
                        className="justify-self-start rounded-lg border border-error/25 px-3 py-2 text-xs font-bold text-error transition hover:bg-error hover:text-white disabled:pointer-events-none disabled:opacity-50 lg:justify-self-end"
                        type="button"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {isUninstalling ? (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          {isUninstalling ? 'Désinstallation...' : 'Désinstaller'}
                        </span>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="installed-empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="surface-soft flex min-h-[320px] flex-col items-center justify-center p-8 text-center"
          >
            <Search className="h-8 w-8 text-slate-400" />
            <h3 className="mt-4 font-heading text-lg font-extrabold text-slate-950 dark:text-white">
              {searchQuery ? 'Aucun résultat' : 'Aucun logiciel détecté'}
            </h3>
            <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
              {searchQuery ? 'Modifiez le filtre pour retrouver une application.' : 'L’inventaire local ne contient pas encore de résultats affichables.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
