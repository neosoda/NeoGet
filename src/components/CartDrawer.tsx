import { motion } from 'framer-motion'
import { ShoppingCart, Trash2, Zap, X } from 'lucide-react'
import { CartItem } from '../types'

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
      <div className="bg-white/85 dark:bg-gray-900/85 backdrop-blur-xl rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.18)] border border-primary/20 dark:border-primary/30 p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Summary info */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center relative">
              <ShoppingCart className="text-primary w-5 h-5" />
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-gray-900">
                {items.length}
              </span>
            </div>
            <div className="hidden md:block">
              <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">Votre Panier</h4>
              <p className="text-[10px] text-gray-500 font-medium">{items.length} prêt{items.length > 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Software Chips (Scrollable list of apps) */}
          <div className="flex-1 flex gap-2 overflow-x-auto py-1 scrollbar-thin select-none max-w-full">
            {items.map(item => (
              <div
                key={item.id}
                className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100/80 dark:bg-gray-800/80 text-[11px] font-semibold text-gray-700 dark:text-gray-250 border border-gray-250/30 dark:border-gray-700/50"
              >
                <span className="truncate max-w-[80px]">{item.name}</span>
                <button
                  onClick={() => onRemove(item.id)}
                  className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Actions panel */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onClear}
              className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-850 text-gray-500 hover:text-red-500 transition-colors"
              title="Vider le panier"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onInstall}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white font-bold text-sm shadow-lg shadow-primary/20 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-300 hover:scale-[1.03] active:scale-95"
            >
              <Zap className="w-4 h-4" />
              <span>Installer</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
