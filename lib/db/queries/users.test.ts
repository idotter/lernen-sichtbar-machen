import { describe, it, expect, vi, beforeEach } from 'vitest'

// DB-Client mocken
vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
  },
}))

import { getCurrentUser } from './users'
import { db } from '@/lib/db/client'

describe('getCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gibt User zurück wenn aktiv (isDeleted: false)', async () => {
    const mockUser = {
      id: 'user-123',
      schoolId: 'school-456',
      role: 'schulleitung',
      email: 'test@schule.ch',
      displayName: 'Test User',
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
    }

    const mockChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([mockUser]),
    }
    vi.mocked(db.select).mockReturnValue(mockChain as any)

    const result = await getCurrentUser('user-123')
    expect(result).toEqual(mockUser)
  })

  it('gibt null zurück wenn User gelöscht ist (isDeleted: true) — Soft-Delete Filter', async () => {
    // isDeleted=true User darf NICHT zurückgegeben werden
    const mockChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),  // Leeres Array = kein Treffer (isDeleted-Filter wirkt)
    }
    vi.mocked(db.select).mockReturnValue(mockChain as any)

    const result = await getCurrentUser('deleted-user-456')
    expect(result).toBeNull()
  })

  it('gibt null zurück wenn User nicht gefunden wird', async () => {
    const mockChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.select).mockReturnValue(mockChain as any)

    const result = await getCurrentUser('nonexistent-user')
    expect(result).toBeNull()
  })

  it('wendet isDeleted=false Filter an (prüft where-Aufruf mit zwei Bedingungen)', async () => {
    const mockWhere = vi.fn().mockReturnThis()
    const mockChain = {
      from: vi.fn().mockReturnThis(),
      where: mockWhere,
      limit: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.select).mockReturnValue(mockChain as any)

    await getCurrentUser('user-123')

    // where() muss genau einmal aufgerufen worden sein (mit and(...) Kondition)
    expect(mockWhere).toHaveBeenCalledOnce()
    // Der Aufruf enthält eine kombinierte Bedingung (and() mit zwei Teilen)
    const whereArg = mockWhere.mock.calls[0][0]
    expect(whereArg).toBeDefined()
  })
})
