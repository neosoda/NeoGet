import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  AppWindow,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  FileSliders,
  Gauge,
  Lock,
  Power,
  RefreshCw,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wrench,
  X
} from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import type {
  CleanupItem,
  ScheduledTaskEntry,
  StartupEntry,
  WindowsAppPackage,
  WindowsTweak
} from '../types'
import { showToast } from './ToastContainer'

type ToolkitTab = 'tweaks' | 'cleanup' | 'apps' | 'startup' | 'tasks'

interface WindowsToolkitViewProps {
  isAdmin: boolean
}

const tabs: Array<{ id: ToolkitTab; label: string; icon: typeof Gauge }> = [
  { id: 'tweaks', label: 'Optimisations', icon: Gauge },
  { id: 'cleanup', label: 'Nettoyage', icon: DatabaseZap },
  { id: 'apps', label: 'Apps Windows', icon: AppWindow },
  { id: 'startup', label: 'Démarrage', icon: Rocket },
  { id: 'tasks', label: 'Tâches', icon: Clock3 }
]

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

const previewTweaks: WindowsTweak[] = [
  {
    id: 'show_file_extensions',
    name: 'Afficher les extensions',
    description: 'Rend visibles les extensions de fichiers dans l Explorateur.',
    category: 'Explorateur',
    risk: 'Faible',
    enabled: true,
    requires_admin: false,
    restart_required: 'Explorateur'
  },
  {
    id: 'classic_context_menu',
    name: 'Menu contextuel classique',
    description: 'Restaure le menu clic droit complet de Windows 10 sur Windows 11.',
    category: 'Explorateur',
    risk: 'Modere',
    enabled: false,
    requires_admin: false,
    restart_required: 'Explorateur'
  },
  {
    id: 'disable_game_dvr',
    name: 'Desactiver Game DVR',
    description: 'Coupe l enregistrement en arriere-plan Xbox Game Bar.',
    category: 'Gaming',
    risk: 'Faible',
    enabled: false,
    requires_admin: false,
    restart_required: null
  }
]

const previewCleanupItems: CleanupItem[] = [
  {
    id: 'user_temp',
    name: 'Temporaires utilisateur',
    description: 'Caches et fichiers temporaires du profil courant.',
    size_bytes: 458752000,
    item_count: 1248,
    requires_admin: false,
    selected: true
  },
  {
    id: 'thumbnail_cache',
    name: 'Miniatures Explorer',
    description: 'Base locale des miniatures d images et videos.',
    size_bytes: 73400320,
    item_count: 12,
    requires_admin: false,
    selected: true
  },
  {
    id: 'windows_update_cache',
    name: 'Cache Windows Update',
    description: 'Paquets telecharges par Windows Update.',
    size_bytes: 1291845632,
    item_count: 386,
    requires_admin: true,
    selected: false
  }
]

const previewWindowsApps: WindowsAppPackage[] = [
  {
    name: 'Microsoft.XboxGamingOverlay',
    package_full_name: 'Microsoft.XboxGamingOverlay_7.325.4191.0_x64__8wekyb3d8bbwe',
    publisher: 'CN=Microsoft Corporation',
    version: '7.325.4191.0',
    install_location: 'C:\\Program Files\\WindowsApps\\Microsoft.XboxGamingOverlay',
    is_framework: false,
    removable: true
  },
  {
    name: 'Microsoft.WindowsStore',
    package_full_name: 'Microsoft.WindowsStore_22504.1401.2.0_x64__8wekyb3d8bbwe',
    publisher: 'CN=Microsoft Corporation',
    version: '22504.1401.2.0',
    install_location: 'C:\\Program Files\\WindowsApps\\Microsoft.WindowsStore',
    is_framework: false,
    removable: false
  }
]

const previewStartupEntries: StartupEntry[] = [
  {
    id: 'HKCU|Run|OneDrive',
    name: 'OneDrive',
    command: 'C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe /background',
    location: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
    scope: 'HKCU',
    kind: 'Run',
    value_name: 'OneDrive',
    enabled: true
  }
]

const previewScheduledTasks: ScheduledTaskEntry[] = [
  {
    id: '\\Vendor\\|Updater',
    task_name: 'Updater',
    task_path: '\\Vendor\\',
    state: 'Ready',
    enabled: true
  }
]

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 o'
  const units = ['o', 'Ko', 'Mo', 'Go', 'To']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value >= 10 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="surface-soft flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
      <div className="h-12 w-12 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
      <h3 className="mt-4 font-heading text-lg font-extrabold text-slate-950 dark:text-white">{label}</h3>
      <p className="mt-1 text-sm font-medium text-slate-500">Lecture locale via PowerShell et Tauri.</p>
    </div>
  )
}

function EmptyPanel({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="surface-soft flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
      <Search className="h-8 w-8 text-slate-400" />
      <h3 className="mt-4 font-heading text-lg font-extrabold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{copy}</p>
    </div>
  )
}

function ToggleButton({
  enabled,
  busy,
  disabled,
  onClick
}: {
  enabled: boolean
  busy?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border p-0.5 transition disabled:pointer-events-none disabled:opacity-50 ${
        enabled
          ? 'border-accent/40 bg-accent'
          : 'border-slate-300 bg-slate-200 dark:border-white/10 dark:bg-white/[0.08]'
      }`}
      type="button"
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] text-slate-500 shadow transition ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      >
        {busy ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" /> : null}
      </span>
    </button>
  )
}

export default function WindowsToolkitView({ isAdmin }: WindowsToolkitViewProps) {
  const [activeTab, setActiveTab] = useState<ToolkitTab>('tweaks')
  const [tweaks, setTweaks] = useState<WindowsTweak[]>([])
  const [cleanupItems, setCleanupItems] = useState<CleanupItem[]>([])
  const [windowsApps, setWindowsApps] = useState<WindowsAppPackage[]>([])
  const [startupEntries, setStartupEntries] = useState<StartupEntry[]>([])
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTaskEntry[]>([])
  const [loading, setLoading] = useState<Partial<Record<ToolkitTab, boolean>>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [confirmPackage, setConfirmPackage] = useState<string | null>(null)

  const setTabLoading = (tab: ToolkitTab, value: boolean) => {
    setLoading(prev => ({ ...prev, [tab]: value }))
  }

  const fetchTweaks = async () => {
    setTabLoading('tweaks', true)
    try {
      if (!isTauriRuntime()) {
        setTweaks(previewTweaks)
        return
      }
      const results = await invoke<WindowsTweak[]>('get_windows_tweaks')
      setTweaks(results)
    } catch (e) {
      console.error(e)
      showToast(`Impossible de lire les optimisations : ${e}`, 'error')
    } finally {
      setTabLoading('tweaks', false)
    }
  }

  const fetchCleanupItems = async () => {
    setTabLoading('cleanup', true)
    try {
      if (!isTauriRuntime()) {
        setCleanupItems(previewCleanupItems)
        return
      }
      const results = await invoke<CleanupItem[]>('scan_cleanup_items')
      setCleanupItems(results)
    } catch (e) {
      console.error(e)
      showToast(`Impossible de scanner le nettoyage : ${e}`, 'error')
    } finally {
      setTabLoading('cleanup', false)
    }
  }

  const fetchWindowsApps = async () => {
    setTabLoading('apps', true)
    try {
      if (!isTauriRuntime()) {
        setWindowsApps(previewWindowsApps)
        return
      }
      const results = await invoke<WindowsAppPackage[]>('list_windows_app_packages')
      setWindowsApps(results)
    } catch (e) {
      console.error(e)
      showToast(`Impossible de lister les apps Windows : ${e}`, 'error')
    } finally {
      setTabLoading('apps', false)
    }
  }

  const fetchStartupEntries = async () => {
    setTabLoading('startup', true)
    try {
      if (!isTauriRuntime()) {
        setStartupEntries(previewStartupEntries)
        return
      }
      const results = await invoke<StartupEntry[]>('list_startup_entries')
      setStartupEntries(results)
    } catch (e) {
      console.error(e)
      showToast(`Impossible de lire le démarrage : ${e}`, 'error')
    } finally {
      setTabLoading('startup', false)
    }
  }

  const fetchScheduledTasks = async () => {
    setTabLoading('tasks', true)
    try {
      if (!isTauriRuntime()) {
        setScheduledTasks(previewScheduledTasks)
        return
      }
      const results = await invoke<ScheduledTaskEntry[]>('list_scheduled_tasks')
      setScheduledTasks(results)
    } catch (e) {
      console.error(e)
      showToast(`Impossible de lire les tâches planifiées : ${e}`, 'error')
    } finally {
      setTabLoading('tasks', false)
    }
  }

  useEffect(() => {
    fetchTweaks()
  }, [])

  useEffect(() => {
    setQuery('')
    if (activeTab === 'cleanup' && cleanupItems.length === 0) fetchCleanupItems()
    if (activeTab === 'apps' && windowsApps.length === 0) fetchWindowsApps()
    if (activeTab === 'startup' && startupEntries.length === 0) fetchStartupEntries()
    if (activeTab === 'tasks' && scheduledTasks.length === 0) fetchScheduledTasks()
  }, [activeTab])

  const filteredApps = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return windowsApps
    return windowsApps.filter(app =>
      app.name.toLowerCase().includes(q) ||
      app.package_full_name.toLowerCase().includes(q) ||
      app.publisher.toLowerCase().includes(q)
    )
  }, [query, windowsApps])

  const filteredStartup = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return startupEntries
    return startupEntries.filter(entry =>
      entry.name.toLowerCase().includes(q) ||
      entry.command.toLowerCase().includes(q) ||
      entry.location.toLowerCase().includes(q)
    )
  }, [query, startupEntries])

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return scheduledTasks
    return scheduledTasks.filter(task =>
      task.task_name.toLowerCase().includes(q) ||
      task.task_path.toLowerCase().includes(q) ||
      task.state.toLowerCase().includes(q)
    )
  }, [query, scheduledTasks])

  const cleanupTotal = useMemo(() => {
    return cleanupItems
      .filter(item => item.selected)
      .reduce((acc, item) => acc + item.size_bytes, 0)
  }, [cleanupItems])

  const tweaksByCategory = useMemo(() => {
    return tweaks.reduce<Record<string, WindowsTweak[]>>((acc, tweak) => {
      acc[tweak.category] = acc[tweak.category] ?? []
      acc[tweak.category].push(tweak)
      return acc
    }, {})
  }, [tweaks])

  const refreshActiveTab = () => {
    if (activeTab === 'tweaks') fetchTweaks()
    if (activeTab === 'cleanup') fetchCleanupItems()
    if (activeTab === 'apps') fetchWindowsApps()
    if (activeTab === 'startup') fetchStartupEntries()
    if (activeTab === 'tasks') fetchScheduledTasks()
  }

  const handleTweakToggle = async (tweak: WindowsTweak) => {
    const next = !tweak.enabled
    setBusyId(tweak.id)
    try {
      if (!isTauriRuntime()) {
        setTweaks(prev => prev.map(item => item.id === tweak.id ? { ...item, enabled: next } : item))
        showToast('Simulation navigateur : optimisation basculée.', 'info')
        return
      }
      const message = await invoke<string>('apply_windows_tweak', { id: tweak.id, enabled: next })
      setTweaks(prev => prev.map(item => item.id === tweak.id ? { ...item, enabled: next } : item))
      showToast(message, 'success')
    } catch (e) {
      console.error(e)
      showToast(`Échec de l’optimisation : ${e}`, 'error')
    } finally {
      setBusyId(null)
    }
  }

  const handleRestartExplorer = async () => {
    setBusyId('restart-explorer')
    try {
      if (!isTauriRuntime()) {
        showToast('Simulation navigateur : Explorer serait redémarré dans l’app Tauri.', 'info')
        return
      }
      const message = await invoke<string>('restart_explorer_shell')
      showToast(message, 'success')
      await fetchTweaks()
    } catch (e) {
      console.error(e)
      showToast(`Impossible de redémarrer Explorer : ${e}`, 'error')
    } finally {
      setBusyId(null)
    }
  }

  const handleClean = async () => {
    const ids = cleanupItems.filter(item => item.selected).map(item => item.id)
    if (ids.length === 0) {
      showToast('Sélectionnez au moins une zone à nettoyer.', 'error')
      return
    }

    setBusyId('cleanup')
    try {
      if (!isTauriRuntime()) {
        setCleanupItems(prev => prev.map(item => ids.includes(item.id) ? { ...item, size_bytes: 0, item_count: 0 } : item))
        showToast('Simulation navigateur : zones nettoyées.', 'info')
        return
      }
      const message = await invoke<string>('clean_windows_items', { ids })
      showToast(message, 'success')
      await fetchCleanupItems()
    } catch (e) {
      console.error(e)
      showToast(`Nettoyage incomplet : ${e}`, 'error')
    } finally {
      setBusyId(null)
    }
  }

  const handleRemoveApp = async (app: WindowsAppPackage) => {
    setBusyId(app.package_full_name)
    try {
      if (!isTauriRuntime()) {
        setWindowsApps(prev => prev.filter(item => item.package_full_name !== app.package_full_name))
        setConfirmPackage(null)
        showToast('Simulation navigateur : app supprimée.', 'info')
        return
      }
      const message = await invoke<string>('remove_windows_app_package', { package: app.package_full_name })
      showToast(message, 'success')
      setWindowsApps(prev => prev.filter(item => item.package_full_name !== app.package_full_name))
      setConfirmPackage(null)
    } catch (e) {
      console.error(e)
      showToast(`Suppression impossible : ${e}`, 'error')
    } finally {
      setBusyId(null)
    }
  }

  const handleStartupToggle = async (entry: StartupEntry) => {
    const next = !entry.enabled
    setBusyId(entry.id)
    try {
      if (!isTauriRuntime()) {
        setStartupEntries(prev => prev.map(item => item.id === entry.id ? { ...item, enabled: next } : item))
        showToast('Simulation navigateur : démarrage mis à jour.', 'info')
        return
      }
      const message = await invoke<string>('set_startup_entry_enabled', { entry, enabled: next })
      setStartupEntries(prev => prev.map(item => item.id === entry.id ? { ...item, enabled: next } : item))
      showToast(message, 'success')
    } catch (e) {
      console.error(e)
      showToast(`Mise à jour du démarrage impossible : ${e}`, 'error')
    } finally {
      setBusyId(null)
    }
  }

  const handleTaskToggle = async (task: ScheduledTaskEntry) => {
    const next = !task.enabled
    setBusyId(task.id)
    try {
      if (!isTauriRuntime()) {
        setScheduledTasks(prev => prev.map(item => item.id === task.id ? {
          ...item,
          enabled: next,
          state: next ? 'Ready' : 'Disabled'
        } : item))
        showToast('Simulation navigateur : tâche mise à jour.', 'info')
        return
      }
      const message = await invoke<string>('set_scheduled_task_enabled', {
        taskName: task.task_name,
        taskPath: task.task_path,
        enabled: next
      })
      setScheduledTasks(prev => prev.map(item => item.id === task.id ? {
        ...item,
        enabled: next,
        state: next ? 'Ready' : 'Disabled'
      } : item))
      showToast(message, 'success')
    } catch (e) {
      console.error(e)
      showToast(`Mise à jour de la tâche impossible : ${e}`, 'error')
    } finally {
      setBusyId(null)
    }
  }

  const renderTweaks = () => {
    if (loading.tweaks && tweaks.length === 0) return <LoadingPanel label="Chargement des optimisations" />

    return (
      <div className="space-y-5">
        <div className="surface-soft p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent">
                <FileSliders className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-extrabold text-slate-950 dark:text-white">Réglages Windows intégrés</h3>
                <p className="text-sm leading-6 text-slate-500">Toggles inspirés des deux projets intégrés, appliqués directement depuis NeoGet.</p>
              </div>
            </div>
            <button
              onClick={handleRestartExplorer}
              disabled={busyId === 'restart-explorer'}
              className="btn-secondary self-start"
              type="button"
            >
              <RefreshCw className={`h-4 w-4 ${busyId === 'restart-explorer' ? 'animate-spin' : ''}`} />
              Redémarrer Explorer
            </button>
          </div>
        </div>

        {!isAdmin && (
          <div className="rounded-lg border border-warning/25 bg-warning/10 p-4 text-amber-800 dark:text-warning">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm font-semibold">
                Les actions marquées administrateur resteront bloquées tant que NeoGet n’est pas relancé avec les droits élevés.
              </p>
            </div>
          </div>
        )}

        {Object.entries(tweaksByCategory).map(([category, items]) => (
          <section key={category} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-extrabold text-slate-950 dark:text-white">{category}</h3>
              <span className="rounded-md border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 dark:border-white/10">
                {items.filter(item => item.enabled).length}/{items.length} actifs
              </span>
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              {items.map(tweak => {
                const disabledByAdmin = tweak.requires_admin && !isAdmin
                return (
                  <motion.article
                    key={tweak.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-lg border p-4 transition ${
                      tweak.enabled
                        ? 'border-accent/35 bg-accent/[0.07]'
                        : 'border-slate-200/80 bg-white/[0.72] dark:border-white/10 dark:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-extrabold text-slate-950 dark:text-white">{tweak.name}</h4>
                          <span className={`rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                            tweak.risk === 'Faible'
                              ? 'bg-success/10 text-emerald-700 dark:text-success'
                              : 'bg-warning/10 text-amber-700 dark:text-warning'
                          }`}>
                            {tweak.risk}
                          </span>
                          {tweak.requires_admin && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 dark:bg-white/[0.07]">
                              <Lock className="h-3 w-3" />
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-400">{tweak.description}</p>
                        {tweak.restart_required && (
                          <p className="mt-2 text-xs font-semibold text-slate-500">Prise d’effet : {tweak.restart_required}</p>
                        )}
                      </div>
                      <ToggleButton
                        enabled={tweak.enabled}
                        busy={busyId === tweak.id}
                        disabled={disabledByAdmin}
                        onClick={() => handleTweakToggle(tweak)}
                      />
                    </div>
                  </motion.article>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    )
  }

  const renderCleanup = () => {
    if (loading.cleanup && cleanupItems.length === 0) return <LoadingPanel label="Scan des zones nettoyables" />

    return (
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-3">
          {cleanupItems.map(item => {
            const locked = item.requires_admin && !isAdmin
            return (
              <div key={item.id} className={`rounded-lg border p-4 transition ${
                item.selected ? 'border-primary/30 bg-primary/[0.07]' : 'border-slate-200/80 bg-white/[0.72] dark:border-white/10 dark:bg-white/[0.04]'
              }`}>
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={item.selected && !locked}
                    disabled={locked}
                    onChange={e => setCleanupItems(prev => prev.map(current =>
                      current.id === item.id ? { ...current, selected: e.target.checked } : current
                    ))}
                    className="mt-1 h-5 w-5 rounded border-slate-300 accent-cyan-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">{item.name}</h3>
                      <span className="rounded-md border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 dark:border-white/10">
                        {formatBytes(item.size_bytes)}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">{item.item_count} fichier(s)</span>
                      {item.requires_admin && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-warning/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-700 dark:text-warning">
                          <Lock className="h-3 w-3" />
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-400">{item.description}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </section>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <div className="surface-strong p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-heading text-base font-extrabold text-slate-950 dark:text-white">Nettoyage ciblé</h3>
                <p className="text-xs font-semibold text-slate-500">{formatBytes(cleanupTotal)} sélectionnés</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={fetchCleanupItems} disabled={loading.cleanup} className="btn-secondary px-3 text-xs" type="button">
                <RefreshCw className={`h-4 w-4 ${loading.cleanup ? 'animate-spin' : ''}`} />
                Scanner
              </button>
              <button onClick={handleClean} disabled={busyId === 'cleanup'} className="btn-primary px-3 text-xs" type="button">
                {busyId === 'cleanup' ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Wrench className="h-4 w-4" />
                )}
                Nettoyer
              </button>
            </div>
          </div>
        </aside>
      </div>
    )
  }

  const renderApps = () => {
    if (loading.apps && windowsApps.length === 0) return <LoadingPanel label="Inventaire des apps Windows" />
    if (filteredApps.length === 0) return <EmptyPanel title="Aucune app trouvée" copy="Modifiez le filtre ou relancez l’inventaire AppX." />

    return (
      <div className="surface-strong overflow-hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_130px_160px_170px] gap-4 border-b border-slate-200/70 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:border-white/10 max-lg:hidden">
          <span>Application</span>
          <span>Version</span>
          <span>Statut</span>
          <span className="text-right">Gestion</span>
        </div>
        <div className="divide-y divide-slate-200/70 dark:divide-white/10">
          {filteredApps.map(app => {
            const confirming = confirmPackage === app.package_full_name
            return (
              <div key={app.package_full_name} className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_130px_160px_170px] lg:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <AppWindow className="h-4 w-4 shrink-0 text-accent" />
                    <h3 className="truncate text-sm font-extrabold text-slate-950 dark:text-white">{app.name}</h3>
                  </div>
                  <p className="mt-1 truncate font-mono text-xs font-semibold text-slate-500">{app.package_full_name}</p>
                </div>
                <span className="w-fit rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-500 dark:bg-white/[0.055]">
                  {app.version}
                </span>
                <span className={`w-fit rounded-md px-2 py-1 text-xs font-bold ${
                  app.removable
                    ? 'bg-success/10 text-emerald-700 dark:text-success'
                    : 'bg-slate-100 text-slate-500 dark:bg-white/[0.055]'
                }`}>
                  {app.removable ? 'Amovible' : 'Protégée'}
                </span>

                {confirming ? (
                  <div className="flex gap-2 lg:justify-end">
                    <button onClick={() => handleRemoveApp(app)} className="inline-flex items-center gap-1.5 rounded-lg bg-error px-3 py-2 text-xs font-bold text-white" type="button">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Confirmer
                    </button>
                    <button onClick={() => setConfirmPackage(null)} className="btn-secondary px-3 py-2 text-xs" type="button">
                      <X className="h-3.5 w-3.5" />
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmPackage(app.package_full_name)}
                    disabled={!app.removable || busyId === app.package_full_name}
                    className="justify-self-start rounded-lg border border-error/25 px-3 py-2 text-xs font-bold text-error transition hover:bg-error hover:text-white disabled:pointer-events-none disabled:opacity-50 lg:justify-self-end"
                    type="button"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {busyId === app.package_full_name ? (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Supprimer
                    </span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderStartup = () => {
    if (loading.startup && startupEntries.length === 0) return <LoadingPanel label="Lecture des entrées de démarrage" />
    if (filteredStartup.length === 0) return <EmptyPanel title="Aucun démarrage trouvé" copy="Aucune entrée ne correspond au filtre actuel." />

    return (
      <div className="grid gap-3">
        {filteredStartup.map(entry => {
          const locked = entry.scope === 'HKLM' && !isAdmin
          return (
            <div key={entry.id} className="rounded-lg border border-slate-200/80 bg-white/[0.72] p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">{entry.name}</h3>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 dark:bg-white/[0.07]">
                      {entry.scope} · {entry.kind}
                    </span>
                    {locked && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-warning/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-700 dark:text-warning">
                        <Lock className="h-3 w-3" />
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="mt-2 break-all font-mono text-xs leading-5 text-slate-500">{entry.command}</p>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500">{entry.location}</p>
                </div>
                <ToggleButton
                  enabled={entry.enabled}
                  busy={busyId === entry.id}
                  disabled={locked}
                  onClick={() => handleStartupToggle(entry)}
                />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderTasks = () => {
    if (loading.tasks && scheduledTasks.length === 0) return <LoadingPanel label="Lecture des tâches planifiées" />
    if (filteredTasks.length === 0) return <EmptyPanel title="Aucune tâche trouvée" copy="NeoGet masque les tâches internes Microsoft pour garder une vue exploitable." />

    return (
      <div className="grid gap-3">
        {filteredTasks.map(task => {
          const locked = !isAdmin
          return (
            <div key={task.id} className="rounded-lg border border-slate-200/80 bg-white/[0.72] p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">{task.task_name}</h3>
                    <span className={`rounded-md px-2 py-1 text-xs font-bold ${
                      task.enabled ? 'bg-success/10 text-emerald-700 dark:text-success' : 'bg-slate-100 text-slate-500 dark:bg-white/[0.07]'
                    }`}>
                      {task.state}
                    </span>
                    {locked && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-warning/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-700 dark:text-warning">
                        <Lock className="h-3 w-3" />
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="mt-2 break-all font-mono text-xs leading-5 text-slate-500">{task.task_path}</p>
                </div>
                <ToggleButton
                  enabled={task.enabled}
                  busy={busyId === task.id}
                  disabled={locked}
                  onClick={() => handleTaskToggle(task)}
                />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderActiveTab = () => {
    if (activeTab === 'tweaks') return renderTweaks()
    if (activeTab === 'cleanup') return renderCleanup()
    if (activeTab === 'apps') return renderApps()
    if (activeTab === 'startup') return renderStartup()
    return renderTasks()
  }

  const activeCount = {
    tweaks: tweaks.filter(item => item.enabled).length,
    cleanup: cleanupItems.length,
    apps: windowsApps.length,
    startup: startupEntries.length,
    tasks: scheduledTasks.length
  }[activeTab]

  return (
    <div className="space-y-5 pb-24">
      <div className="surface-strong p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="page-title">Toolkit Windows</h2>
            <p className="page-copy mt-2">
              Optimisations, nettoyage, apps Windows, démarrage et tâches planifiées réunis dans NeoGet.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={refreshActiveTab} disabled={loading[activeTab]} className="btn-secondary" type="button">
              <RefreshCw className={`h-4 w-4 ${loading[activeTab] ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
            <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold ${
              isAdmin
                ? 'border-success/20 bg-success/10 text-emerald-700 dark:text-success'
                : 'border-warning/25 bg-warning/10 text-amber-700 dark:text-warning'
            }`}>
              {isAdmin ? <ShieldCheck className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {isAdmin ? 'Admin actif' : 'Droits standard'}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-2xl font-extrabold text-slate-950 dark:text-white">{activeCount}</p>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">éléments</p>
          </div>
          <div className="rounded-lg border border-accent/20 bg-accent/10 p-3">
            <p className="text-2xl font-extrabold text-teal-700 dark:text-accent">Winhance</p>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-700/80 dark:text-accent/80">customisation</p>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/10 p-3">
            <p className="text-2xl font-extrabold text-sky-700 dark:text-primary">Optimizer</p>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-sky-700/80 dark:text-primary/80">maintenance</p>
          </div>
        </div>
      </div>

      <div className="surface-soft p-3">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon
            const selected = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition ${
                  selected
                    ? 'border-accent/30 bg-accent/15 text-slate-950 dark:text-white'
                    : 'border-slate-200 bg-white/60 text-slate-600 hover:bg-white dark:border-white/10 dark:bg-white/[0.045] dark:text-slate-400 dark:hover:bg-white/[0.075]'
                }`}
                type="button"
              >
                <Icon className={`h-4 w-4 ${selected ? 'text-accent' : ''}`} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {activeTab !== 'tweaks' && activeTab !== 'cleanup' && (
        <div className="surface-soft p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrer par nom, chemin, éditeur ou statut..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.16 }}
        >
          {renderActiveTab()}
        </motion.div>
      </AnimatePresence>

      <div className="surface-soft p-4">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-accent" />
          <div>
            <p className="text-sm font-extrabold text-slate-950 dark:text-white">Fusion fonctionnelle</p>
            <p className="text-xs font-medium text-slate-500">
              Les fonctionnalités utiles des projets intégrés sont exposées dans NeoGet via des commandes locales contrôlées.
            </p>
          </div>
          <Power className="ml-auto h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  )
}
