import { motion } from 'framer-motion'
import { PackageCheck, Trash2, X, Zap } from 'lucide-react'
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
      initial={{ y: 36, opacity: 0, scale: 0.98 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 36, opacity: 0, scale: 0.98 }}
      transition={{ type: 'spring', damping: 26, stiffness: 260 }}
      className="fixed inset-x-0 bottom-4 z-40 mx-auto w-full max-w-3xl px-4"
    >
      <div className="rounded-lg border border-accent/25 bg-[#091116]/[0.92] p-3 text-white shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent">
            <PackageCheck className="h-5 w-5" />
          </div>

          <div className="hidden min-w-[120px] sm:block">
            <h4 className="text-sm font-extrabold">Panier prêt</h4>
            <p className="text-xs font-semibold text-slate-500">
              {items.length} logiciel{items.length > 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto py-1">
            {items.map(item => (
              <div
                key={item.id}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.065] px-2.5 py-1.5 text-xs font-bold text-slate-200"
              >
                <span className="max-w-[120px] truncate">{item.name}</span>
                <button
                  onClick={() => onRemove(item.id)}
                  className="rounded-md p-0.5 text-slate-500 transition hover:bg-white/10 hover:text-error"
                  title={`Retirer ${item.name}`}
                  type="button"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={onClear}
              className="icon-button border-white/10 bg-white/[0.055] text-slate-400 hover:bg-white/[0.09] hover:text-error"
              title="Vider le panier"
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={onInstall}
              className="btn-accent px-4 py-2.5"
              type="button"
            >
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Installer</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
