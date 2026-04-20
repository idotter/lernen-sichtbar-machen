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

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
  },
}))

import { inviteSchulleitung, inviteLehrperson } from './_actions'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/db/queries/users'
import { db } from '@/lib/db/client'

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

function mockAdminClientSuccess() {
  return {
    auth: {
      admin: {
        inviteUserByEmail: vi.fn().mockResolvedValue({
          data: { user: { id: 'invited-user-789' } },
          error: null,
        }),
        updateUserById: vi.fn().mockResolvedValue({ error: null }),
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
      },
    },
  } as any
}

// Mock-Chain für Dup-Check-Query: db.select().from().where().limit() → []
function mockDbSelectEmpty() {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  }
  vi.mocked(db.select).mockReturnValue(chain as any)
  return chain
}

function mockDbSelectExisting() {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ id: 'existing-user-id' }]),
  }
  vi.mocked(db.select).mockReturnValue(chain as any)
  return chain
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
            data: { user: null },
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
    vi.mocked(createAdminClient).mockReturnValue(mockAdminClientSuccess())

    const formData = new FormData()
    formData.set('email', 'neu@schule.ch')

    const result = await inviteSchulleitung(null, formData)
    expect(result.success).toBe(true)
  })

  it('ruft inviteUserByEmail und updateUserById mit korrekten Parametern auf', async () => {
    const adminMock = mockAdminClientSuccess()
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockAuthUser } }) },
    } as any)
    vi.mocked(getCurrentUser).mockResolvedValue(mockSLUser)
    vi.mocked(createAdminClient).mockReturnValue(adminMock)

    const formData = new FormData()
    formData.set('email', 'zweite-sl@schule.ch')

    await inviteSchulleitung(null, formData)

    // Schritt 1: Einladung
    expect(adminMock.auth.admin.inviteUserByEmail).toHaveBeenCalledWith(
      'zweite-sl@schule.ch',
      expect.objectContaining({
        redirectTo: expect.stringContaining('/registrierung/callback'),
      })
    )

    // Schritt 2: app_metadata setzen (sicher, nur server-seitig schreibbar)
    expect(adminMock.auth.admin.updateUserById).toHaveBeenCalledWith(
      'invited-user-789',
      {
        app_metadata: {
          pendingRole: 'schulleitung',
          schoolId: 'school-456',
        },
      }
    )
  })

  it('löscht Auth-User wenn updateUserById fehlschlägt', async () => {
    const adminMock = mockAdminClientSuccess()
    adminMock.auth.admin.updateUserById = vi.fn().mockResolvedValue({
      error: { message: 'metadata update failed' },
    })

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockAuthUser } }) },
    } as any)
    vi.mocked(getCurrentUser).mockResolvedValue(mockSLUser)
    vi.mocked(createAdminClient).mockReturnValue(adminMock)

    const formData = new FormData()
    formData.set('email', 'test@schule.ch')

    const result = await inviteSchulleitung(null, formData)
    expect(result.success).toBe(false)
    expect(adminMock.auth.admin.deleteUser).toHaveBeenCalledWith('invited-user-789')
  })
})

describe('inviteLehrperson', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gibt fieldErrors zurück bei ungültiger E-Mail', async () => {
    const formData = new FormData()
    formData.set('email', 'keine-email')

    const result = await inviteLehrperson(null, formData)
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
    formData.set('email', 'lp@schule.ch')

    const result = await inviteLehrperson(null, formData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Nicht eingeloggt')
    }
  })

  it('verweigert Einladung wenn User nicht Schulleitung ist', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockAuthUser } }) },
    } as any)
    vi.mocked(getCurrentUser).mockResolvedValue({
      ...mockSLUser,
      role: 'lehrperson' as any,
    })

    const formData = new FormData()
    formData.set('email', 'lp@schule.ch')

    const result = await inviteLehrperson(null, formData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Keine Berechtigung')
    }
  })

  it('gibt Dup-Fehler zurück wenn E-Mail bereits in der Schuleinheit existiert', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockAuthUser } }) },
    } as any)
    vi.mocked(getCurrentUser).mockResolvedValue(mockSLUser)
    mockDbSelectExisting()

    const formData = new FormData()
    formData.set('email', 'bereits-da@schule.ch')

    const result = await inviteLehrperson(null, formData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.fieldErrors?.email).toBeDefined()
      expect(result.error).toContain('bereits')
    }
  })

  it('gibt Fehler zurück wenn Admin-Invite fehlschlägt', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockAuthUser } }) },
    } as any)
    vi.mocked(getCurrentUser).mockResolvedValue(mockSLUser)
    mockDbSelectEmpty()
    vi.mocked(createAdminClient).mockReturnValue({
      auth: {
        admin: {
          inviteUserByEmail: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'already registered' },
          }),
        },
      },
    } as any)

    const formData = new FormData()
    formData.set('email', 'neu@schule.ch')

    const result = await inviteLehrperson(null, formData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Einladung konnte nicht verschickt werden')
    }
  })

  it('ruft inviteUserByEmail und updateUserById mit pendingRole=lehrperson auf', async () => {
    const adminMock = mockAdminClientSuccess()
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockAuthUser } }) },
    } as any)
    vi.mocked(getCurrentUser).mockResolvedValue(mockSLUser)
    mockDbSelectEmpty()
    vi.mocked(createAdminClient).mockReturnValue(adminMock)

    const formData = new FormData()
    formData.set('email', 'neu-lp@schule.ch')

    const result = await inviteLehrperson(null, formData)
    expect(result.success).toBe(true)

    expect(adminMock.auth.admin.inviteUserByEmail).toHaveBeenCalledWith(
      'neu-lp@schule.ch',
      expect.objectContaining({
        redirectTo: expect.stringContaining('/registrierung/callback'),
      })
    )
    expect(adminMock.auth.admin.updateUserById).toHaveBeenCalledWith(
      'invited-user-789',
      {
        app_metadata: {
          pendingRole: 'lehrperson',
          schoolId: 'school-456',
        },
      }
    )
  })

  it('löscht Auth-User wenn updateUserById fehlschlägt', async () => {
    const adminMock = mockAdminClientSuccess()
    adminMock.auth.admin.updateUserById = vi.fn().mockResolvedValue({
      error: { message: 'metadata update failed' },
    })

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockAuthUser } }) },
    } as any)
    vi.mocked(getCurrentUser).mockResolvedValue(mockSLUser)
    mockDbSelectEmpty()
    vi.mocked(createAdminClient).mockReturnValue(adminMock)

    const formData = new FormData()
    formData.set('email', 'lp@schule.ch')

    const result = await inviteLehrperson(null, formData)
    expect(result.success).toBe(false)
    expect(adminMock.auth.admin.deleteUser).toHaveBeenCalledWith('invited-user-789')
  })
})
