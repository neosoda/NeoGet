import { motion } from 'framer-motion'
import { Command, Download, Moon, Search, ShieldCheck, Sun, Upload } from 'lucide-react'

interface HeaderProps {
  darkMode: boolean
  onToggleTheme: () => void
  onExport?: () => void
  onImport?: () => void
  onOpenCommand?: () => void
  activeTitle?: string
  activeDescription?: string
  isAdmin?: boolean
}

export default function Header({
  darkMode,
  onToggleTheme,
  onExport,
  onImport,
  onOpenCommand,
  activeTitle = 'Tableau de bord',
  activeDescription = 'Pilotez vos installations Windows avec WinGet.',
  isAdmin = false
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-light-bg/[0.78] px-4 py-3 backdrop-blur-2xl dark:border-white/10 dark:bg-dark-bg/[0.72] sm:px-6">
      <div className="mx-auto flex max-w-[1500px] items-center gap-4">
        <motion.div
          key={activeTitle}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="min-w-0 flex-1"
        >
          <div className="flex items-center gap-2">
            <h1 className="truncate font-heading text-lg font-extrabold text-slate-950 dark:text-white sm:text-xl">
              {activeTitle}
            </h1>
            <span className="hidden items-center gap-1 rounded-md border border-success/20 bg-success/10 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:text-success md:inline-flex">
              <ShieldCheck className="h-3.5 w-3.5" />
              {isAdmin ? 'Mode admin' : 'Standard'}
            </span>
          </div>
          <p className="hidden truncate text-xs font-medium text-slate-500 dark:text-slate-400 sm:block">
            {activeDescription}
          </p>
        </motion.div>

        <button
          onClick={onOpenCommand}
          className="hidden min-w-[280px] items-center justify-between rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-left text-sm font-semibold text-slate-500 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-400 dark:hover:bg-white/[0.085] lg:flex"
          type="button"
        >
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Palette de commandes
          </span>
          <span className="flex items-center gap-1">
            <Command className="h-3.5 w-3.5" />
            <kbd className="command-key">K</kbd>
          </span>
        </button>

        <div className="flex items-center gap-2">
          {onExport && (
            <button
              onClick={onExport}
              className="icon-button"
              title="Exporter le panier"
              type="button"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
          {onImport && (
            <button
              onClick={onImport}
              className="icon-button"
              title="Importer une configuration"
              type="button"
            >
              <Upload className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onToggleTheme}
            className="icon-button"
            aria-label="Changer de thème"
            title="Changer de thème"
            type="button"
          >
            {darkMode ? <Sun className="h-4 w-4 text-warning" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  )
}
