import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Search, Filter, Plus, Minus, Check } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import softwareData from '../../software.json'
import { Category, WinGetResult, CartItem, Software } from '../types'

interface SoftwareGridProps {
  darkMode?: boolean
  cart: CartItem[]
  onAddToCart: (item: CartItem) => void
  onRemoveFromCart: (id: string) => void
  onInstall: (id: string, name: string) => void
  loading: Set<string>
  mode: 'starter' | 'global'
}

function normalizeWinGetResult(app: Partial<WinGetResult> | null | undefined): WinGetResult | null {
  if (!app) return null

  const name = String(app.name ?? '').trim()
  const id = String(app.id ?? '').trim()

  if (!name && !id) return null

  return {
    name: name || id,
    id: id || name,
    version: String(app.version ?? '').trim() || 'Inconnue',
    source: String(app.source ?? '').trim()
  }
}

// Interactive Premium Glow Card Component
function GlowCard({ children, className, isInCart, themeColor }: { children: React.ReactNode, className?: string, isInCart: boolean, themeColor: 'primary' | 'accent' }) {
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  const borderClass = isInCart
    ? (themeColor === 'primary' ? 'border-primary ring-1 ring-primary/20' : 'border-accent ring-1 ring-accent/20')
    : 'border-gray-200 dark:border-gray-700/50'

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative overflow-hidden card h-full flex flex-col hover:shadow-xl transition-all duration-300 border ${borderClass} ${className || ''}`}
    >
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-px transition duration-300 z-0"
          style={{
            background: `radial-gradient(350px circle at ${coords.x}px ${coords.y}px, ${
              themeColor === 'primary' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(236, 72, 153, 0.10)'
            }, transparent 80%)`
          }}
        />
      )}
      <div className="relative z-10 h-full flex flex-col flex-1">
        {children}
      </div>
    </div>
  )
}

export default function SoftwareGrid({
  cart,
  onAddToCart,
  onRemoveFromCart,
  onInstall,
  loading,
  mode
}: SoftwareGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Développement')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [globalSearchResults, setGlobalSearchResults] = useState<WinGetResult[]>([])
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false)
  const [customApps, setCustomApps] = useState<Software[]>([])

  const searchMode = mode

  // Load custom added applications dynamically
  const loadCustomApps = () => {
    const saved = localStorage.getItem('neoget-custom-software')
    if (saved) {
      try {
        setCustomApps(JSON.parse(saved))
      } catch (e) {
        console.error(e)
      }
    } else {
      setCustomApps([])
    }
  }

  useEffect(() => {
    loadCustomApps()
    window.addEventListener('catalog-updated', loadCustomApps)
    return () => window.removeEventListener('catalog-updated', loadCustomApps)
  }, [])

  // Dynamic category compilation combining static software.json and localStorage items
  const categories = useMemo(() => {
    const baseCats = JSON.parse(JSON.stringify(softwareData.categories)) as Category[]

    customApps.forEach(app => {
      const catName = (app as any).category || 'Développement'
      const targetCat = baseCats.find(c => c.name === catName)
      if (targetCat) {
        if (!targetCat.software.some(s => s.package === app.package)) {
          targetCat.software.push({
            name: app.name,
            package: app.package,
            description: app.description
          })
        }
      }
    })
    return baseCats
  }, [customApps])

  const currentCategory = categories.find(cat => cat.name === selectedCategory)

  const filteredSoftware = useMemo(() => {
    if (!currentCategory) return []
    return currentCategory.software.filter(app =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [selectedCategory, searchQuery, currentCategory])

  useEffect(() => {
    if (searchMode === 'global' && searchQuery.length >= 2) {
      const timer = setTimeout(() => {
        handleGlobalSearch(searchQuery)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [searchQuery, searchMode])

  const handleGlobalSearch = async (query: string) => {
    setIsSearchingGlobal(true)
    try {
      const results = await invoke<WinGetResult[]>('search_winget', { query })
      const normalizedResults = results
        .map(normalizeWinGetResult)
        .filter((app): app is WinGetResult => app !== null)

      console.info(
        `[SoftwareGrid] Global search returned ${results.length} results; ${normalizedResults.length} displayable results.`,
        normalizedResults.slice(0, 10)
      )
      setGlobalSearchResults(normalizedResults)
    } catch (error) {
      console.error('Erreur recherche globale:', error)
    } finally {
      setIsSearchingGlobal(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.03 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 },
  }

  const isInCart = (id: string) => cart.some(item => item.id === id)

  return (
    <div className="space-y-8 pb-32">
      {searchMode === 'starter' ? (
        <>
          {/* Starter Pack Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold font-heading text-gray-900 dark:text-white mb-2">
              NeoGet Starter Pack
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Installation Windows fraîche - Tous les outils essentiels en un clic
            </p>
          </div>

          {/* Catégories */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
              <Filter className="w-4 h-4" />
              Catégories
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {categories.map((cat) => (
                <motion.button
                  key={cat.name}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedCategory(cat.name)
                    setSearchQuery('')
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                    selectedCategory === cat.name
                      ? `bg-gradient-to-r ${cat.color} text-white shadow-lg`
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {cat.name}
                </motion.button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="mb-8">
          <h2 className="text-3xl font-bold font-heading text-gray-900 dark:text-white mb-2">
            Recherche Globale
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Recherchez parmi des milliers de paquets disponibles sur les dépôts officiels WinGet
          </p>
        </div>
      )}

      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder={searchMode === 'starter' ? "Rechercher dans le starter pack..." : "Nom du logiciel (ex: vscode, spotify, vlc)..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field pl-12"
        />
        {isSearchingGlobal && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {searchMode === 'starter' ? (
        <>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {filteredSoftware.length} logiciel{filteredSoftware.length !== 1 ? 's' : ''} trouvé{filteredSoftware.length !== 1 ? 's' : ''} dans {currentCategory?.name}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedCategory + searchQuery}
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit="hidden"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredSoftware.map((app) => (
                <motion.div key={app.package} variants={itemVariants}>
                  <GlowCard isInCart={isInCart(app.package)} themeColor="primary">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                            {app.name}
                          </h3>
                          {isInCart(app.package) && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <p className="text-xs font-medium text-primary/70 dark:text-accent/70 mt-1">
                          {selectedCategory}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 flex-1 line-clamp-2 leading-relaxed">
                      {app.description}
                    </p>
                    <div className="mb-6 pb-6 border-t border-gray-150 dark:border-gray-700/50 pt-4">
                      <code className="text-xs font-mono text-gray-450 dark:text-gray-500 break-all">
                        {app.package}
                      </code>
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => isInCart(app.package) ? onRemoveFromCart(app.package) : onAddToCart({ id: app.package, name: app.name })}
                        className={`col-span-1 p-2.5 rounded-xl flex items-center justify-center transition-colors ${
                          isInCart(app.package)
                            ? 'bg-primary/10 text-primary border border-primary/20 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {isInCart(app.package) ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onInstall(app.package, app.name)}
                        disabled={loading.has(app.package)}
                        className="col-span-4 btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold"
                      >
                        {loading.has(app.package) ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                            Installation...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            Installer
                          </>
                        )}
                      </motion.button>
                    </div>
                  </GlowCard>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </>
      ) : (
        <>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {globalSearchResults.length} résultat{globalSearchResults.length !== 1 ? 's' : ''} trouvé{globalSearchResults.length !== 1 ? 's' : ''} sur WinGet
          </div>

          <AnimatePresence mode="wait">
            <div
              key="global-results"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {globalSearchResults.map((app) => (
                <motion.div key={app.id} variants={itemVariants}>
                  <GlowCard isInCart={isInCart(app.id)} themeColor="accent">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-accent transition-colors">
                            {app.name}
                          </h3>
                          {isInCart(app.id) && (
                            <Check className="w-4 h-4 text-accent" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium font-mono">
                            {app.version}
                          </span>
                          <span className="text-xs text-gray-500">
                            Source: {app.source}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mb-6 pb-6 border-t border-gray-150 dark:border-gray-700/50 pt-4 flex-1">
                      <code className="text-xs font-mono text-gray-450 dark:text-gray-500 break-all">
                        {app.id}
                      </code>
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => isInCart(app.id) ? onRemoveFromCart(app.id) : onAddToCart({ id: app.id, name: app.name })}
                        className={`col-span-1 p-2.5 rounded-xl flex items-center justify-center transition-colors ${
                          isInCart(app.id)
                            ? 'bg-accent/10 text-accent border border-accent/20 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {isInCart(app.id) ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onInstall(app.id, app.name)}
                        disabled={loading.has(app.id)}
                        className="col-span-4 btn-accent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold"
                      >
                        {loading.has(app.id) ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                            Installation...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            Installer
                          </>
                        )}
                      </motion.button>
                    </div>
                  </GlowCard>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
          {searchQuery.length > 0 && searchQuery.length < 2 && (
             <p className="text-center py-12 text-gray-550 dark:text-gray-400">
               Tapez au moins 2 caractères pour rechercher...
             </p>
          )}
          {searchQuery.length >= 2 && globalSearchResults.length === 0 && !isSearchingGlobal && (
             <p className="text-center py-12 text-gray-550 dark:text-gray-400">
               Aucun paquet WinGet trouvé pour "{searchQuery}"
             </p>
          )}
        </>
      )}

      {/* Footer Info (Starter only) */}
      {searchMode === 'starter' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 p-6 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 dark:from-primary/5 dark:to-accent/5 border border-primary/20 dark:border-primary/10"
        >
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">
            Starter Pack Complet
          </h3>
          <p className="text-gray-650 dark:text-gray-400 text-sm leading-relaxed">
            {categories.reduce((acc, cat) => acc + cat.software.length, 0)} logiciels essentiels à travers {categories.length} catégories • Installation en quelques clics • Tous les outils pour démarrer
          </p>
        </motion.div>
      )}
    </div>
  )
}
