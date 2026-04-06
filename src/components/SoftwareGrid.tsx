import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Search, Filter, Globe, PackageOpen, Plus, Minus, Check } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import softwareData from '../../software.json'

interface Software {
  name: string
  package: string
  description: string
}

interface Category {
  name: string
  icon: string
  color: string
  software: Software[]
}

interface WinGetResult {
  name: string
  id: string
  version: string
  source: string
}

interface CartItem {
  id: string
  name: string
}

interface SoftwareGridProps {
  darkMode?: boolean
  cart: CartItem[]
  onAddToCart: (item: CartItem) => void
  onRemoveFromCart: (id: string) => void
  onInstall: (id: string, name: string) => void
  loading: Set<string>
}

export default function SoftwareGrid({ 
  cart, 
  onAddToCart, 
  onRemoveFromCart, 
  onInstall,
  loading 
}: SoftwareGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Développement')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchMode, setSearchMode] = useState<'starter' | 'global'>('starter')
  const [globalSearchResults, setGlobalSearchResults] = useState<WinGetResult[]>([])
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false)

  const categories = softwareData.categories as Category[]
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
      setGlobalSearchResults(results)
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
      transition: { staggerChildren: 0.05 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  const isInCart = (id: string) => cart.some(item => item.id === id)

  return (
    <div className="space-y-8 pb-32">
      {/* Mode Switcher */}
      <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit mx-auto mb-8">
        <button
          onClick={() => setSearchMode('starter')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
            searchMode === 'starter'
              ? 'bg-white dark:bg-gray-700 shadow-sm text-primary'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <PackageOpen className="w-4 h-4" />
          Starter Pack
        </button>
        <button
          onClick={() => setSearchMode('global')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
            searchMode === 'global'
              ? 'bg-white dark:bg-gray-700 shadow-sm text-accent'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <Globe className="w-4 h-4" />
          Recherche WinGet
        </button>
      </div>

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
                  <div className={`group card h-full flex flex-col hover:shadow-xl transition-all duration-300 ${isInCart(app.package) ? 'border-primary ring-1 ring-primary/20' : ''}`}>
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
                        <p className="text-xs font-medium text-primary/70 dark:text-accent/70">
                          {selectedCategory}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 flex-1 line-clamp-2">
                      {app.description}
                    </p>
                    <div className="mb-6 pb-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                      <code className="text-xs font-mono text-gray-500 dark:text-gray-500 break-all">
                        {app.package}
                      </code>
                    </div>
                    
                    <div className="grid grid-cols-5 gap-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => isInCart(app.package) ? onRemoveFromCart(app.package) : onAddToCart({ id: app.package, name: app.name })}
                        className={`col-span-1 p-2 rounded-xl flex items-center justify-center transition-colors ${
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
                        className="col-span-4 btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                  </div>
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
            <motion.div
              key="global-results"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit="hidden"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {globalSearchResults.map((app) => (
                <motion.div key={app.id} variants={itemVariants}>
                  <div className={`group card h-full flex flex-col hover:shadow-xl transition-all duration-300 ${isInCart(app.id) ? 'border-accent ring-1 ring-accent/20' : ''}`}>
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
                          <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                            {app.version}
                          </span>
                          <span className="text-xs text-gray-500">
                            Source: {app.source}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mb-6 pb-6 border-t border-gray-200 dark:border-gray-700 pt-4 flex-1">
                      <code className="text-xs font-mono text-gray-500 dark:text-gray-500 break-all">
                        {app.id}
                      </code>
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => isInCart(app.id) ? onRemoveFromCart(app.id) : onAddToCart({ id: app.id, name: app.name })}
                        className={`col-span-1 p-2 rounded-xl flex items-center justify-center transition-colors ${
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
                        className="col-span-4 btn-accent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
          {searchQuery.length > 0 && searchQuery.length < 2 && (
             <p className="text-center py-12 text-gray-500 dark:text-gray-400">
               Tapez au moins 2 caractères pour rechercher...
             </p>
          )}
          {searchQuery.length >= 2 && globalSearchResults.length === 0 && !isSearchingGlobal && (
             <p className="text-center py-12 text-gray-500 dark:text-gray-400">
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
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {categories.reduce((acc, cat) => acc + cat.software.length, 0)} logiciels essentiels à travers {categories.length} catégories • Installation en quelques clics • Tous les outils pour démarrer
          </p>
        </motion.div>
      )}
    </div>
  )
}
