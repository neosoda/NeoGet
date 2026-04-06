import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import Header from './components/Header'
import SoftwareGrid from './components/SoftwareGrid'
import InstallationOverlay from './components/InstallationOverlay'
import CartDrawer from './components/CartDrawer'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

interface CartItem {
  id: string
  name: string
}

interface ProgressPayload {
  current_index: number
  total: number
  current_name: string
  message: string
  is_finished: boolean
  error: string | null
}

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true' ||
        window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  const [wingetInstalled, setWingetInstalled] = useState(true)
  const [isAdmin, setIsAdmin] = useState(true)
  const [installing, setInstalling] = useState(false)
  const [batchStatus, setBatchStatus] = useState<ProgressPayload | null>(null)
  const [loading, _setLoading] = useState<Set<string>>(new Set())
  const [cart, setCart] = useState<CartItem[]>([])

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const isInstalled = await invoke<boolean>('check_winget')
        setWingetInstalled(isInstalled)
        
        const adminStatus = await invoke<boolean>('is_admin')
        setIsAdmin(adminStatus)
      } catch (e) {
        console.error("Erreur check status:", e)
      }
    }
    checkStatus()

    // Écouter les progrès de l'installation batch
    const unlisten = listen<ProgressPayload>('installation-progress', (event) => {
      setBatchStatus(event.payload)
    })

    return () => {
      unlisten.then(f => f())
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('darkMode', String(darkMode))
  }, [darkMode])

  const handleInstallWinget = async () => {
    setInstalling(true)
    setBatchStatus({
      current_index: 0,
      total: 1,
      current_name: 'WinGet',
      message: 'Téléchargement et installation...',
      is_finished: false,
      error: null
    })
    try {
      const result = await invoke<string>('install_winget')
      setBatchStatus({
        current_index: 1,
        total: 1,
        current_name: 'WinGet',
        message: result,
        is_finished: true,
        error: null
      })
      setWingetInstalled(true)
    } catch (e) {
      setBatchStatus(prev => prev ? { ...prev, error: String(e), is_finished: true } : null)
    }
  }

  const handleAddToCart = (item: CartItem) => {
    if (!cart.some(i => i.id === item.id)) {
      setCart([...cart, item])
    }
  }

  const handleRemoveFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id))
  }

  const handleClearCart = () => setCart([])

  const handleInstallSoftware = async (id: string, name: string) => {
    console.info(`[App] Lancement installation individuelle : ${name} (${id})`)
    setInstalling(true)
    setBatchStatus({
      current_index: 0,
      total: 1,
      current_name: name,
      message: `Installation de ${name}...`,
      is_finished: false,
      error: null
    })
    
    try {
      const result = await invoke<string>('install_software', { id, name })
      console.info(`[App] Résultat installation ${name} :`, result)
      setBatchStatus({
        current_index: 1,
        total: 1,
        current_name: name,
        message: result,
        is_finished: true,
        error: null
      })
    } catch (e) {
      console.error(`[App] Erreur installation ${name} :`, e)
      setBatchStatus(prev => prev ? { ...prev, error: String(e), is_finished: true } : null)
    }
  }

  const handleInstallBatch = async () => {
    if (cart.length === 0) return
    
    console.info(`[App] Lancement installation batch pour ${cart.length} logiciels`)
    setInstalling(true)
    setBatchStatus({
      current_index: 0,
      total: cart.length,
      current_name: 'Préparation...',
      message: `Lancement de l'installation de ${cart.length} logiciels...`,
      is_finished: false,
      error: null
    })

    try {
      const result = await invoke('install_software_batch', { items: cart })
      console.info('[App] Batch lancé avec succès :', result)
      // Le statut sera mis à jour via les événements listen()
      setCart([]) // Vider le panier après lancement
    } catch (e) {
      console.error('[App] Échec du lancement du batch :', e)
      setBatchStatus(prev => prev ? { ...prev, error: String(e), is_finished: true } : null)
    }
  }

  const toggleTheme = () => {
    const next = !darkMode
    console.debug(`[App] Changement de thème : ${next ? 'Sombre' : 'Clair'}`)
    setDarkMode(next)
  }

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      {/* Gradient Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 dark:from-primary/10 dark:to-accent/10"></div>
      </div>

      {/* Header */}
      <Header darkMode={darkMode} onToggleTheme={toggleTheme} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold font-heading text-gray-900 dark:text-white mb-4">
            NeoGet
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Sélectionnez vos logiciels favoris et installez-les tous en un clic. Simple, rapide, fiable.
          </p>
        </motion.div>

        {/* Admin Status Card */}
        {!isAdmin && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-500/30"
          >
            <div className="flex items-center gap-4">
              <AlertCircle className="text-red-500 w-6 h-6" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Privilèges restreints</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  NeoGet n'est pas lancé en tant qu'administrateur. Certaines installations pourraient échouer.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* WinGet Status Card */}
        {!wingetInstalled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-6 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-orange/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <AlertCircle className="text-orange w-6 h-6" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">WinGet requis</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Installez WinGet pour utiliser NeoGet
                  </p>
                </div>
              </div>
              <button
                onClick={handleInstallWinget}
                className="btn-accent"
              >
                Installer WinGet
              </button>
            </div>
          </motion.div>
        )}

        {/* Software Grid */}
        <SoftwareGrid 
          darkMode={darkMode} 
          cart={cart}
          onAddToCart={handleAddToCart}
          onRemoveFromCart={handleRemoveFromCart}
          onInstall={handleInstallSoftware}
          loading={loading}
        />

        {/* Footer Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-center"
        >
          <div className="card">
            <div className="text-3xl font-bold text-primary mb-2">500+</div>
            <p className="text-gray-600 dark:text-gray-400">Logiciels disponibles</p>
          </div>
          <div className="card">
            <div className="text-3xl font-bold text-accent mb-2">100%</div>
            <p className="text-gray-600 dark:text-gray-400">Gratuit et open-source</p>
          </div>
          <div className="card">
            <div className="text-3xl font-bold text-success mb-2">⚡</div>
            <p className="text-gray-600 dark:text-gray-400">Ultra rapide</p>
          </div>
        </motion.div>
      </main>

      {/* Cart Drawer */}
      <AnimatePresence>
        {cart.length > 0 && !installing && (
          <CartDrawer 
            items={cart}
            onRemove={handleRemoveFromCart}
            onClear={handleClearCart}
            onInstall={handleInstallBatch}
          />
        )}
      </AnimatePresence>

      {/* Installation Overlay */}
      {installing && (
        <InstallationOverlay
          onClose={() => {
            setInstalling(false)
            setBatchStatus(null)
          }}
          batchStatus={batchStatus}
        />
      )}
    </div>
  )
}

export default App
