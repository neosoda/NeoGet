import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Terminal, Activity, ShieldAlert, Download, Upload, Trash2, Sun, Sparkles } from 'lucide-react'
import softwareData from '../../software.json'


interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onAction: (actionKey: string) => void
  onAddToCart: (id: string, name: string) => void
}

interface PaletteAction {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  actionKey: string
  category: 'Actions' | 'Logiciels'
}

export default function CommandPalette({ isOpen, onClose, onAction, onAddToCart }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Actions list
  const actions: PaletteAction[] = [
    { id: 'diag', title: 'Lancer le diagnostic', description: 'Analyser la RAM, les disques et WinGet', icon: <Activity className="w-4 h-4" />, actionKey: 'diag', category: 'Actions' },
    { id: 'fix', title: 'Réparer WinGet', description: 'Doctor Fix - Réinitialiser les index et sources', icon: <ShieldAlert className="w-4 h-4" />, actionKey: 'fix', category: 'Actions' },
    { id: 'export', title: 'Exporter la configuration', description: 'Sauvegarder le panier local dans un fichier JSON', icon: <Upload className="w-4 h-4" />, actionKey: 'export', category: 'Actions' },
    { id: 'import', title: 'Importer une configuration', description: 'Charger une liste de logiciels depuis un fichier JSON', icon: <Download className="w-4 h-4" />, actionKey: 'import', category: 'Actions' },
    { id: 'clear', title: 'Vider le panier', description: 'Retirer tous les logiciels du panier actif', icon: <Trash2 className="w-4 h-4" />, actionKey: 'clear', category: 'Actions' },
    { id: 'theme', title: 'Basculer le thème (Clair / Sombre)', description: 'Changer l\'apparence visuelle globale', icon: <Sun className="w-4 h-4" />, actionKey: 'theme', category: 'Actions' }
  ]

  // Flatten all apps from software.json to search in command palette
  const apps: PaletteAction[] = useMemo(() => {
    const list: PaletteAction[] = []
    softwareData.categories.forEach(cat => {
      cat.software.forEach(app => {
        list.push({
          id: app.package,
          title: app.name,
          description: `Ajouter au panier (starter pack : ${cat.name})`,
          icon: <Sparkles className="w-4 h-4 text-accent" />,
          actionKey: `add:${app.package}:${app.name}`,
          category: 'Logiciels'
        })
      })
    })
    return list
  }, [])

  // Filtered items (combine Actions and Apps matching query)
  const filteredItems = useMemo(() => {
    const all = [...actions, ...apps]
    if (!query) return all.slice(0, 10) // Show first 10 items if empty
    return all.filter(item =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10) // Limit to 10 results
  }, [query])

  // Reset selection index when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Handle global keyboard triggers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (isOpen) onClose()
        else onClose() // We will let the parent toggle this
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Monitor keys when palette is open
  useEffect(() => {
    if (!isOpen) return

    const handlePaletteKeys = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % filteredItems.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredItems[selectedIndex]) {
          triggerAction(filteredItems[selectedIndex])
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    // Auto focus input
    setTimeout(() => inputRef.current?.focus(), 50)

    window.addEventListener('keydown', handlePaletteKeys)
    return () => window.removeEventListener('keydown', handlePaletteKeys)
  }, [isOpen, filteredItems, selectedIndex, onClose])

  const triggerAction = (item: PaletteAction) => {
    if (item.actionKey.startsWith('add:')) {
      const parts = item.actionKey.split(':')
      const packageId = parts[1]
      const name = parts[2]
      onAddToCart(packageId, name)
    } else {
      onAction(item.actionKey)
    }
    onClose()
    setQuery('')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[2000]"
          />

          {/* Palette Dialog box */}
          <div className="fixed inset-x-4 top-[15vh] mx-auto max-w-xl z-[2001]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl rounded-2xl border border-gray-200/80 dark:border-zinc-800/80 shadow-[0_30px_70px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
            >
              {/* Search bar inside dialog */}
              <div className="flex items-center px-4 border-b border-gray-150 dark:border-zinc-800/85">
                <Search className="w-5 h-5 text-gray-400 mr-3" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Rechercher une action ou un logiciel (ex: vlc, diagnostic)..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full py-4 bg-transparent border-none text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none text-sm font-medium"
                />
                <span className="text-[10px] bg-gray-100 dark:bg-zinc-900 border border-gray-250 dark:border-zinc-850 px-2 py-0.5 rounded text-gray-450 uppercase font-bold tracking-wide flex-shrink-0">
                  ESC
                </span>
              </div>

              {/* Items List */}
              <div className="max-h-[340px] overflow-y-auto p-2 scrollbar-thin">
                {filteredItems.length > 0 ? (
                  <div className="space-y-1">
                    {filteredItems.map((item, idx) => {
                      const isSelected = idx === selectedIndex
                      return (
                        <div
                          key={item.id}
                          onClick={() => triggerAction(item)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all duration-150 ${
                            isSelected
                              ? 'bg-primary dark:bg-primary/20 text-white dark:text-white'
                              : 'hover:bg-gray-100 dark:hover:bg-zinc-900/60 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-zinc-900 text-gray-400 dark:text-gray-500'
                            }`}>
                              {item.icon}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm leading-tight truncate">{item.title}</h4>
                              <p className={`text-[10px] mt-0.5 font-medium truncate ${
                                isSelected ? 'text-white/80' : 'text-gray-400'
                              }`}>
                                {item.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              isSelected
                                ? 'bg-white/25 text-white'
                                : (item.category === 'Actions' ? 'bg-primary/10 text-primary' : 'bg-accent/15 text-accent')
                            }`}>
                              {item.category}
                            </span>
                            {isSelected && (
                              <Terminal className="w-3.5 h-3.5 text-white/90 animate-pulse" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
                    Aucune action ou logiciel correspondant.
                  </div>
                )}
              </div>

              {/* Bottom Instructions Info */}
              <div className="px-4 py-3 bg-gray-50 dark:bg-zinc-900/30 border-t border-gray-150 dark:border-zinc-800/85 flex justify-between text-[10px] text-gray-450 font-bold tracking-wide">
                <span>↑↓ NAVIGUER • ENTER SÉLECTIONNER</span>
                <span>NEOGET COMMANDS</span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
