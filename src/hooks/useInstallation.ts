import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { CartItem, OperationRecord, ProgressPayload } from '../types'
import { reconcileOperation } from '../operationState'

const active = (item: OperationRecord) => item.status === 'queued' || item.status === 'running'
const mode = () => localStorage.getItem('neoget-install-mode') === 'interactive' ? 'interactive' : 'silent'

export function useInstallation(clearCart: () => void) {
  const [operations, setOperations] = useState<OperationRecord[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [installing, setInstalling] = useState(false)
  const seenSuccess = useRef(new Set<string>())

  const upsert = useCallback((item: OperationRecord) => {
    setOperations(previous => reconcileOperation(previous, item))
  }, [])

  const hasActive = operations.some(active)
  useEffect(() => {
    if (!hasActive) return
    let pending = false
    const timer = window.setInterval(async () => {
      if (pending) return
      pending = true
      try {
        const snapshot = await invoke<OperationRecord[]>('list_operations')
        snapshot.forEach(upsert)
      } catch (error) {
        console.error('Synchronisation des opérations impossible :', error)
      } finally {
        pending = false
      }
    }, 2000)
    return () => window.clearInterval(timer)
  }, [hasActive, upsert])

  useEffect(() => {
    let disposed = false
    let unlisten: (() => void) | undefined
    const connect = async () => {
      unlisten = await listen<OperationRecord>('operation-changed', event => {
        upsert(event.payload)
        setSelectedIds(previous => previous.includes(event.payload.id) ? previous : [...previous, event.payload.id])
        setInstalling(true)
      })
      if (disposed) { unlisten(); return }
      const snapshot = await invoke<OperationRecord[]>('list_operations')
      if (!disposed) {
        snapshot.filter(item => item.status === 'success').forEach(item => seenSuccess.current.add(item.id))
        snapshot.forEach(upsert)
        const pending = snapshot.filter(active)
        if (pending.length > 0) {
          setSelectedIds(previous => [...new Set([...previous, ...pending.map(item => item.id)])])
          setInstalling(true)
        }
      }
    }
    connect().catch(error => console.error('Suivi des opérations indisponible :', error))
    return () => { disposed = true; unlisten?.() }
  }, [upsert])

  useEffect(() => {
    for (const operation of operations) {
      if (operation.status !== 'success' || seenSuccess.current.has(operation.id)) continue
      seenSuccess.current.add(operation.id)
      if (operation.kind === 'upgrade') window.dispatchEvent(new CustomEvent('software-upgraded', { detail: { id: operation.packageId } }))
      if (operation.kind === 'uninstall') window.dispatchEvent(new CustomEvent('software-uninstalled', { detail: { id: operation.packageId } }))
      if (operation.kind === 'install') window.dispatchEvent(new CustomEvent('software-installed', { detail: { id: operation.packageId } }))
    }
  }, [operations])

  const accept = useCallback((accepted: OperationRecord[]) => {
    accepted.forEach(upsert)
    setSelectedIds(previous => [...new Set([...previous, ...accepted.map(item => item.id)])])
    setInstalling(true)
  }, [upsert])

  const queueOne = useCallback(async (kind: 'install' | 'upgrade' | 'uninstall', id: string, name: string) => {
    const operation = await invoke<OperationRecord>(`queue_${kind}`, { id, name, mode: mode() })
    accept([operation])
    return operation
  }, [accept])

  const queueBatch = useCallback(async (kind: 'install' | 'upgrade', items: CartItem[], force = true) => {
    if (items.length === 0) return []
    const accepted = await invoke<OperationRecord[]>(`queue_${kind}_batch`, kind === 'upgrade' ? { items, mode: mode(), force } : { items, mode: mode() })
    accept(accepted)
    if (kind === 'install') clearCart()
    return accepted
  }, [accept, clearCart])

  const selected = useMemo(() => selectedIds.map(id => operations.find(item => item.id === id)).filter((item): item is OperationRecord => Boolean(item)), [selectedIds, operations])
  const loading = useMemo(() => new Set(operations.filter(active).map(item => item.packageId)), [operations])
  const batchStatus: ProgressPayload | null = useMemo(() => {
    if (selected.length === 0) return null
    const completed = selected.filter(item => !active(item))
    const current = selected.find(item => item.status === 'running') ?? selected.find(active) ?? selected[selected.length - 1]
    const failed = completed.filter(item => item.status === 'failed')
    return {
      current_index: completed.length,
      total: selected.length,
      current_name: current.packageName,
      message: active(current) ? `${current.status === 'queued' ? 'En attente' : 'En cours'} : ${current.packageName}` : `${completed.length} opération(s) terminée(s)`,
      progress_percent: Math.round(completed.length / selected.length * 100),
      is_finished: completed.length === selected.length,
      error: failed.length ? failed.map(item => `${item.packageName} : ${item.error}`).join('\n') : null
    }
  }, [selected])

  const closeOverlay = () => {
    if (selected.some(active)) return
    setInstalling(false)
    setSelectedIds([])
  }

  return {
    installing, batchStatus, loading, operations: selected,
    handleInstallSoftware: (id: string, name: string) => queueOne('install', id, name),
    handleInstallBatch: (items: CartItem[]) => queueBatch('install', items),
    handleUpgradeSoftware: (id: string, name: string) => queueOne('upgrade', id, name),
    handleUpgradeBatch: (items: CartItem[], force = true) => queueBatch('upgrade', items, force),
    handleUninstallSoftware: (id: string, name: string) => queueOne('uninstall', id, name),
    closeOverlay
  }
}
