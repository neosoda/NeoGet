import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { ProgressPayload, CartItem } from '../types'

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function useInstallation(clearCart: () => void) {
  const [installing, setInstalling] = useState(false)
  const [batchStatus, setBatchStatus] = useState<ProgressPayload | null>(null)
  const [loading, setLoading] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!isTauriRuntime()) return

    const unlisten = listen<ProgressPayload>('installation-progress', (event) => {
      setBatchStatus(event.payload)
    })

    return () => {
      unlisten.then(f => f())
    }
  }, [])

  const handleInstallSoftware = async (id: string, name: string) => {
    console.info(`[App] Lancement installation individuelle : ${name} (${id})`)
    setInstalling(true)
    setLoading(prev => new Set(prev).add(id))
    setBatchStatus({
      current_index: 0,
      total: 1,
      current_name: name,
      message: `Installation de ${name}...`,
      progress_percent: 0,
      is_finished: false,
      error: null
    })

    if (!isTauriRuntime()) {
      window.setTimeout(() => {
        setBatchStatus({
          current_index: 1,
          total: 1,
          current_name: name,
          message: `${name} prêt à être installé dans l’application Tauri.`,
          progress_percent: 100,
          is_finished: true,
          error: null
        })
        setLoading(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }, 700)
      return
    }
    
    try {
      const result = await invoke<string>('install_software', { id, name })
      console.info(`[App] Résultat installation ${name} :`, result)
      setBatchStatus({
        current_index: 1,
        total: 1,
        current_name: name,
        message: result,
        progress_percent: 100,
        is_finished: true,
        error: null
      })
    } catch (e) {
      console.error(`[App] Erreur installation ${name} :`, e)
      setBatchStatus(prev => prev ? { ...prev, error: String(e), is_finished: true } : null)
    } finally {
      setLoading(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleInstallBatch = async (cart: CartItem[]) => {
    if (cart.length === 0) return
    
    console.info(`[App] Lancement installation batch pour ${cart.length} logiciels`)
    setInstalling(true)
    setBatchStatus({
      current_index: 0,
      total: cart.length,
      current_name: 'Préparation...',
      message: `Lancement de l'installation de ${cart.length} logiciels...`,
      progress_percent: 0,
      is_finished: false,
      error: null
    })

    if (!isTauriRuntime()) {
      window.setTimeout(() => {
        setBatchStatus({
          current_index: cart.length,
          total: cart.length,
          current_name: 'Simulation navigateur',
          message: `${cart.length} logiciel(s) prêts pour l’installation Tauri.`,
          progress_percent: 100,
          is_finished: true,
          error: null
        })
        clearCart()
      }, 700)
      return
    }

    try {
      const result = await invoke('install_software_batch', { items: cart })
      console.info('[App] Batch lancé avec succès :', result)
      clearCart() // Vider le panier après lancement
    } catch (e) {
      console.error('[App] Échec du lancement du batch :', e)
      setBatchStatus(prev => prev ? { ...prev, error: String(e), is_finished: true } : null)
    }
  }

  const closeOverlay = () => {
    setInstalling(false)
    setBatchStatus(null)
  }

  return { installing, batchStatus, loading, setInstalling, setBatchStatus, handleInstallSoftware, handleInstallBatch, closeOverlay }
}
