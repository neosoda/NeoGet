import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, PackageOpen, Globe, RefreshCw, Monitor, Activity, Settings, Minimize2, CheckCircle2, X, Package, Shield, Search } from 'lucide-react'
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

// HTML5 Confetti Canvas Celebration Component
function CelebrationCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!active || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    let animationFrameId: number

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const colors = ['#6366f1', '#ec4899', '#10b981', '#3b82f6', '#f59e0b']
    const particles = Array.from({ length: 120 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * canvas.height,
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

        if (p.y < canvas.height) {
          finished = false
        }

        ctx.beginPath()
        ctx.lineWidth = p.r
        ctx.strokeStyle = p.color
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y)
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2)
        ctx.stroke()
      })

      if (!finished) {
        animationFrameId = requestAnimationFrame(draw)
      }
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

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[10000] w-full h-full"
    />
  )
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

  const [activeTab, setActiveTab] = useState<'starter' | 'search' | 'updates' | 'installed' | 'diagnostic' | 'sources'>('starter')
  const [isMinimized, setIsMinimized] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)

  // Side-panel auto-opening behavior when an installation batch launches
  useEffect(() => {
    if (installing) {
      setIsMinimized(false)
    }
  }, [installing])

  // Trigger custom confetti canvas on batch success
  useEffect(() => {
    if (batchStatus && batchStatus.is_finished && !batchStatus.error && batchStatus.total > 0) {
      setShowCelebration(true)
      showToast("Félicitations ! Toutes les installations ont réussi !", "success")
      const t = setTimeout(() => setShowCelebration(false), 6000)
      return () => clearTimeout(t)
    } else if (batchStatus && batchStatus.is_finished && batchStatus.error) {
      showToast("Installations terminées avec des avertissements.", "error")
    }
  }, [batchStatus])

  const handleExport = async () => {
    if (cart.length === 0) {
      showToast("Votre panier est vide. Ajoutez d'abord des logiciels à exporter.", "error")
      return
    }
    try {
      const msg = await invoke<string>('export_configuration', { items: cart })
      showToast(msg, "success")
    } catch (e) {
      console.error(e)
      showToast(`Erreur d'exportation : ${e}`, "error")
    }
  }

  const handleImport = async () => {
    try {
      const items = await invoke<any[]>('import_configuration')
      if (items && items.length > 0) {
        setCart(items)
        showToast(`${items.length} logiciel(s) importé(s) avec succès.`, "success")
      }
    } catch (e) {
      console.error(e)
      if (String(e) !== "Import annulé") {
        showToast(`Erreur d'importation : ${e}`, "error")
      }
    }
  }

  // Keyboard shortcut listener for Command Palette (Ctrl+K or Cmd+K)
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

  // Execute Command Palette actions
  const handlePaletteAction = (actionKey: string) => {
    if (actionKey === 'diag') {
      setActiveTab('diagnostic')
      showToast("Onglet diagnostic ouvert", "info")
    } else if (actionKey === 'fix') {
      setActiveTab('diagnostic')
      showToast("Lancement de la réparation de WinGet...", "info")
      // We will trigger a reset event
      window.dispatchEvent(new Event('trigger-winget-fix'))
    } else if (actionKey === 'export') {
      handleExport()
    } else if (actionKey === 'import') {
      handleImport()
    } else if (actionKey === 'clear') {
      handleClearCart()
      showToast("Le panier a été vidé.", "info")
    } else if (actionKey === 'theme') {
      toggleTheme()
      showToast("Thème basculé", "success")
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
        message: `Échec de la mise à jour`,
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
        message: `Échec de la désinstallation`,
        is_finished: true,
        error: String(e)
      })
    }
  }

  const handlePaletteAddToCart = (id: string, name: string) => {
    handleAddToCart({ id, name })
    showToast(`${name} ajouté au panier !`, "success")
  }

  const menuItems = [
    { id: 'starter', title: 'Starter Pack', icon: PackageOpen, color: 'text-primary' },
    { id: 'search', title: 'Recherche WinGet', icon: Globe, color: 'text-accent' },
    { id: 'updates', title: 'Mises à jour', icon: RefreshCw, color: 'text-primary' },
    { id: 'installed', title: 'Mes Logiciels', icon: Monitor, color: 'text-accent' },
    { id: 'diagnostic', title: 'System Doctor', icon: Activity, color: 'text-success' },
    { id: 'sources', title: 'Paramètres', icon: Settings, color: 'text-gray-400' }
  ]

  const tabTitles = {
    starter: 'Starter Pack',
    search: 'Recherche WinGet',
    updates: 'Centre de Mises à jour',
    installed: 'Mes Logiciels',
    diagnostic: 'System Doctor',
    sources: 'Paramètres & Catalogue'
  }

  return (
    <div className="flex h-screen overflow-hidden bg-light-bg dark:bg-[#070708] text-gray-900 dark:text-gray-50 transition-colors duration-300">
      {/* Glow Particles Confetti Layer */}
      <CelebrationCanvas active={showCelebration} />

      {/* Raycast Command Palette Modal */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onAction={handlePaletteAction}
        onAddToCart={handlePaletteAddToCart}
      />

      {/* Gradient Background Aura */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-[40vw] h-[40vh] bg-gradient-radial from-primary/10 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[40vw] h-[40vh] bg-gradient-radial from-accent/10 to-transparent blur-3xl" />
      </div>

      {/* Sleek Vertical Left Sidebar (macOS/Arc style) */}
      <aside className="w-64 flex flex-col bg-white/90 dark:bg-zinc-950/70 backdrop-blur-xl border-r border-gray-200/50 dark:border-zinc-900/50 p-4 justify-between select-none flex-shrink-0 z-20">
        <div className="space-y-6">
          {/* Logo / Branding */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 flex-shrink-0">
              <Package className="text-white w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <h2 className="font-extrabold text-base text-gray-900 dark:text-white leading-tight">NeoGet</h2>
              <span className="text-[9px] uppercase tracking-wider bg-accent/15 text-accent border border-accent/20 px-2.5 py-0.5 rounded-full font-extrabold block w-fit mt-1">
                Ultimate v3.0
              </span>
            </div>
          </div>

          {/* Quick Search Shortcut */}
          <button
            onClick={() => setIsPaletteOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-900/40 dark:hover:bg-zinc-900 rounded-xl border border-gray-200/50 dark:border-zinc-850/50 text-xs font-semibold text-gray-400 dark:text-gray-500 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <span>Palette de commandes...</span>
            </div>
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-800 border border-gray-250 dark:border-zinc-750/70 rounded shadow-xs text-[9px] uppercase font-bold tracking-wide">
              Ctrl K
            </kbd>
          </button>

          {/* Sidebar Menu items with sliding LayoutId spring pills */}
          <nav className="flex flex-col gap-1">
            {menuItems.map(item => {
              const isActive = activeTab === item.id
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 z-10 ${
                    isActive
                      ? 'text-primary dark:text-white'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-50/50 dark:hover:bg-zinc-900/40'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-pill"
                      className="absolute inset-0 bg-primary/10 dark:bg-primary/20 rounded-xl border-l-2 border-primary z-0"
                      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    />
                  )}
                  <Icon className={`w-4 h-4 relative z-10 ${isActive ? 'text-primary animate-pulse' : 'text-gray-400'}`} />
                  <span className="relative z-10 truncate">{item.title}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Bottom system credentials Card */}
        <div className="p-3.5 bg-gray-50/80 dark:bg-zinc-900/30 rounded-2xl border border-gray-200/50 dark:border-zinc-850/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-black uppercase flex-shrink-0">
              PC
            </div>
            <div className="min-w-0">
              <h4 className="font-extrabold text-xs text-gray-900 dark:text-white truncate">Neo PC</h4>
              <p className="text-[9px] text-gray-450 font-bold truncate flex items-center gap-1 mt-0.5 uppercase tracking-wide">
                <Shield className={`w-3.5 h-3.5 ${isAdmin ? 'text-success' : 'text-amber-500'}`} />
                {isAdmin ? 'Mode Administrateur' : 'Droits Standard'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main View Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden z-10">
        {/* Dynamic Glass Toolbar */}
        <Header
          darkMode={darkMode}
          onToggleTheme={toggleTheme}
          onExport={handleExport}
          onImport={handleImport}
          activeTitle={tabTitles[activeTab]}
        />

        {/* View Main Content Area */}
        <main className="flex-1 overflow-y-auto px-8 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto h-full"
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
                  <UpgradesView
                    loading={loading}
                    onUpgrade={handleUpgradeSoftware}
                  />
                )}
                {activeTab === 'installed' && (
                  <InstalledView
                    onUninstall={handleUninstallSoftware}
                  />
                )}
                {activeTab === 'diagnostic' && (
                  <SystemDoctorView />
                )}
                {activeTab === 'sources' && (
                  <SettingsView />
                )}
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global Toast Container */}
      <ToastContainer />

      {/* Cart Drawer */}
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

      {/* Floating Active Task queue pill (when minimized) */}
      {installing && isMinimized && batchStatus && (
        <motion.button
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 50 }}
          onClick={() => setIsMinimized(false)}
          className="fixed bottom-6 right-6 z-[999] bg-gradient-to-r from-primary to-accent text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 font-bold border border-white/20 hover:scale-105 transition-all"
        >
          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
          <span>{batchStatus.current_name || 'Installation...'} ({Math.round((batchStatus.current_index / batchStatus.total) * 100)}%)</span>
        </motion.button>
      )}

      {/* Background Task Queue Drawer Panel (Sidebar Drawer) */}
      <AnimatePresence>
        {installing && !isMinimized && batchStatus && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMinimized(true)}
              className="fixed inset-0 bg-black/60 z-[1000] backdrop-blur-xs"
            />
            {/* Sidebar drawer body */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white dark:bg-[#0b0a0a] z-[1001] shadow-2xl border-l border-gray-200/50 dark:border-zinc-900/50 p-6 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-900 pb-4 mb-6">
                <div>
                  <h3 className="font-extrabold text-xl text-gray-900 dark:text-white leading-tight">Suivi d'installation</h3>
                  <p className="text-xs text-gray-500 mt-0.5 font-bold uppercase tracking-wide">NeoGet Queue Manager</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-xl transition-colors text-gray-500"
                    title="Minimiser en arrière-plan"
                  >
                    <Minimize2 className="w-5 h-5" />
                  </button>
                  {batchStatus.is_finished && (
                    <button
                      onClick={closeOverlay}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-xl transition-colors text-gray-500"
                      title="Fermer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Detail */}
              <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-thin">
                <div className="flex items-center gap-4">
                  {!batchStatus.is_finished ? (
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary">
                        {Math.round((batchStatus.current_index / batchStatus.total) * 100)}%
                      </div>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-success/15 flex items-center justify-center flex-shrink-0 border border-success/20">
                      <CheckCircle2 className="w-6 h-6 text-success animate-bounce" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-base leading-tight">
                      {batchStatus.current_name || 'Initialisation...'}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 leading-snug font-semibold">{batchStatus.message}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="w-full h-2.5 bg-gray-100 dark:bg-zinc-900 rounded-full overflow-hidden border border-gray-200/50 dark:border-zinc-800/80">
                    <motion.div
                      initial={{ width: '0%' }}
                      animate={{ width: `${Math.round((batchStatus.current_index / batchStatus.total) * 100)}%` }}
                      className="h-full bg-gradient-to-r from-primary to-accent"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wide">
                    <span>Progression globale</span>
                    <span>{batchStatus.current_index} / {batchStatus.total}</span>
                  </div>
                </div>

                {/* Error status card */}
                {batchStatus.error && (
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex gap-2.5 items-start">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-bold">Erreur signalée :</p>
                      <p className="mt-1 leading-normal opacity-90">{batchStatus.error}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Close Drawer Button */}
              {batchStatus.is_finished && (
                <button
                  onClick={closeOverlay}
                  className="w-full btn-primary py-3.5 rounded-xl font-bold mt-4"
                >
                  Fermer la file d'attente
                </button>
              )}
             </motion.div>
           </>
         )}
       </AnimatePresence>
    </div>
  )
}

export default App
