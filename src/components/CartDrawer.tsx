import { motion } from 'framer-motion'
import { ShoppingCart, Trash2, Zap, X } from 'lucide-react'

interface CartItem {
  id: string
  name: string
}

interface CartDrawerProps {
  items: CartItem[]
  onRemove: (id: string) => void
  onClear: () => void
  onInstall: () => void
}

export default function CartDrawer({ items, onRemove, onClear, onInstall }: CartDrawerProps) {
  if (items.length === 0) return null

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40 w-full max-w-2xl px-4"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-primary/20 p-4 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          {/* Summary */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center relative">
              <ShoppingCart className="text-primary w-6 h-6" />
              <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center border-2 border-white dark:border-gray-800">
                {items.length}
              </span>
            </div>
            <div className="hidden sm:block">
              <h4 className="font-bold text-gray-900 dark:text-white">Votre Panier</h4>
              <p className="text-xs text-gray-500">{items.length} logiciel(s) prêt(s) à être installé(s)</p>
            </div>
          </div>

          {/* Software Chips */}
          <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar py-1">
            {items.map(item => (
              <div 
                key={item.id}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600"
              >
                {item.name}
                <button onClick={() => onRemove(item.id)} className="hover:text-red-500 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onClear}
              className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              title="Vider le panier"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={onInstall}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold hover:opacity-90 shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              <Zap className="w-5 h-5" />
              <span>Installer tout</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
