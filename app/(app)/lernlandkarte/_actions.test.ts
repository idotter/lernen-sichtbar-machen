import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth/children-session', () => ({ getCurrentChild: vi.fn() }))
vi.mock('@/lib/db/queries/learning-entries', () => ({ createLearningEntry: vi.fn() }))

import { createLernEntry, addLernschritt } from './_actions'
import { getCurrentChild } from '@/lib/auth/children-session'
import { createLearningEntry } from '@/lib/db/queries/learning-entries'

const mockChild = {
  child: { id: 'child-1', classId: 'class-1', schoolId: 'school-1' },
}

function fd(entries: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(entries)) f.append(k, v)
  return f
}

describe('createLernEntry', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lehnt ab ohne Kind-Session', async () => {
    vi.mocked(getCurrentChild).mockResolvedValue(null)
    const r = await createLernEntry(null, fd({ text: 'Warum regnet es?' }))
    expect(r.success).toBe(false)
  })

  it('lehnt Text unter 3 Zeichen ab', async () => {
    vi.mocked(getCurrentChild).mockResolvedValue(mockChild as never)
    const r = await createLernEntry(null, fd({ text: 'Hi' }))
    expect(r.success).toBe(false)
  })

  it('erstellt Frage-Entry bei gültigem Input', async () => {
    vi.mocked(getCurrentChild).mockResolvedValue(mockChild as never)
    vi.mocked(createLearningEntry).mockResolvedValue({ id: 'e1', type: 'frage' } as never)
    const r = await createLernEntry(null, fd({ text: 'Warum ist Wasser nass?' }))
    expect(r.success).toBe(true)
    expect(createLearningEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        childId: 'child-1',
        schoolId: 'school-1',
        classId: 'class-1',
        type: 'frage',
        status: 'aktiv',
        text: 'Warum ist Wasser nass?',
        parentId: null,
      })
    )
  })
})

describe('addLernschritt', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lehnt ohne parentId ab', async () => {
    vi.mocked(getCurrentChild).mockResolvedValue(mockChild as never)
    const r = await addLernschritt(null, fd({ text: 'Neuer Schritt' }))
    expect(r.success).toBe(false)
  })

  it('erstellt schritt mit parentId', async () => {
    vi.mocked(getCurrentChild).mockResolvedValue(mockChild as never)
    vi.mocked(createLearningEntry).mockResolvedValue({ id: 'e2', type: 'schritt' } as never)
    const r = await addLernschritt(null, fd({ text: 'Ich habe recherchiert', parentId: 'parent-1' }))
    expect(r.success).toBe(true)
    expect(createLearningEntry).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'schritt', parentId: 'parent-1' })
    )
  })
})
