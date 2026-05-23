import { useState, useEffect } from 'react'
import { Database, Plus, Trash2, RefreshCw, Layers, Globe } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { WinGetSource, Software } from '../types'
import { showToast } from './ToastContainer'

export default function SourcesView() {
  const [sources, setSources] = useState<WinGetSource[]>([])
  const [loadingSources, setLoadingSources] = useState(false)

  // Custom added software state
  const [customApps, setCustomApps] = useState<Software[]>([])

  // Form state
  const [newName, setNewName] = useState('')
  const [newPackage, setNewPackage] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newCat, setNewCat] = useState('Développement')

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
    // Load custom apps from localStorage
    const saved = localStorage.getItem('neoget-custom-software')
    if (saved) {
      try {
        setCustomApps(JSON.parse(saved))
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  const handleAddCustomApp = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName || !newPackage || !newDesc) {
      showToast("Veuillez remplir tous les champs du logiciel.", "error")
      return
    }

    const newApp: Software = {
      name: newName,
      package: newPackage,
      description: newDesc
    }

    // Save in state & localStorage
    const saved = localStorage.getItem('neoget-custom-software')
    let appList: any[] = []
    if (saved) {
      try { appList = JSON.parse(saved) } catch (e) {}
    }

    // Add category parameter or save with categorisation
    const enrichedApp = { ...newApp, category: newCat }
    const updatedList = [...appList, enrichedApp]

    localStorage.setItem('neoget-custom-software', JSON.stringify(updatedList))
    setCustomApps(updatedList)

    // Reset form
    setNewName('')
    setNewPackage('')
    setNewDesc('')

    showToast(`${newName} a été ajouté à votre catalogue !`, "success")
    // Trigger custom event to notify App.tsx that catalog changed
    window.dispatchEvent(new Event('catalog-updated'))
  }

  const handleDeleteCustomApp = (packageId: string) => {
    const updated = customApps.filter(app => app.package !== packageId)
    localStorage.setItem('neoget-custom-software', JSON.stringify(updated))
    setCustomApps(updated)
    showToast("Logiciel retiré du catalogue personnalisé.", "success")
    window.dispatchEvent(new Event('catalog-updated'))
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: WinGet Sources & Local custom list */}
      <div className="lg:col-span-2 space-y-8">

        {/* WinGet Sources List */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Dépôts WinGet Actifs</h3>
            </div>
            <button
              onClick={fetchSources}
              disabled={loadingSources}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loadingSources ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-3">
            {loadingSources ? (
              <p className="text-center py-6 text-sm text-gray-500 animate-pulse">Chargement des dépôts...</p>
            ) : sources.length > 0 ? (
              sources.map((src, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-200/50 dark:border-gray-800 gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Globe className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm">{src.name}</h4>
                      <code className="text-[10px] font-mono text-gray-400 block break-all">{src.argument}</code>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20 font-bold self-start sm:self-center">
                    Actif
                  </span>
                </div>
              ))
            ) : (
              <p className="text-center py-6 text-sm text-gray-500">Aucun dépôt actif détecté.</p>
            )}
          </div>
        </div>

        {/* Local custom catalog list */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
            <Layers className="w-5 h-5 text-accent" />
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Votre Catalogue Personnel ({customApps.length})</h3>
          </div>

          <div className="space-y-3">
            {customApps.length > 0 ? (
              customApps.map((app, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-200/50 dark:border-gray-800 gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">{app.name}</h4>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-accent/15 text-accent font-semibold">
                        {(app as any).category || 'Personnalisé'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{app.description}</p>
                    <code className="text-[10px] font-mono text-gray-400 mt-1 block truncate">{app.package}</code>
                  </div>
                  <button
                    onClick={() => handleDeleteCustomApp(app.package)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
                Votre catalogue personnel est vide. Utilisez le formulaire de droite pour ajouter des outils sur-mesure !
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Custom Software Form */}
      <div>
        <div className="card p-6 border-primary/20 bg-gradient-to-b from-transparent to-primary/5 sticky top-24">
          <div className="flex items-center gap-3 mb-6">
            <Plus className="w-6 h-6 text-primary" />
            <h3 className="font-bold text-xl text-gray-900 dark:text-white">Ajouter un Logiciel</h3>
          </div>
          <form onSubmit={handleAddCustomApp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">Nom du logiciel</label>
              <input
                type="text"
                placeholder="Ex: Google Chrome"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">Package ID WinGet</label>
              <input
                type="text"
                placeholder="Ex: Google.Chrome"
                value={newPackage}
                onChange={e => setNewPackage(e.target.value)}
                className="input-field font-mono text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">Catégorie</label>
              <select
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                className="input-field text-sm"
              >
                <option value="Navigateurs Web">Navigateurs Web</option>
                <option value="Communication">Communication</option>
                <option value="Multimédia">Multimédia</option>
                <option value="Développement">Développement</option>
                <option value="Productivité">Productivité</option>
                <option value="Utilitaires">Utilitaires</option>
                <option value="Sécurité">Sécurité</option>
                <option value="Gaming">Gaming</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">Description rapide</label>
              <textarea
                placeholder="Description concise du rôle de l'application..."
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                className="input-field min-h-[80px] resize-none"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full btn-primary py-3.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm"
            >
              <Plus className="w-4 h-4" />
              Ajouter au catalogue
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
