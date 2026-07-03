import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({ db: { insert: vi.fn(), select: vi.fn() } }))

import { writeAuditLog, getAuditEntries, countAuditEntries } from './audit-log'
import { db } from '@/lib/db/client'

function chain(rows: unknown[]) {
  return {
    values: () => ({
      returning: async () => rows,
    }),
  }
}

describe('writeAuditLog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('inserted Row wird zurückgegeben', async () => {
    vi.mocked(db.insert).mockReturnValue(chain([{ id: 'row-1' }]) as never)
    const r = await writeAuditLog({
      schoolId: 's1',
      actorId: 'a1',
      eventType: 'ai/socratic-question',
      payload: { foo: 'bar' },
    })
    expect(r?.id).toBe('row-1')
  })

  it('gibt null zurück bei Insert-Fehler (Audit blockiert nie den KI-Call)', async () => {
    vi.mocked(db.insert).mockImplementation(() => {
      throw new Error('DB down')
    })
    const r = await writeAuditLog({
      schoolId: 's1',
      actorId: 'a1',
      eventType: 'ai/socratic-question',
      payload: {},
    })
    expect(r).toBeNull()
  })
})

describe('getAuditEntries / countAuditEntries', () => {
  beforeEach(() => vi.clearAllMocks())

  function selectChain(rows: unknown[]) {
    const chain: {
      from: () => typeof chain
      where: () => typeof chain
      orderBy: () => typeof chain
      limit: () => typeof chain
      offset: (n: number) => Promise<unknown[]>
      then?: (resolve: (v: unknown[]) => void) => void
    } = {
      from: () => chain,
      where: () => chain,
      orderBy: () => chain,
      limit: () => chain,
      offset: async () => rows,
    }
    chain.then = (resolve) => resolve(rows)
    return chain
  }

  it('gibt gefilterte Einträge zurück', async () => {
    vi.mocked(db.select).mockReturnValue(selectChain([{ id: '1' }, { id: '2' }]) as never)
    const r = await getAuditEntries('school-1', { limit: 10 })
    expect(r).toHaveLength(2)
  })

  it('zählt Einträge korrekt', async () => {
    vi.mocked(db.select).mockReturnValue(selectChain([{ id: '1' }, { id: '2' }, { id: '3' }]) as never)
    const n = await countAuditEntries('school-1')
    expect(n).toBe(3)
  })
})
