import { useState, useEffect } from 'react'
import { Settings, Database, RefreshCw, Folder, Wrench, Code, Shield } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { WinGetSource } from '../types'
import { showToast } from './ToastContainer'

export default function SettingsView() {
  const [sources, setSources] = useState<WinGetSource[]>([])
  const [loadingSources, setLoadingSources] = useState(false)
  const [installPath, setInstallPath] = useState('C:\\Program Files')
  const [installMode, setInstallMode] = useState<'silent' | 'interactive'>('silent')
  const [customCatalogUrl, setCustomCatalogUrl] = useState('')

  const fetchSources = async () => {
    setLoadingSources(true)
    try {
      const results = await invoke<WinGetSource[]>('list_winget_sources')
      setSources(results)
    } catch (e) {
      console.error(e)
      showToast("Impossible de lister les sources WinGet.", "error")
    } finally {
      setLoadingSources(false)
    }
  }

  useEffect(() => {
    fetchSources()
    // Load config from localStorage
    const savedPath = localStorage.getItem('neoget-install-path')
    if (savedPath) setInstallPath(savedPath)

    const savedMode = localStorage.getItem('neoget-install-mode')
    if (savedMode) setInstallMode(savedMode as 'silent' | 'interactive')

    const savedCatalog = localStorage.getItem('neoget-custom-catalog-url')
    if (savedCatalog) setCustomCatalogUrl(savedCatalog)
  }, [])

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem('neoget-install-path', installPath)
    localStorage.setItem('neoget-install-mode', installMode)
    showToast("Paramètres généraux enregistrés !", "success")
  }

  const handleSaveCatalogUrl = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customCatalogUrl) {
      localStorage.removeItem('neoget-custom-catalog-url')
      localStorage.removeItem('neoget-custom-software')
      showToast("Catalogue personnalisé réinitialisé au starter pack d'origine.", "info")
      window.dispatchEvent(new Event('catalog-updated'))
      return
    }

    try {
      // Validate by fetching URL content
      showToast("Téléchargement du catalogue externe...", "info")
      const response = await fetch(customCatalogUrl)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()

      // Basic validation of keys
      if (data && Array.isArray(data.categories)) {
        // Flat map custom software and save in localStorage as local custom apps
        const list: any[] = []
        data.categories.forEach((cat: any) => {
          if (cat.software && Array.isArray(cat.software)) {
            cat.software.forEach((app: any) => {
              list.push({
                name: app.name,
                package: app.package || app.id,
                description: app.description,
                category: cat.name
              })
            })
          }
        })

        localStorage.setItem('neoget-custom-catalog-url', customCatalogUrl)
        localStorage.setItem('neoget-custom-software', JSON.stringify(list))
        showToast("Nouveau catalogue importé et synchronisé !", "success")
        window.dispatchEvent(new Event('catalog-updated'))
      } else {
        throw new Error("Structure JSON invalide. 'categories' absent ou incorrect.")
      }
    } catch (e) {
      console.error(e)
      showToast(`Échec du chargement : ${e}`, "error")
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: General Configuration & Custom Catalog */}
      <div className="lg:col-span-2 space-y-8">

        {/* General Settings */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-150 dark:border-zinc-800 pb-4">
            <Settings className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Paramètres Généraux</h3>
          </div>

          <form onSubmit={handleSaveGeneral} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5 flex items-center gap-1">
                  <Folder className="w-3.5 h-3.5" />
                  Dossier d'installation par défaut
                </label>
                <input
                  type="text"
                  value={installPath}
                  onChange={e => setInstallPath(e.target.value)}
                  className="input-field font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5 flex items-center gap-1">
                  <Wrench className="w-3.5 h-3.5" />
                  Mode d'exécution des installateurs
                </label>
                <div className="grid grid-cols-2 p-1 bg-gray-100 dark:bg-zinc-900 rounded-xl border border-gray-200/50 dark:border-zinc-800/60">
                  <button
                    type="button"
                    onClick={() => setInstallMode('silent')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      installMode === 'silent'
                        ? 'bg-white dark:bg-zinc-750 shadow-sm text-primary'
                        : 'text-gray-500'
                    }`}
                  >
                    Silencieux
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstallMode('interactive')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      installMode === 'interactive'
                        ? 'bg-white dark:bg-zinc-750 shadow-sm text-primary'
                        : 'text-gray-500'
                    }`}
                  >
                    Interactif
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary py-2.5 px-6 rounded-xl text-sm"
            >
              Enregistrer les paramètres
            </button>
          </form>
        </div>

        {/* Custom Remote Catalog JSON URL */}
        <div className="card p-6 border-accent/15 bg-gradient-to-b from-transparent to-accent/5">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-150 dark:border-zinc-800 pb-4">
            <Code className="w-5 h-5 text-accent" />
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Synchronisation de Catalogue Externe</h3>
          </div>

          <form onSubmit={handleSaveCatalogUrl} className="space-y-6">
            <div>
              <p className="text-xs text-gray-550 dark:text-gray-400 mb-4 leading-relaxed">
                Renseignez l'URL d'un fichier JSON distant contenant votre propre liste d'applications personnalisées. Cela remplacera dynamiquement les applications du Starter Pack pour toute votre équipe ou entreprise.
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://votre-site.com/catalogue-perso.json"
                  value={customCatalogUrl}
                  onChange={e => setCustomCatalogUrl(e.target.value)}
                  className="input-field text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="btn-accent py-2.5 px-6 rounded-xl text-sm"
              >
                Télécharger & Synchroniser
              </button>
              {customCatalogUrl && (
                <button
                  type="button"
                  onClick={() => { setCustomCatalogUrl(''); localStorage.removeItem('neoget-custom-catalog-url'); localStorage.removeItem('neoget-custom-software'); showToast("Catalogue réinitialisé.", "info"); window.dispatchEvent(new Event('catalog-updated')) }}
                  className="btn-secondary py-2.5 px-6 rounded-xl text-sm"
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Right Column: WinGet Repositories sources summary */}
      <div className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6 border-b border-gray-150 dark:border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Dépôts Actifs ({sources.length})</h3>
            </div>
            <button
              onClick={fetchSources}
              disabled={loadingSources}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loadingSources ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-4">
            {loadingSources ? (
              <p className="text-center py-6 text-xs text-gray-550 animate-pulse">Chargement...</p>
            ) : sources.length > 0 ? (
              sources.map((src, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-900/40 border border-gray-150 dark:border-zinc-800/80 flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-success flex-shrink-0 mt-1" />
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-gray-900 dark:text-white leading-tight truncate">{src.name}</h4>
                    <code className="text-[9px] font-mono text-gray-450 block break-all mt-1">{src.argument}</code>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-6 text-xs text-gray-500">Aucun dépôt actif détecté.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
