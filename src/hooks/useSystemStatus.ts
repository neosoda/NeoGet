import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { ProgressPayload } from '../types'

export function useSystemStatus() {
  const [wingetInstalled, setWingetInstalled] = useState(true)
  const [isAdmin, setIsAdmin] = useState(true)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const isInstalled = await invoke<boolean>('check_winget')
        setWingetInstalled(isInstalled)
      } catch (e) {
        console.error("Erreur check status:", e)
        setWingetInstalled(false)
      }

      try {
        const adminStatus = await invoke<boolean>('is_admin')
        setIsAdmin(adminStatus)
      } catch (e) {
        console.error("Erreur check admin:", e)
        setIsAdmin(false)
      }
    }
    checkStatus()
  }, [])

  const installWinget = async (setBatchStatus: (status: ProgressPayload | null | ((prev: ProgressPayload | null) => ProgressPayload | null)) => void, setInstalling: (val: boolean) => void) => {
    setInstalling(true)
    setBatchStatus({
      current_index: 0,
      total: 1,
      current_name: 'WinGet',
      message: 'Téléchargement et installation via API GitHub...',
      is_finished: false,
      error: null
    })
    try {
      const result = await invoke<string>('install_winget')
      setBatchStatus({
        current_index: 1,
        total: 1,
        current_name: 'WinGet',
        message: result,
        is_finished: true,
        error: null
      })
      setWingetInstalled(true)
    } catch (e) {
      setWingetInstalled(false)
      setBatchStatus(prev => prev ? { ...prev, error: String(e), is_finished: true } : null)
    }
  }

  return { wingetInstalled, isAdmin, installWinget }
}
