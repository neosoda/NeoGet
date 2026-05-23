import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  Cloud,
  Code2,
  Cpu,
  Database,
  Download,
  FileText,
  Filter,
  Gamepad2,
  Globe2,
  Lock,
  MessageCircle,
  Minus,
  Package,
  Palette,
  PlayCircle,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Zap
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
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

const categoryIconMap: Record<string, LucideIcon> = {
  globe: Globe2,
  'message-circle': MessageCircle,
  'play-circle': PlayCircle,
  code: Code2,
  cpu: Cpu,
  database: Database,
  palette: Palette,
  'file-text': FileText,
  zap: Zap,
  lock: Lock,
  'gamepad-2': Gamepad2,
  cloud: Cloud
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

function AppGlyph({ label, active, tone = 'primary' }: { label: string; active?: boolean; tone?: 'primary' | 'accent' }) {
  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase()

  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-sm font-black ${
      active
        ? tone === 'primary'
          ? 'border-primary/30 bg-primary/15 text-primary'
          : 'border-accent/30 bg-accent/15 text-accent'
        : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-400'
    }`}>
      {initials || <Package className="h-4 w-4" />}
    </div>
  )
}

function InteractiveCard({
  children,
  active,
  tone
}: {
  children: ReactNode
  active: boolean
  tone: 'primary' | 'accent'
}) {
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const [hovered, setHovered] = useState(false)

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setCoords({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative overflow-hidden rounded-lg border p-4 transition duration-200 ${
        active
          ? tone === 'primary'
            ? 'border-primary/45 bg-primary/[0.075] shadow-focus'
            : 'border-accent/45 bg-accent/[0.075] shadow-focus'
          : 'border-slate-200/80 bg-white/[0.78] hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.045] dark:hover:border-white/20 dark:hover:bg-white/[0.07]'
      }`}
    >
      {hovered && (
        <div
          className="pointer-events-none absolute inset-0 opacity-100 transition-opacity"
          style={{
            background: `radial-gradient(420px circle at ${coords.x}px ${coords.y}px, ${
              tone === 'primary' ? 'rgba(50, 167, 243, 0.12)' : 'rgba(34, 211, 182, 0.12)'
            }, transparent 72%)`
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-start gap-3">
        <div className="skeleton-line h-10 w-10" />
        <div className="flex-1 space-y-3">
          <div className="skeleton-line h-4 w-1/2" />
          <div className="skeleton-line h-3 w-4/5" />
          <div className="skeleton-line h-3 w-3/5" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-5 gap-2">
        <div className="skeleton-line col-span-2 h-10" />
        <div className="skeleton-line col-span-3 h-10" />
      </div>
    </div>
  )
}

function CatalogRail({
  categories,
  cart,
  totalApps,
  mode
}: {
  categories: Category[]
  cart: CartItem[]
  totalApps: number
  mode: 'starter' | 'global'
}) {
  return (
    <aside className="space-y-3 xl:sticky xl:top-24 xl:self-start">
      <div className="surface-strong p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Mission</p>
            <h3 className="mt-1 font-heading text-lg font-extrabold text-slate-950 dark:text-white">
              Installer sans friction
            </h3>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-2xl font-extrabold text-slate-950 dark:text-white">{totalApps}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">apps prêtes</p>
          </div>
          <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-2xl font-extrabold text-slate-950 dark:text-white">{categories.length}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">catégories</p>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          {['Choisir les outils', 'Valider le panier', 'Lancer l’installation'].map((step, index) => (
            <div key={step} className="flex items-center gap-3 rounded-lg border border-slate-200/70 bg-white/60 p-2.5 dark:border-white/10 dark:bg-white/[0.04]">
              <span className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-black ${
                index === 0 ? 'bg-accent text-ink' : 'bg-slate-100 text-slate-500 dark:bg-white/[0.07] dark:text-slate-400'
              }`}>
                {index + 1}
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{step}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="surface-soft p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-sm font-extrabold text-slate-950 dark:text-white">Panier</h3>
          <span className="rounded-md border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 dark:border-white/10">
            {cart.length} sélection
          </span>
        </div>

        {cart.length > 0 ? (
          <div className="mt-3 space-y-2">
            {cart.slice(0, 5).map(item => (
              <div key={item.id} className="flex items-center gap-2 rounded-lg bg-slate-100/70 px-2.5 py-2 dark:bg-white/[0.055]">
                <Check className="h-3.5 w-3.5 shrink-0 text-accent" />
                <span className="truncate text-xs font-bold text-slate-700 dark:text-slate-300">{item.name}</span>
              </div>
            ))}
            {cart.length > 5 && (
              <p className="text-xs font-semibold text-slate-500">+{cart.length - 5} autre(s) logiciel(s)</p>
            )}
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-dashed border-slate-300 p-3 text-xs leading-5 text-slate-500 dark:border-white/10">
            {mode === 'starter'
              ? 'Ajoutez quelques essentiels pour faire apparaître le tiroir d’installation.'
              : 'Recherchez un paquet WinGet, puis ajoutez-le ici.'}
          </p>
        )}
      </div>

      <div className="surface-soft p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-success/20 bg-success/10 text-success">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">WinGet prêt</h3>
            <p className="text-xs font-medium text-slate-500">Sources officielles, installation suivie.</p>
          </div>
        </div>
      </div>
    </aside>
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

  const categories = useMemo(() => {
    const baseCats = JSON.parse(JSON.stringify(softwareData.categories)) as Category[]

    customApps.forEach(app => {
      const catName = (app as any).category || 'Développement'
      const targetCat = baseCats.find(c => c.name === catName)
      if (targetCat && !targetCat.software.some(s => s.package === app.package)) {
        targetCat.software.push({
          name: app.name,
          package: app.package,
          description: app.description
        })
      }
    })

    return baseCats
  }, [customApps])

  const currentCategory = categories.find(cat => cat.name === selectedCategory) ?? categories[0]
  const totalApps = categories.reduce((acc, cat) => acc + cat.software.length, 0)

  const filteredSoftware = useMemo(() => {
    if (!currentCategory) return []
    const query = searchQuery.toLowerCase()
    return currentCategory.software.filter(app =>
      app.name.toLowerCase().includes(query) ||
      app.description.toLowerCase().includes(query) ||
      app.package.toLowerCase().includes(query)
    )
  }, [searchQuery, currentCategory])

  useEffect(() => {
    if (mode === 'global' && searchQuery.length >= 2) {
      const timer = setTimeout(() => {
        handleGlobalSearch(searchQuery)
      }, 450)
      return () => clearTimeout(timer)
    }

    if (mode === 'global' && searchQuery.length < 2) {
      setGlobalSearchResults([])
    }
  }, [searchQuery, mode])

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

  const isInCart = (id: string) => cart.some(item => item.id === id)

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 }
  }

  const renderStarterCards = () => (
    <AnimatePresence mode="wait">
      <motion.div
        key={selectedCategory + searchQuery}
        initial="hidden"
        animate="show"
        exit="hidden"
        transition={{ staggerChildren: 0.025 }}
        className="grid grid-cols-1 gap-3 xl:grid-cols-2"
      >
        {filteredSoftware.map((app) => {
          const selected = isInCart(app.package)
          const isLoading = loading.has(app.package)

          return (
            <motion.article key={app.package} variants={itemVariants}>
              <InteractiveCard active={selected} tone="primary">
                <div className="flex gap-3">
                  <AppGlyph label={app.name} active={selected} tone="primary" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-extrabold text-slate-950 dark:text-white">{app.name}</h3>
                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600 dark:text-slate-400">{app.description}</p>
                      </div>
                      {selected && <Check className="mt-1 h-4 w-4 shrink-0 text-primary" />}
                    </div>
                    <code className="mt-3 block truncate rounded-md bg-slate-100 px-2 py-1.5 text-[11px] font-semibold text-slate-500 dark:bg-white/[0.055] dark:text-slate-400">
                      {app.package}
                    </code>
                    <div className="mt-3 grid grid-cols-5 gap-2">
                      <button
                        onClick={() => selected ? onRemoveFromCart(app.package) : onAddToCart({ id: app.package, name: app.name })}
                        className={`col-span-2 btn-secondary px-3 py-2 text-xs ${
                          selected ? 'border-primary/25 text-primary dark:text-primary' : ''
                        }`}
                        type="button"
                      >
                        {selected ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        {selected ? 'Retirer' : 'Ajouter'}
                      </button>
                      <button
                        onClick={() => onInstall(app.package, app.name)}
                        disabled={isLoading}
                        className="col-span-3 btn-primary px-3 py-2 text-xs"
                        type="button"
                      >
                        {isLoading ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        {isLoading ? 'Installation...' : 'Installer'}
                      </button>
                    </div>
                  </div>
                </div>
              </InteractiveCard>
            </motion.article>
          )
        })}
      </motion.div>
    </AnimatePresence>
  )

  const renderGlobalCards = () => {
    if (isSearchingGlobal) {
      return (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)}
        </div>
      )
    }

    if (searchQuery.length > 0 && searchQuery.length < 2) {
      return (
        <div className="surface-soft flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
          <Search className="h-8 w-8 text-slate-400" />
          <h3 className="mt-4 font-heading text-lg font-extrabold text-slate-950 dark:text-white">Continuez à taper</h3>
          <p className="mt-1 text-sm text-slate-500">Deux caractères suffisent pour lancer la recherche WinGet.</p>
        </div>
      )
    }

    if (searchQuery.length >= 2 && globalSearchResults.length === 0) {
      return (
        <div className="surface-soft flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
          <Package className="h-8 w-8 text-slate-400" />
          <h3 className="mt-4 font-heading text-lg font-extrabold text-slate-950 dark:text-white">Aucun paquet trouvé</h3>
          <p className="mt-1 text-sm text-slate-500">Essayez un nom plus court ou l’identifiant exact du paquet.</p>
        </div>
      )
    }

    if (searchQuery.length === 0) {
      return (
        <div className="surface-soft flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
          <Globe2 className="h-8 w-8 text-accent" />
          <h3 className="mt-4 font-heading text-lg font-extrabold text-slate-950 dark:text-white">Recherche universelle</h3>
          <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
            Cherchez un logiciel par nom, éditeur ou package ID pour l’ajouter au même flux d’installation.
          </p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {globalSearchResults.map((app) => {
          const selected = isInCart(app.id)
          const isLoading = loading.has(app.id)

          return (
            <motion.article key={app.id} variants={itemVariants} initial="hidden" animate="show">
              <InteractiveCard active={selected} tone="accent">
                <div className="flex gap-3">
                  <AppGlyph label={app.name} active={selected} tone="accent" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-extrabold text-slate-950 dark:text-white">{app.name}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-md border border-accent/20 bg-accent/10 px-2 py-1 font-mono text-[11px] font-bold text-accent">
                            v{app.version}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">Source {app.source || 'WinGet'}</span>
                        </div>
                      </div>
                      {selected && <Check className="mt-1 h-4 w-4 shrink-0 text-accent" />}
                    </div>
                    <code className="mt-3 block truncate rounded-md bg-slate-100 px-2 py-1.5 text-[11px] font-semibold text-slate-500 dark:bg-white/[0.055] dark:text-slate-400">
                      {app.id}
                    </code>
                    <div className="mt-3 grid grid-cols-5 gap-2">
                      <button
                        onClick={() => selected ? onRemoveFromCart(app.id) : onAddToCart({ id: app.id, name: app.name })}
                        className={`col-span-2 btn-secondary px-3 py-2 text-xs ${
                          selected ? 'border-accent/25 text-accent dark:text-accent' : ''
                        }`}
                        type="button"
                      >
                        {selected ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        {selected ? 'Retirer' : 'Ajouter'}
                      </button>
                      <button
                        onClick={() => onInstall(app.id, app.name)}
                        disabled={isLoading}
                        className="col-span-3 btn-accent px-3 py-2 text-xs"
                        type="button"
                      >
                        {isLoading ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        {isLoading ? 'Installation...' : 'Installer'}
                      </button>
                    </div>
                  </div>
                </div>
              </InteractiveCard>
            </motion.article>
          )
        })}
      </div>
    )
  }

  return (
    <div className="pb-32">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 space-y-4">
          <div className="surface-strong overflow-hidden p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="page-title">
                  {mode === 'starter' ? 'Starter Pack' : 'Recherche WinGet'}
                </h2>
                <p className="page-copy mt-2">
                  {mode === 'starter'
                    ? 'Une sélection lisible, rapide et fiable pour préparer une machine Windows sans friction.'
                    : 'Explorez les dépôts WinGet officiels, puis ajoutez n’importe quel paquet au panier.'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
                <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-lg font-extrabold text-slate-950 dark:text-white">{totalApps}</p>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Apps</p>
                </div>
                <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-lg font-extrabold text-slate-950 dark:text-white">{cart.length}</p>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Panier</p>
                </div>
                <div className="rounded-lg border border-success/20 bg-success/10 p-3">
                  <p className="text-lg font-extrabold text-emerald-700 dark:text-success">OK</p>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700/80 dark:text-success/80">WinGet</p>
                </div>
              </div>
            </div>
          </div>

          {mode === 'starter' && (
            <div className="surface-soft p-3">
              <div className="mb-2 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                <Filter className="h-3.5 w-3.5" />
                Catégories
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {categories.map((cat) => {
                  const Icon = categoryIconMap[cat.icon] ?? Package
                  const selected = selectedCategory === cat.name
                  return (
                    <button
                      key={cat.name}
                      onClick={() => {
                        setSelectedCategory(cat.name)
                        setSearchQuery('')
                      }}
                      className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition ${
                        selected
                          ? 'border-accent/30 bg-accent/15 text-slate-950 dark:text-white'
                          : 'border-slate-200 bg-white/60 text-slate-600 hover:bg-white dark:border-white/10 dark:bg-white/[0.045] dark:text-slate-400 dark:hover:bg-white/[0.075]'
                      }`}
                      type="button"
                    >
                      <Icon className={`h-4 w-4 ${selected ? 'text-accent' : ''}`} />
                      {cat.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="surface-soft p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={mode === 'starter' ? 'Rechercher dans le starter pack...' : 'Nom du logiciel, éditeur ou package ID...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10"
              />
              {isSearchingGlobal && (
                <span className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-heading text-lg font-extrabold text-slate-950 dark:text-white">
                {mode === 'starter' ? currentCategory?.name : 'Résultats'}
              </h3>
              <p className="text-sm font-medium text-slate-500">
                {mode === 'starter'
                  ? `${filteredSoftware.length} logiciel${filteredSoftware.length > 1 ? 's' : ''} disponible${filteredSoftware.length > 1 ? 's' : ''}`
                  : `${globalSearchResults.length} résultat${globalSearchResults.length > 1 ? 's' : ''} WinGet`}
              </p>
            </div>
          </div>

          {mode === 'starter' ? renderStarterCards() : renderGlobalCards()}

          {mode === 'starter' && filteredSoftware.length === 0 && (
            <div className="surface-soft flex min-h-[220px] flex-col items-center justify-center p-8 text-center">
              <Package className="h-8 w-8 text-slate-400" />
              <h3 className="mt-4 font-heading text-lg font-extrabold text-slate-950 dark:text-white">Aucun résultat</h3>
              <p className="mt-1 text-sm text-slate-500">Essayez une autre recherche dans cette catégorie.</p>
            </div>
          )}
        </section>

        <CatalogRail categories={categories} cart={cart} totalApps={totalApps} mode={mode} />
      </div>
    </div>
  )
}
