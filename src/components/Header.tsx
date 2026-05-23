import { motion } from 'framer-motion'
import { Sun, Moon, Upload, Download } from 'lucide-react'

interface HeaderProps {
  darkMode: boolean
  onToggleTheme: () => void
  onExport?: () => void
  onImport?: () => void
  activeTitle?: string
}

export default function Header({ darkMode, onToggleTheme, onExport, onImport, activeTitle = 'Tableau de bord' }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/70 dark:bg-[#070708]/65 backdrop-blur-xl border-b border-gray-200/50 dark:border-zinc-900/50 p-4">
      <div className="mx-auto flex items-center justify-between">
        {/* Dynamic Page Title */}
        <motion.div
          key={activeTitle}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <h2 className="font-extrabold text-lg text-gray-900 dark:text-white tracking-tight">{activeTitle}</h2>
        </motion.div>

        {/* Action Panel */}
        <div className="flex items-center gap-2">
          {onExport && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onExport}
              className="flex items-center gap-2 px-3 py-1.8 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-900/40 dark:hover:bg-zinc-900 rounded-xl border border-gray-200/50 dark:border-zinc-850/50 text-xs font-bold text-gray-600 dark:text-gray-300 transition-colors"
              title="Exporter le panier"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exporter</span>
            </motion.button>
          )}
          {onImport && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onImport}
              className="flex items-center gap-2 px-3 py-1.8 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-900/40 dark:hover:bg-zinc-900 rounded-xl border border-gray-200/50 dark:border-zinc-850/50 text-xs font-bold text-gray-600 dark:text-gray-300 transition-colors"
              title="Importer dans le panier"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Importer</span>
            </motion.button>
          )}

          {/* Vertical divider */}
          {(onExport || onImport) && (
            <div className="h-5 w-px bg-gray-200 dark:bg-zinc-800 mx-1" />
          )}

          {/* Theme switch */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleTheme}
            className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-zinc-900/40 dark:hover:bg-zinc-900 border border-gray-200/50 dark:border-zinc-850/50 text-gray-500 transition-all"
            aria-label="Toggle theme"
          >
            {darkMode ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-gray-500" />
            )}
          </motion.button>
        </div>
      </div>
    </header>
  )
}
