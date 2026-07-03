import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: { select: vi.fn() },
}))

import { getTimelineWithArtefacts } from './learning-entries'
import { db } from '@/lib/db/client'

const CHILD_ID = '11111111-1111-4111-8111-111111111111'

function chainReturning(rows: unknown[]) {
  const chain: {
    from: () => typeof chain
    where: () => typeof chain
    orderBy: (...args: unknown[]) => Promise<unknown[]>
    then?: (resolve: (v: unknown[]) => void) => void
  } = {
    from: () => chain,
    where: () => chain,
    orderBy: async () => rows,
  }
  chain.then = (resolve) => resolve(rows)
  return chain
}

describe('getTimelineWithArtefacts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('gruppiert Root-Vorhaben mit Kindern und Artefakten', async () => {
    const now = new Date('2026-01-01T00:00:00Z')
    const entries = [
      { id: 'root-1', childId: CHILD_ID, parentId: null, type: 'frage', status: 'aktiv', text: 'Frage 1', createdAt: now, isDeleted: false },
      { id: 'child-1a', childId: CHILD_ID, parentId: 'root-1', type: 'schritt', status: 'aktiv', text: 'Schritt A', createdAt: new Date('2026-01-02'), isDeleted: false },
      { id: 'child-1b', childId: CHILD_ID, parentId: 'root-1', type: 'schritt', status: 'aktiv', text: 'Schritt B', createdAt: new Date('2026-01-03'), isDeleted: false },
      { id: 'root-2', childId: CHILD_ID, parentId: null, type: 'frage', status: 'abgeschlossen', text: 'Frage 2', createdAt: new Date('2026-01-05'), isDeleted: false },
    ]
    const arts = [
      { id: 'a1', learningEntryId: 'child-1a', childId: CHILD_ID, type: 'bild', url: 'https://x/img.jpg', isDeleted: false },
    ]

    vi.mocked(db.select)
      .mockReturnValueOnce(chainReturning(entries) as never)
      .mockReturnValueOnce(chainReturning(arts) as never)

    const result = await getTimelineWithArtefacts(CHILD_ID)

    expect(result).toHaveLength(2)
    // Neueste zuerst: root-2 vor root-1
    expect(result[0].id).toBe('root-2')
    expect(result[1].id).toBe('root-1')
    expect(result[1].children).toHaveLength(2)
    expect(result[1].children[0].artefacts).toHaveLength(1)
    expect(result[1].children[1].artefacts).toHaveLength(0)
  })

  it('liefert leeres Array wenn keine Entries', async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(chainReturning([]) as never)
      .mockReturnValueOnce(chainReturning([]) as never)
    const result = await getTimelineWithArtefacts(CHILD_ID)
    expect(result).toEqual([])
  })
})
