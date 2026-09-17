import type { OperationRecord } from './types'

const rank = { queued: 0, running: 1, success: 2, failed: 2, cancelled: 2 }

export function reconcileOperation(previous: OperationRecord[], incoming: OperationRecord): OperationRecord[] {
  const index = previous.findIndex(item => item.id === incoming.id)
  if (index < 0) return [...previous, incoming]
  const current = previous[index]
  if (rank[incoming.status] < rank[current.status]) return previous
  if (incoming.status === current.status && incoming.startedAt === current.startedAt && incoming.finishedAt === current.finishedAt && incoming.error === current.error) return previous
  const next = [...previous]
  next[index] = incoming
  return next
}
