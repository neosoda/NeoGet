import { motion } from 'framer-motion'
import { Sun, Moon, Package } from 'lucide-react'

interface HeaderProps {
  darkMode: boolean
  onToggleTheme: () => void
}

export default function Header({ darkMode, onToggleTheme }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-3"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Package className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-gray-900 dark:text-white">NeoGet</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">v0.1b</p>
            </div>
          </motion.div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              aria-label="Toggle theme"
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-amber-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </header>
  )
}
