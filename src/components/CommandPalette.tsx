import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, Download, Gauge, Search, ShieldAlert, Sparkles, Sun, Terminal, Trash2, Upload } from 'lucide-react'
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
  icon: ReactNode
  actionKey: string
  category: 'Actions' | 'Logiciels'
  packageId?: string
  packageName?: string
}

export default function CommandPalette({ isOpen, onClose, onAction, onAddToCart }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const actions: PaletteAction[] = useMemo(() => [
    { id: 'diag', title: 'Lancer le diagnostic', description: 'Analyser la RAM, les disques et WinGet', icon: <Activity className="h-4 w-4" />, actionKey: 'diag', category: 'Actions' },
    { id: 'fix', title: 'Réparer WinGet', description: 'Réinitialiser les index et sources locales', icon: <ShieldAlert className="h-4 w-4" />, actionKey: 'fix', category: 'Actions' },
    { id: 'toolkit', title: 'Ouvrir le Toolkit Windows', description: 'Optimisations, nettoyage et démarrage', icon: <Gauge className="h-4 w-4" />, actionKey: 'toolkit', category: 'Actions' },
    { id: 'export', title: 'Exporter la configuration', description: 'Sauvegarder le panier dans un fichier JSON', icon: <Upload className="h-4 w-4" />, actionKey: 'export', category: 'Actions' },
    { id: 'import', title: 'Importer une configuration', description: 'Charger une liste de logiciels existante', icon: <Download className="h-4 w-4" />, actionKey: 'import', category: 'Actions' },
    { id: 'clear', title: 'Vider le panier', description: 'Retirer tous les logiciels sélectionnés', icon: <Trash2 className="h-4 w-4" />, actionKey: 'clear', category: 'Actions' },
    { id: 'theme', title: 'Basculer le thème', description: 'Alterner entre clair et sombre', icon: <Sun className="h-4 w-4" />, actionKey: 'theme', category: 'Actions' }
  ], [])

  const apps: PaletteAction[] = useMemo(() => {
    const list: PaletteAction[] = []
    softwareData.categories.forEach(cat => {
      cat.software.forEach(app => {
        list.push({
          id: app.package,
          title: app.name,
          description: `Ajouter au panier depuis ${cat.name}`,
          icon: <Sparkles className="h-4 w-4" />,
          actionKey: 'add',
          category: 'Logiciels',
          packageId: app.package,
          packageName: app.name
        })
      })
    })
    return list
  }, [])

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const all = [...actions, ...apps]
    if (!normalizedQuery) return all.slice(0, 10)

    return all
      .filter(item =>
        item.title.toLowerCase().includes(normalizedQuery) ||
        item.description.toLowerCase().includes(normalizedQuery) ||
        item.id.toLowerCase().includes(normalizedQuery)
      )
      .slice(0, 10)
  }, [actions, apps, query])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (!isOpen) return

    const handlePaletteKeys = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => filteredItems.length ? (prev + 1) % filteredItems.length : 0)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => filteredItems.length ? (prev - 1 + filteredItems.length) % filteredItems.length : 0)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = filteredItems[selectedIndex]
        if (selected) triggerAction(selected)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 50)
    window.addEventListener('keydown', handlePaletteKeys)

    return () => {
      window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', handlePaletteKeys)
    }
  }, [filteredItems, isOpen, onClose, selectedIndex])

  const triggerAction = (item: PaletteAction) => {
    if (item.actionKey === 'add' && item.packageId && item.packageName) {
      onAddToCart(item.packageId, item.packageName)
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[2000] bg-black/[0.58] backdrop-blur-md"
          />

          <div className="fixed inset-x-4 top-[12vh] z-[2001] mx-auto max-w-2xl">
            <motion.div
              initial={{ scale: 0.97, opacity: 0, y: -14 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0, y: -14 }}
              transition={{ type: 'spring', damping: 27, stiffness: 260 }}
              className="overflow-hidden rounded-lg border border-white/10 bg-[#0B1217]/[0.96] text-white shadow-[0_34px_90px_rgba(0,0,0,0.48)] backdrop-blur-2xl"
            >
              <div className="flex items-center border-b border-white/10 px-4">
                <Search className="mr-3 h-5 w-5 text-slate-500" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Rechercher une action, un logiciel, un package ID..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full border-none bg-transparent py-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500"
                />
                <kbd className="command-key border-white/10 bg-white/[0.06] text-slate-500">ESC</kbd>
              </div>

              <div className="max-h-[420px] overflow-y-auto p-2">
                {filteredItems.length > 0 ? (
                  <div className="space-y-1">
                    {filteredItems.map((item, idx) => {
                      const selected = idx === selectedIndex
                      return (
                        <button
                          key={item.id}
                          onClick={() => triggerAction(item)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`flex w-full items-center justify-between gap-3 rounded-lg p-3 text-left transition ${
                            selected ? 'bg-accent text-ink' : 'text-slate-300 hover:bg-white/[0.055]'
                          }`}
                          type="button"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                              selected ? 'border-black/10 bg-black/10' : 'border-white/10 bg-white/[0.055] text-slate-500'
                            }`}>
                              {item.icon}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-extrabold">{item.title}</span>
                              <span className={`mt-0.5 block truncate text-xs font-semibold ${
                                selected ? 'text-ink/70' : 'text-slate-500'
                              }`}>
                                {item.description}
                              </span>
                            </span>
                          </span>

                          <span className="flex shrink-0 items-center gap-2">
                            <span className={`rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                              selected ? 'bg-black/10 text-ink' : item.category === 'Actions' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'
                            }`}>
                              {item.category}
                            </span>
                            {selected && <Terminal className="h-3.5 w-3.5" />}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-sm font-semibold text-slate-400">Aucun résultat pour cette recherche.</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.035] px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                <span>↑↓ Naviguer • Entrée sélectionner</span>
                <span>NeoGet Commands</span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
