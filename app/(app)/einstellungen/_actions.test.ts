import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/db/queries/users', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue('http://localhost:3000'),
  }),
}))

import { inviteSchulleitung } from './_actions'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/db/queries/users'

const mockAuthUser = { id: 'auth-user-123' }
const mockSLUser = {
  id: 'auth-user-123',
  schoolId: 'school-456',
  role: 'schulleitung' as const,
  email: 'sl@schule.ch',
  displayName: 'Max Muster',
  isDeleted: false,
  deletedAt: null,
  createdAt: new Date(),
}

describe('inviteSchulleitung', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gibt fieldErrors zurück bei ungültiger E-Mail', async () => {
    const formData = new FormData()
    formData.set('email', 'keine-email')

    const result = await inviteSchulleitung(null, formData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.fieldErrors?.email).toBeDefined()
    }
  })

  it('gibt Fehler zurück wenn nicht eingeloggt', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any)

    const formData = new FormData()
    formData.set('email', 'neu@schule.ch')

    const result = await inviteSchulleitung(null, formData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Nicht eingeloggt')
    }
  })

  it('gibt Fehler zurück wenn User kein Schulleitung-Role hat', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockAuthUser } }) },
    } as any)
    vi.mocked(getCurrentUser).mockResolvedValue({
      ...mockSLUser,
      role: 'lehrperson' as any,
    })

    const formData = new FormData()
    formData.set('email', 'neu@schule.ch')

    const result = await inviteSchulleitung(null, formData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Keine Berechtigung')
    }
  })

  it('gibt Fehler zurück wenn Admin-Invite fehlschlägt', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockAuthUser } }) },
    } as any)
    vi.mocked(getCurrentUser).mockResolvedValue(mockSLUser)
    vi.mocked(createAdminClient).mockReturnValue({
      auth: {
        admin: {
          inviteUserByEmail: vi.fn().mockResolvedValue({
            error: { message: 'User already registered' },
          }),
        },
      },
    } as any)

    const formData = new FormData()
    formData.set('email', 'neu@schule.ch')

    const result = await inviteSchulleitung(null, formData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Einladung konnte nicht verschickt werden')
    }
  })

  it('gibt ok() zurück bei erfolgreicher Einladung', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockAuthUser } }) },
    } as any)
    vi.mocked(getCurrentUser).mockResolvedValue(mockSLUser)
    vi.mocked(createAdminClient).mockReturnValue({
      auth: {
        admin: {
          inviteUserByEmail: vi.fn().mockResolvedValue({ error: null }),
        },
      },
    } as any)

    const formData = new FormData()
    formData.set('email', 'neu@schule.ch')

    const result = await inviteSchulleitung(null, formData)
    expect(result.success).toBe(true)
  })

  it('ruft inviteUserByEmail mit korrekten Parametern auf', async () => {
    const mockInvite = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockAuthUser } }) },
    } as any)
    vi.mocked(getCurrentUser).mockResolvedValue(mockSLUser)
    vi.mocked(createAdminClient).mockReturnValue({
      auth: { admin: { inviteUserByEmail: mockInvite } },
    } as any)

    const formData = new FormData()
    formData.set('email', 'zweite-sl@schule.ch')

    await inviteSchulleitung(null, formData)

    expect(mockInvite).toHaveBeenCalledWith(
      'zweite-sl@schule.ch',
      expect.objectContaining({
        redirectTo: expect.stringContaining('/registrierung/callback'),
        data: expect.objectContaining({
          pendingRole: 'schulleitung',
          schoolId: 'school-456',
        }),
      })
    )
  })
})
