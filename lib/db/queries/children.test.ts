import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: { select: vi.fn(), insert: vi.fn() },
}))

import {
  getChildrenByClass,
  getChildById,
  getClassByInviteCode,
  findChildForLogin,
  createChild,
} from './children'
import { db } from '@/lib/db/client'

/**
 * Helper: baut eine Thenable-Chain für Drizzle-Queries.
 * `.from().where()` wird als Promise awaited (getChildrenByClass),
 * `.from().where().limit(1)` gibt Array zurück (getById, findFor).
 */
function makeChain(result: unknown[]) {
  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit: vi.fn(async () => result),
    then: (resolve: (value: unknown[]) => void) => resolve(result),
  }
  return chain
}

describe('getChildrenByClass', () => {
  beforeEach(() => vi.clearAllMocks())

  it('gibt aktive Kinder einer Klasse zurück', async () => {
    const active = { id: 'c1', classId: 'class-1', isDeleted: false }
    vi.mocked(db.select).mockReturnValue(makeChain([active]))
    const result = await getChildrenByClass('class-1')
    expect(result).toEqual([active])
  })

  it('filtert soft-deleted heraus (leeres Ergebnis)', async () => {
    vi.mocked(db.select).mockReturnValue(makeChain([]))
    const result = await getChildrenByClass('class-1')
    expect(result).toEqual([])
  })
})

describe('getChildById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('gibt Kind zurück wenn aktiv', async () => {
    const child = { id: 'c1', isDeleted: false }
    vi.mocked(db.select).mockReturnValue(makeChain([child]))
    expect(await getChildById('c1')).toEqual(child)
  })

  it('gibt null zurück wenn Kind gelöscht oder nicht vorhanden', async () => {
    vi.mocked(db.select).mockReturnValue(makeChain([]))
    expect(await getChildById('c1')).toBeNull()
  })
})

describe('getClassByInviteCode', () => {
  beforeEach(() => vi.clearAllMocks())

  it('gibt Klasse zurück wenn Code aktiv', async () => {
    const klasse = { id: 'k1', name: '5b', inviteCode: 'ABC234', isDeleted: false }
    vi.mocked(db.select).mockReturnValue(makeChain([klasse]))
    expect(await getClassByInviteCode('ABC234')).toEqual(klasse)
  })

  it('gibt null zurück für unbekannten Code', async () => {
    vi.mocked(db.select).mockReturnValue(makeChain([]))
    expect(await getClassByInviteCode('WRONG1')).toBeNull()
  })
})

describe('findChildForLogin', () => {
  beforeEach(() => vi.clearAllMocks())

  it('gibt Kind zurück bei Treffer', async () => {
    const child = { id: 'c1', displayName: 'Anna', classId: 'class-1', isDeleted: false }
    vi.mocked(db.select).mockReturnValue(makeChain([child]))
    expect(await findChildForLogin('class-1', 'Anna')).toEqual(child)
  })

  it('gibt null zurück wenn Name nicht vorhanden', async () => {
    vi.mocked(db.select).mockReturnValue(makeChain([]))
    expect(await findChildForLogin('class-1', 'Unbekannt')).toBeNull()
  })
})

describe('createChild (Patch P3: supabaseUserId self-reference)', () => {
  beforeEach(() => vi.clearAllMocks())

  function mockInsertChain(insertedRow: any) {
    const chain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([insertedRow]),
    }
    vi.mocked(db.insert).mockReturnValue(chain as any)
    return chain
  }

  function mockUpdateChain(updatedRow: any) {
    const chain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([updatedRow]),
    }
    ;(db as any).update = vi.fn().mockReturnValue(chain)
    return chain
  }

  it('setzt supabaseUserId = children.id nach Insert', async () => {
    const inserted = {
      id: 'child-new-123',
      classId: 'class-1',
      schoolId: 'school-1',
      displayName: 'Anna',
      pinHash: 'hash',
      supabaseUserId: null,
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
    }
    const updated = { ...inserted, supabaseUserId: 'child-new-123' }
    mockInsertChain(inserted)
    const updateChain = mockUpdateChain(updated)

    const result = await createChild({
      classId: 'class-1',
      schoolId: 'school-1',
      displayName: 'Anna',
      pinHash: 'hash',
    })

    expect(result.supabaseUserId).toBe('child-new-123')
    expect(updateChain.set).toHaveBeenCalledWith({ supabaseUserId: 'child-new-123' })
  })
})
