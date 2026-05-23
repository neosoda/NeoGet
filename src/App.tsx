import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Command,
  Globe2,
  Layers3,
  Minimize2,
  Monitor,
  Package,
  PackageOpen,
  RefreshCw,
  Search,
  Settings,
  Shield,
  X
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import Header from './components/Header'
import SoftwareGrid from './components/SoftwareGrid'
import CartDrawer from './components/CartDrawer'
import UpgradesView from './components/UpgradesView'
import InstalledView from './components/InstalledView'
import ErrorBoundary from './components/ErrorBoundary'
import SystemDoctorView from './components/SystemDoctorView'
import SettingsView from './components/SettingsView'
import CommandPalette from './components/CommandPalette'
import ToastContainer, { showToast } from './components/ToastContainer'

import { useTheme } from './hooks/useTheme'
import { useSystemStatus } from './hooks/useSystemStatus'
import { useCart } from './hooks/useCart'
import { useInstallation } from './hooks/useInstallation'

type ActiveTab = 'starter' | 'search' | 'updates' | 'installed' | 'diagnostic' | 'sources'

interface MenuItem {
  id: ActiveTab
  title: string
  description: string
  icon: LucideIcon
}

const menuItems: MenuItem[] = [
  { id: 'starter', title: 'Starter Pack', description: 'Composer une base saine', icon: PackageOpen },
  { id: 'search', title: 'Recherche', description: 'Explorer WinGet', icon: Globe2 },
  { id: 'updates', title: 'Mises à jour', description: 'Garder le poste net', icon: RefreshCw },
  { id: 'installed', title: 'Installés', description: 'Auditer les apps locales', icon: Monitor },
  { id: 'diagnostic', title: 'System Doctor', description: 'Réparer WinGet', icon: Activity },
  { id: 'sources', title: 'Sources', description: 'Catalogue et préférences', icon: Settings }
]

const tabTitles: Record<ActiveTab, string> = {
  starter: 'Starter Pack',
  search: 'Recherche WinGet',
  updates: 'Centre de mises à jour',
  installed: 'Logiciels installés',
  diagnostic: 'System Doctor',
  sources: 'Sources et paramètres'
}

const tabDescriptions: Record<ActiveTab, string> = {
  starter: 'Choisissez les apps essentielles, préparez le panier, puis lancez une installation propre.',
  search: 'Trouvez rapidement un paquet officiel et ajoutez-le à votre flux d’installation.',
  updates: 'Scannez les versions disponibles et appliquez les mises à jour sans bruit.',
  installed: 'Inspectez les logiciels locaux, filtrez, puis désinstallez proprement.',
  diagnostic: 'Surveillez l’état du poste et réparez les sources WinGet si nécessaire.',
  sources: 'Ajustez le comportement d’installation et synchronisez vos catalogues.'
}

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-accent shadow-soft-dark">
        <Package className="h-5 w-5" />
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#0C1216] bg-lime" />
      </div>
      <div className="min-w-0">
        <div className="font-heading text-lg font-extrabold leading-none text-white">NeoGet</div>
        <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">WinGet prêt</div>
      </div>
    </div>
  )
}

function Sidebar({
  activeTab,
  onTabChange,
  onOpenCommand,
  isAdmin
}: {
  activeTab: ActiveTab
  onTabChange: (tab: ActiveTab) => void
  onOpenCommand: () => void
  isAdmin: boolean
}) {
  return (
    <aside className="hidden w-[282px] shrink-0 flex-col border-r border-white/10 bg-[#081014]/[0.92] px-4 py-4 text-slate-300 backdrop-blur-2xl lg:flex">
      <div className="space-y-5">
        <BrandMark />

        <button
          onClick={onOpenCommand}
          className="group flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2.5 text-left transition hover:border-white/20 hover:bg-white/[0.085]"
          type="button"
        >
          <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-400">
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">Palette de commandes</span>
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <Command className="h-3.5 w-3.5" />
            <kbd className="command-key border-white/10 bg-white/[0.06] text-slate-500">K</kbd>
          </span>
        </button>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-500 hover:bg-white/[0.055] hover:text-slate-200'
                }`}
                type="button"
              >
                {isActive && (
                  <motion.span
                    layoutId="active-sidebar-item"
                    className="absolute inset-0 rounded-lg border border-accent/20 bg-accent/[0.105]"
                    transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                  />
                )}
                <span className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  isActive ? 'bg-accent text-ink' : 'bg-white/[0.055] text-slate-500'
                }`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="relative min-w-0">
                  <span className="block truncate text-sm font-bold">{item.title}</span>
                  <span className="block truncate text-[11px] font-medium text-slate-500">{item.description}</span>
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      <div className="mt-auto space-y-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Session</p>
              <p className="mt-1 text-sm font-extrabold text-white">Neo PC</p>
            </div>
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              isAdmin ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
            }`}>
              <Shield className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span className={`h-2 w-2 rounded-full ${isAdmin ? 'bg-success' : 'bg-warning'}`} />
            {isAdmin ? 'Mode administrateur actif' : 'Droits standard'}
          </div>
        </div>
      </div>
    </aside>
  )
}

function MobileNav({ activeTab, onTabChange }: { activeTab: ActiveTab; onTabChange: (tab: ActiveTab) => void }) {
  return (
    <div className="border-b border-slate-200/70 bg-light-bg/[0.78] px-4 py-2 backdrop-blur-xl dark:border-white/10 dark:bg-dark-bg/[0.72] lg:hidden">
      <div className="flex gap-2 overflow-x-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition ${
                isActive
                  ? 'border-accent/30 bg-accent/15 text-ink dark:text-white'
                  : 'border-slate-200 bg-white/70 text-slate-500 dark:border-white/10 dark:bg-white/[0.045] dark:text-slate-400'
              }`}
              type="button"
            >
              <Icon className="h-3.5 w-3.5" />
              {item.title}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CelebrationCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!active || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let animationFrameId: number

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const colors = ['#32A7F3', '#22D3B6', '#B7F36B', '#FBBF24']
    const particles = Array.from({ length: 120 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.07 + 0.02,
      tiltAngle: 0
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let finished = true

      particles.forEach((p) => {
        p.tiltAngle += p.tiltAngleIncremental
        p.y += (Math.cos(p.tiltAngle) + 3 + p.r / 2) / 2
        p.x += Math.sin(p.tiltAngle)
        p.tilt = Math.sin(p.tiltAngle - p.r / 2) * 15

        if (p.y < canvas.height) finished = false

        ctx.beginPath()
        ctx.lineWidth = p.r
        ctx.strokeStyle = p.color
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y)
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2)
        ctx.stroke()
      })

      if (!finished) animationFrameId = requestAnimationFrame(draw)
    }

    draw()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
    }
  }, [active])

  if (!active) return null

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[10000] h-full w-full" />
}

function App() {
  const { darkMode, toggleTheme } = useTheme()
  const { isAdmin } = useSystemStatus()
  const { cart, handleAddToCart, handleRemoveFromCart, handleClearCart, setCart } = useCart()

  const {
    installing,
    batchStatus,
    loading,
    setInstalling,
    setBatchStatus,
    handleInstallSoftware,
    handleInstallBatch,
    closeOverlay
  } = useInstallation(handleClearCart)

  const [activeTab, setActiveTab] = useState<ActiveTab>('starter')
  const [isMinimized, setIsMinimized] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)

  useEffect(() => {
    if (installing) setIsMinimized(false)
  }, [installing])

  useEffect(() => {
    if (batchStatus && batchStatus.is_finished && !batchStatus.error && batchStatus.total > 0) {
      setShowCelebration(true)
      showToast('Toutes les installations ont réussi.', 'success')
      const t = setTimeout(() => setShowCelebration(false), 6000)
      return () => clearTimeout(t)
    }

    if (batchStatus && batchStatus.is_finished && batchStatus.error) {
      showToast('Installations terminées avec des avertissements.', 'error')
    }
  }, [batchStatus])

  const handleExport = async () => {
    if (cart.length === 0) {
      showToast("Votre panier est vide. Ajoutez d'abord des logiciels à exporter.", 'error')
      return
    }
    try {
      const msg = await invoke<string>('export_configuration', { items: cart })
      showToast(msg, 'success')
    } catch (e) {
      console.error(e)
      showToast(`Erreur d'exportation : ${e}`, 'error')
    }
  }

  const handleImport = async () => {
    try {
      const items = await invoke<any[]>('import_configuration')
      if (items && items.length > 0) {
        setCart(items)
        showToast(`${items.length} logiciel(s) importé(s) avec succès.`, 'success')
      }
    } catch (e) {
      console.error(e)
      if (String(e) !== 'Import annulé') {
        showToast(`Erreur d'importation : ${e}`, 'error')
      }
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        setIsPaletteOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handlePaletteAction = (actionKey: string) => {
    if (actionKey === 'diag') {
      setActiveTab('diagnostic')
      showToast('Onglet diagnostic ouvert', 'info')
    } else if (actionKey === 'fix') {
      setActiveTab('diagnostic')
      showToast('Lancement de la réparation de WinGet...', 'info')
      window.setTimeout(() => window.dispatchEvent(new Event('trigger-winget-fix')), 80)
    } else if (actionKey === 'export') {
      handleExport()
    } else if (actionKey === 'import') {
      handleImport()
    } else if (actionKey === 'clear') {
      handleClearCart()
      showToast('Le panier a été vidé.', 'info')
    } else if (actionKey === 'theme') {
      toggleTheme()
      showToast('Thème basculé', 'success')
    }
  }

  const handleUpgradeSoftware = async (id: string, name: string) => {
    console.info(`[App] Lancement de la mise à jour : ${name} (${id})`)
    setInstalling(true)
    setIsMinimized(false)
    setBatchStatus({
      current_index: 0,
      total: 1,
      current_name: name,
      message: `Mise à jour de ${name} en cours...`,
      progress_percent: 0,
      is_finished: false,
      error: null
    })

    try {
      const result = await invoke<string>('upgrade_software', { id, name })
      console.info(`[App] Résultat mise à jour ${name} :`, result)
      setBatchStatus({
        current_index: 1,
        total: 1,
        current_name: name,
        message: result,
        progress_percent: 100,
        is_finished: true,
        error: null
      })
      window.dispatchEvent(new CustomEvent('software-upgraded', { detail: { id } }))
    } catch (e) {
      console.error(`[App] Erreur mise à jour ${name} :`, e)
      setBatchStatus({
        current_index: 0,
        total: 1,
        current_name: name,
        message: 'Échec de la mise à jour',
        progress_percent: 100,
        is_finished: true,
        error: String(e)
      })
    }
  }

  const handleUninstallSoftware = async (id: string, name: string) => {
    console.info(`[App] Lancement de la désinstallation : ${name} (${id})`)
    setInstalling(true)
    setIsMinimized(false)
    setBatchStatus({
      current_index: 0,
      total: 1,
      current_name: name,
      message: `Désinstallation de ${name} en cours...`,
      progress_percent: 0,
      is_finished: false,
      error: null
    })

    try {
      const result = await invoke<string>('uninstall_software', { id, name })
      console.info(`[App] Résultat désinstallation ${name} :`, result)
      setBatchStatus({
        current_index: 1,
        total: 1,
        current_name: name,
        message: result,
        progress_percent: 100,
        is_finished: true,
        error: null
      })
      window.dispatchEvent(new CustomEvent('software-uninstalled', { detail: { id } }))
    } catch (e) {
      console.error(`[App] Erreur désinstallation ${name} :`, e)
      setBatchStatus({
        current_index: 0,
        total: 1,
        current_name: name,
        message: 'Échec de la désinstallation',
        progress_percent: 100,
        is_finished: true,
        error: String(e)
      })
    }
  }

  const handlePaletteAddToCart = (id: string, name: string) => {
    handleAddToCart({ id, name })
    showToast(`${name} ajouté au panier.`, 'success')
  }

  const progress = batchStatus
    ? Math.round(
        Math.min(
          100,
          Math.max(
            0,
            batchStatus.progress_percent ??
              (batchStatus.current_index / Math.max(1, batchStatus.total)) * 100
          )
        )
      )
    : 0

  return (
    <div className="app-bg relative flex h-screen overflow-hidden text-slate-950 transition-colors duration-300 dark:text-slate-100">
      <div className="app-grid pointer-events-none fixed inset-0" />
      <CelebrationCanvas active={showCelebration} />

      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onAction={handlePaletteAction}
        onAddToCart={handlePaletteAddToCart}
      />

      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenCommand={() => setIsPaletteOpen(true)}
        isAdmin={isAdmin}
      />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          darkMode={darkMode}
          onToggleTheme={toggleTheme}
          onExport={handleExport}
          onImport={handleImport}
          onOpenCommand={() => setIsPaletteOpen(true)}
          activeTitle={tabTitles[activeTab]}
          activeDescription={tabDescriptions[activeTab]}
          isAdmin={isAdmin}
        />
        <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
              className="mx-auto h-full max-w-[1500px]"
            >
              <ErrorBoundary>
                {activeTab === 'starter' && (
                  <SoftwareGrid
                    darkMode={darkMode}
                    cart={cart}
                    onAddToCart={handleAddToCart}
                    onRemoveFromCart={handleRemoveFromCart}
                    onInstall={handleInstallSoftware}
                    loading={loading}
                    mode="starter"
                  />
                )}
                {activeTab === 'search' && (
                  <SoftwareGrid
                    darkMode={darkMode}
                    cart={cart}
                    onAddToCart={handleAddToCart}
                    onRemoveFromCart={handleRemoveFromCart}
                    onInstall={handleInstallSoftware}
                    loading={loading}
                    mode="global"
                  />
                )}
                {activeTab === 'updates' && (
                  <UpgradesView loading={loading} onUpgrade={handleUpgradeSoftware} />
                )}
                {activeTab === 'installed' && (
                  <InstalledView onUninstall={handleUninstallSoftware} />
                )}
                {activeTab === 'diagnostic' && <SystemDoctorView />}
                {activeTab === 'sources' && <SettingsView />}
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <ToastContainer />

      <AnimatePresence>
        {cart.length > 0 && !installing && (
          <CartDrawer
            items={cart}
            onRemove={handleRemoveFromCart}
            onClear={handleClearCart}
            onInstall={() => handleInstallBatch(cart)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {installing && isMinimized && batchStatus && (
          <motion.button
            initial={{ scale: 0.92, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 24 }}
            onClick={() => setIsMinimized(false)}
            className="fixed bottom-5 right-5 z-[999] flex items-center gap-3 rounded-lg border border-accent/25 bg-[#0E171D]/[0.92] px-4 py-3 text-sm font-bold text-white shadow-soft-dark backdrop-blur-xl transition hover:border-accent/40"
            type="button"
          >
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <span className="max-w-[220px] truncate">{batchStatus.current_name || 'Installation...'}</span>
            <span className="text-accent">{progress}%</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {installing && !isMinimized && batchStatus && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.62 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMinimized(true)}
              className="fixed inset-0 z-[1000] bg-black backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed bottom-0 right-0 top-0 z-[1001] flex w-full max-w-md flex-col border-l border-white/10 bg-[#091116]/[0.96] p-5 text-white shadow-soft-dark backdrop-blur-2xl"
            >
              <div className="mb-6 flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-accent">
                    <Layers3 className="h-3.5 w-3.5" />
                    Queue Manager
                  </div>
                  <h3 className="mt-2 font-heading text-2xl font-extrabold">Suivi d'installation</h3>
                  <p className="mt-1 text-sm text-slate-400">Progression claire, erreurs visibles, aucun bruit inutile.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="icon-button border-white/10 bg-white/[0.055] text-slate-400 hover:bg-white/[0.09] hover:text-white"
                    title="Minimiser"
                    type="button"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </button>
                  {batchStatus.is_finished && (
                    <button
                      onClick={closeOverlay}
                      className="icon-button border-white/10 bg-white/[0.055] text-slate-400 hover:bg-white/[0.09] hover:text-white"
                      title="Fermer"
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto pr-1">
                <div className="surface-soft border-white/10 bg-white/[0.045] p-4">
                  <div className="flex items-center gap-4">
                    {!batchStatus.is_finished ? (
                      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
                        <span className="absolute inset-0 rounded-full border-4 border-white/10" />
                        <span className="absolute inset-0 animate-spin rounded-full border-4 border-accent border-t-transparent" />
                        <span className="text-xs font-extrabold text-accent">{progress}%</span>
                      </div>
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-success/20 bg-success/10 text-success">
                        <CheckCircle2 className="h-7 w-7" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="truncate text-base font-extrabold text-white">
                        {batchStatus.current_name || 'Initialisation...'}
                      </h4>
                      <p className="mt-1 text-sm leading-5 text-slate-400">{batchStatus.message}</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2">
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: `${progress}%` }}
                        className="h-full rounded-full bg-accent"
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      <span>Progression</span>
                      <span>{batchStatus.current_index} / {batchStatus.total}</span>
                    </div>
                  </div>
                </div>

                {batchStatus.error && (
                  <div className="rounded-lg border border-error/25 bg-error/10 p-4 text-error">
                    <div className="flex gap-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <p className="text-sm font-bold">Erreur signalée</p>
                        <p className="mt-1 text-sm leading-5 text-rose-200">{batchStatus.error}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {batchStatus.is_finished && (
                <button onClick={closeOverlay} className="btn-accent mt-5 w-full py-3" type="button">
                  Fermer la file d'attente
                </button>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
