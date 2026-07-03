import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({ db: { insert: vi.fn() } }))

import { writeAuditLog } from './audit-log'
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
