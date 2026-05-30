import { useEffect, useState, type FormEvent } from 'react'
import { Code2, Database, Folder, RefreshCw, Settings, ShieldCheck, SlidersHorizontal, Wrench } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { WinGetSource } from '../types'
import { showToast } from './ToastContainer'

export default function SettingsView() {
  const [sources, setSources] = useState<WinGetSource[]>([])
  const [loadingSources, setLoadingSources] = useState(false)
  const [installPath, setInstallPath] = useState('C:\\Program Files')
  const [installMode, setInstallMode] = useState<'silent' | 'interactive'>('silent')
  const [customCatalogUrl, setCustomCatalogUrl] = useState('')
  const [includeUnknown, setIncludeUnknown] = useState(true)
  const [forceUpgrade, setForceUpgrade] = useState(false)

  const fetchSources = async () => {
    setLoadingSources(true)
    try {
      const results = await invoke<WinGetSource[]>('list_winget_sources')
      setSources(results)
    } catch (e) {
      console.error(e)
      showToast('Impossible de lister les sources WinGet.', 'error')
    } finally {
      setLoadingSources(false)
    }
  }

  const runMaintenanceProfile = async (profile: 'fast-upgrade' | 'full-maintenance' | 'repair-sources') => {
    try {
      const mode = installMode
      await invoke('run_winget_maintenance_profile', { profile, mode })
      showToast('Maintenance WinGet terminée.', 'success')
      await fetchSources()
    } catch (e) {
      console.error(e)
      showToast(`Maintenance échouée : ${e}`, 'error')
    }
  }

  const updateSources = async () => {
    try {
      const msg = await invoke<string>('update_winget_sources')
      showToast(msg, 'success')
      await fetchSources()
    } catch (e) {
      console.error(e)
      showToast(`Échec update sources : ${e}`, 'error')
    }
  }

  const removeSource = async (name: string) => {
    const ok = confirm(`Supprimer la source '${name}' ?`)
    if (!ok) return
    try {
      const msg = await invoke<string>('remove_winget_source', { name })
      showToast(msg, 'success')
      await fetchSources()
    } catch (e) {
      console.error(e)
      showToast(`Échec suppression source : ${e}`, 'error')
    }
  }

  const resetSources = async () => {
    try {
      const msg = await invoke<string>('reset_winget_sources')
      showToast(msg, 'success')
      await fetchSources()
    } catch (e) {
      console.error(e)
      showToast(`Échec reset sources : ${e}`, 'error')
    }
  }

  const restoreDefaultSources = async () => {
    try {
      const msg = await invoke<string>('reset_winget_sources')
      showToast(msg, 'success')
      await updateSources()
    } catch (e) {
      console.error(e)
      showToast(`Échec restauration sources : ${e}`, 'error')
    }
  }

  const cleanupWingetCache = async () => {
    try {
      const msg = await invoke<string>('cleanup_winget_download_cache')
      showToast(msg, 'success')
    } catch (e) {
      console.error(e)
      showToast(`Échec nettoyage cache : ${e}`, 'error')
    }
  }

  const openDeliveryOptimization = async () => {
    try {
      const msg = await invoke<string>('open_delivery_optimization_settings')
      showToast(msg, 'info')
    } catch (e) {
      console.error(e)
      showToast(`Échec ouverture paramètres : ${e}`, 'error')
    }
  }

  useEffect(() => {
    fetchSources()

    const savedPath = localStorage.getItem('neoget-install-path')
    if (savedPath) setInstallPath(savedPath)

    const savedMode = localStorage.getItem('neoget-install-mode')
    if (savedMode) setInstallMode(savedMode as 'silent' | 'interactive')

    const savedCatalog = localStorage.getItem('neoget-custom-catalog-url')
    if (savedCatalog) setCustomCatalogUrl(savedCatalog)

    const savedIncludeUnknown = localStorage.getItem('neoget-winget-include-unknown')
    if (savedIncludeUnknown !== null) setIncludeUnknown(savedIncludeUnknown === 'true')

    const savedForceUpgrade = localStorage.getItem('neoget-winget-force-upgrade')
    if (savedForceUpgrade !== null) setForceUpgrade(savedForceUpgrade === 'true')
  }, [])

  const handleSaveGeneral = (e: FormEvent) => {
    e.preventDefault()
    localStorage.setItem('neoget-install-path', installPath)
    localStorage.setItem('neoget-install-mode', installMode)
    localStorage.setItem('neoget-winget-include-unknown', String(includeUnknown))
    localStorage.setItem('neoget-winget-force-upgrade', String(forceUpgrade))
    showToast('Paramètres généraux enregistrés.', 'success')
  }

  const resetCatalog = () => {
    setCustomCatalogUrl('')
    localStorage.removeItem('neoget-custom-catalog-url')
    localStorage.removeItem('neoget-custom-software')
    showToast('Catalogue réinitialisé.', 'info')
    window.dispatchEvent(new Event('catalog-updated'))
  }

  const handleSaveCatalogUrl = async (e: FormEvent) => {
    e.preventDefault()
    if (!customCatalogUrl) {
      resetCatalog()
      return
    }

    try {
      showToast('Téléchargement du catalogue externe...', 'info')
      const response = await fetch(customCatalogUrl)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()

      if (data && Array.isArray(data.categories)) {
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
        showToast('Nouveau catalogue importé et synchronisé.', 'success')
        window.dispatchEvent(new Event('catalog-updated'))
      } else {
        throw new Error("Structure JSON invalide. 'categories' absent ou incorrect.")
      }
    } catch (e) {
      console.error(e)
      showToast(`Échec du chargement : ${e}`, 'error')
    }
  }

  return (
    <div className="space-y-5 pb-24">
      <div className="surface-strong p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="page-title">Sources et paramètres</h2>
            <p className="page-copy mt-2">
              Ajustez le mode d’installation, le chemin par défaut et les catalogues partagés de votre environnement.
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-5">
          <div className="surface-strong p-5">
            <div className="flex items-center gap-3 border-b border-slate-200/70 pb-4 dark:border-white/10">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-extrabold text-slate-950 dark:text-white">Paramètres généraux</h3>
                <p className="text-sm font-medium text-slate-500">Préférences locales conservées sur ce poste.</p>
              </div>
            </div>

            <form onSubmit={handleSaveGeneral} className="mt-5 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    <Folder className="h-3.5 w-3.5" />
                    Dossier d’installation
                  </span>
                  <input
                    type="text"
                    value={installPath}
                    onChange={e => setInstallPath(e.target.value)}
                    className="input-field font-mono"
                  />
                </label>

                <div>
                  <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    <Wrench className="h-3.5 w-3.5" />
                    Mode d’exécution
                  </span>
                  <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-white/10 dark:bg-white/[0.045]">
                    {[
                      ['silent', 'Silencieux'],
                      ['interactive', 'Interactif']
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setInstallMode(value as 'silent' | 'interactive')}
                        className={`rounded-md px-3 py-2 text-sm font-bold transition ${
                          installMode === value
                            ? 'bg-white text-slate-950 shadow-sm dark:bg-white dark:text-slate-950'
                            : 'text-slate-500 hover:text-slate-950 dark:hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2 rounded-lg border border-slate-200/70 bg-slate-50 px-3 py-2 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.04]">
                  <input type="checkbox" checked={includeUnknown} onChange={e => setIncludeUnknown(e.target.checked)} />
                  Inclure inconnus (`--include-unknown`)
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-slate-200/70 bg-slate-50 px-3 py-2 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.04]">
                  <input type="checkbox" checked={forceUpgrade} onChange={e => setForceUpgrade(e.target.checked)} />
                  Forcer upgrades (`--force`)
                </label>
              </div>

              <button type="submit" className="btn-primary">
                Enregistrer les paramètres
              </button>
            </form>
          </div>

          <div className="surface-strong p-5">
            <div className="flex items-center gap-3 border-b border-slate-200/70 pb-4 dark:border-white/10">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent">
                <Code2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-extrabold text-slate-950 dark:text-white">Catalogue externe</h3>
                <p className="text-sm font-medium text-slate-500">Synchronisez une liste d’applications pour votre équipe.</p>
              </div>
            </div>

            <form onSubmit={handleSaveCatalogUrl} className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">URL JSON</span>
                <input
                  type="url"
                  placeholder="https://votre-site.com/catalogue-perso.json"
                  value={customCatalogUrl}
                  onChange={e => setCustomCatalogUrl(e.target.value)}
                  className="input-field"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button type="submit" className="btn-accent">
                  Télécharger et synchroniser
                </button>
                {customCatalogUrl && (
                  <button type="button" onClick={resetCatalog} className="btn-secondary">
                    Réinitialiser
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="surface-strong p-5">
            <div className="flex items-center gap-3 border-b border-slate-200/70 pb-4 dark:border-white/10">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-extrabold text-slate-950 dark:text-white">Maintenance WinGet</h3>
                <p className="text-sm font-medium text-slate-500">Profils rapides pour sources et upgrades globaux.</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" className="btn-secondary" onClick={updateSources}>
                winget source update
              </button>
              <button type="button" className="btn-secondary" onClick={resetSources}>
                winget source reset --force
              </button>
              <button type="button" className="btn-accent" onClick={() => runMaintenanceProfile('fast-upgrade')}>
                Upgrade rapide
              </button>
              <button type="button" className="btn-secondary" onClick={() => runMaintenanceProfile('repair-sources')}>
                Réparer les sources
              </button>
              <button type="button" className="btn-secondary" onClick={() => runMaintenanceProfile('full-maintenance')}>
                Mode maintenance forcée
              </button>
              <button type="button" className="btn-secondary" onClick={cleanupWingetCache}>
                Nettoyer cache winget
              </button>
              <button type="button" className="btn-secondary" onClick={openDeliveryOptimization}>
                Ouvrir Delivery Optimization
              </button>
              <button type="button" className="btn-secondary" onClick={restoreDefaultSources}>
                Restaurer sources par défaut
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="surface-strong p-5">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 pb-4 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-extrabold text-slate-950 dark:text-white">Dépôts actifs</h3>
                  <p className="text-xs font-semibold text-slate-500">{sources.length} source(s) WinGet</p>
                </div>
              </div>
              <button onClick={fetchSources} disabled={loadingSources} className="icon-button" type="button" title="Actualiser les sources">
                <RefreshCw className={`h-4 w-4 ${loadingSources ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {loadingSources ? (
                <div className="space-y-2">
                  <div className="skeleton-line h-14" />
                  <div className="skeleton-line h-14" />
                </div>
              ) : sources.length > 0 ? (
                sources.map((src, idx) => (
                  <div key={`${src.name}-${idx}`} className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-extrabold text-slate-950 dark:text-white">{src.name}</h4>
                        <code className="mt-1 block break-all text-[11px] font-semibold text-slate-500">{src.argument}</code>
                        {src.name.toLowerCase() === 'msstore' && (
                          <button
                            type="button"
                            onClick={() => removeSource(src.name)}
                            className="mt-2 rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-[11px] font-bold text-warning"
                          >
                            Retirer msstore
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm font-medium text-slate-500 dark:border-white/10">
                  Aucun dépôt actif détecté.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
