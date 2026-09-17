import test from 'node:test'
import assert from 'node:assert/strict'
import { reconcileOperation } from '../src/operationState.ts'

const record = (status, changes = {}) => ({
  id: 'op-1', kind: 'upgrade', packageId: 'Firefox', packageName: 'Firefox',
  status, queuedAt: 1, startedAt: status === 'queued' ? null : 2,
  finishedAt: status === 'success' || status === 'failed' ? 3 : null,
  result: null, error: null, ...changes
})

test('late queue and running events cannot overwrite a completed operation', () => {
  const finished = [record('success')]
  assert.equal(reconcileOperation(finished, record('running')), finished)
  assert.equal(reconcileOperation(finished, record('queued')), finished)
  assert.equal(reconcileOperation(finished, record('success')), finished)
})

test('events for different operations remain separate', () => {
  const first = reconcileOperation([], record('queued'))
  const second = reconcileOperation(first, record('queued', { id: 'op-2', packageId: 'VLC' }))
  const updated = reconcileOperation(second, record('failed', { error: 'WinGet unavailable' }))
  assert.equal(updated.length, 2)
  assert.equal(updated[0].status, 'failed')
  assert.equal(updated[1].status, 'queued')
})
