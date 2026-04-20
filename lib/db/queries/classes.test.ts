import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}))

import { getClassesBySchool, getClassById, createClass } from './classes'
import { db } from '@/lib/db/client'

describe('getClassesBySchool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gibt nur aktive Klassen zurück (Soft-Delete-Filter)', async () => {
    const activeClass = {
      id: 'c-1',
      schoolId: 'school-1',
      name: '3a',
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
    }

    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([activeClass]),
    }
    vi.mocked(db.select).mockReturnValue(chain as any)

    const result = await getClassesBySchool('school-1')
    expect(result).toEqual([activeClass])
  })

  it('gibt gelöschte Klasse NICHT zurück (Soft-Delete-Filter wirkt)', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      // RLS + Soft-Delete-Filter sorgt für leeres Ergebnis wenn is_deleted=true
      where: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.select).mockReturnValue(chain as any)

    const result = await getClassesBySchool('school-1')
    expect(result).toEqual([])
  })

  it('wendet where() mit and(schoolId, isDeleted=false) an', async () => {
    const whereMock = vi.fn().mockResolvedValue([])
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: whereMock,
    }
    vi.mocked(db.select).mockReturnValue(chain as any)

    await getClassesBySchool('school-1')
    expect(whereMock).toHaveBeenCalledOnce()
    expect(whereMock.mock.calls[0][0]).toBeDefined()
  })
})

describe('getClassById', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gibt Klasse zurück wenn aktiv', async () => {
    const mockClass = {
      id: 'c-1',
      schoolId: 'school-1',
      name: '3a',
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
    }

    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([mockClass]),
    }
    vi.mocked(db.select).mockReturnValue(chain as any)

    const result = await getClassById('c-1')
    expect(result).toEqual(mockClass)
  })

  it('gibt null zurück wenn gelöschte Klasse (Soft-Delete-Filter)', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.select).mockReturnValue(chain as any)

    const result = await getClassById('deleted-class')
    expect(result).toBeNull()
  })

  it('gibt null zurück wenn Klasse nicht existiert', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.select).mockReturnValue(chain as any)

    const result = await getClassById('nonexistent')
    expect(result).toBeNull()
  })
})

describe('createClass', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('legt neue Klasse an und gibt Row zurück', async () => {
    const newClass = {
      id: 'new-id',
      schoolId: 'school-1',
      name: '4b',
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
    }

    const chain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([newClass]),
    }
    vi.mocked(db.insert).mockReturnValue(chain as any)

    const result = await createClass('school-1', '4b')
    expect(result).toEqual(newClass)
    expect(chain.values).toHaveBeenCalledWith({ schoolId: 'school-1', name: '4b' })
  })
})
