import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/db/queries/users', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('@/lib/db/queries/classes', () => ({
  createClass: vi.fn(),
  getClassById: vi.fn(),
}))


vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
  },
}))

import { createClass as createClassAction, inviteLehrpersonToClass } from './_actions'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/db/queries/users'
import { createClass as dbCreateClass } from '@/lib/db/queries/classes'
import { db } from '@/lib/db/client'

const mockAuthUser = { id: 'auth-user-123' }
const mockLP = {
  id: 'auth-user-123',
  schoolId: 'school-456',
  role: 'lehrperson' as const,
  email: 'lp@schule.ch',
  displayName: 'LP User',
  isDeleted: false,
  deletedAt: null,
  createdAt: new Date(),
}

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
    limit: vi.fn().mockResolvedValue([{ id: 'existing-id' }]),
  }
  vi.mocked(db.select).mockReturnValue(chain as any)
  return chain
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

describe('createClass action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gibt fieldErrors zurück bei zu kurzem Klassennamen', async () => {
    const formData = new FormData()
    formData.set('name', 'a')

    const result = await createClassAction(null, formData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.fieldErrors?.name).toBeDefined()
    }
  })

  it('gibt fieldErrors zurück bei zu langem Klassennamen', async () => {
    const formData = new FormData()
    formData.set('name', 'x'.repeat(101))

    const result = await createClassAction(null, formData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.fieldErrors?.name).toBeDefined()
    }
  })

  it('gibt Fehler zurück wenn nicht eingeloggt', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any)

    const formData = new FormData()
    formData.set('name', '3a')

    const result = await createClassAction(null, formData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Nicht eingeloggt')
    }
  })

  it('gibt Fehler zurück wenn kein Benutzerkonto existiert', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockAuthUser } }) },
    } as any)
    vi.mocked(getCurrentUser).mockResolvedValue(null)

    const formData = new FormData()
    formData.set('name', '3a')

    const result = await createClassAction(null, formData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Kein Benutzerkonto')
    }
  })

  it('legt Klasse an und gibt ok mit id zurück', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockAuthUser } }) },
    } as any)
    vi.mocked(getCurrentUser).mockResolvedValue(mockLP)
    vi.mocked(dbCreateClass).mockResolvedValue({
      id: 'new-class-id',
      schoolId: 'school-456',
      name: '3a',
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
    })

    const formData = new FormData()
    formData.set('name', '3a')

    const result = await createClassAction(null, formData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe('new-class-id')
    }
    expect(dbCreateClass).toHaveBeenCalledWith('school-456', '3a')
  })

  it('trimmt Whitespace im Klassennamen', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockAuthUser } }) },
    } as any)
    vi.mocked(getCurrentUser).mockResolvedValue(mockLP)
    vi.mocked(dbCreateClass).mockResolvedValue({
      id: 'id',
      schoolId: 'school-456',
      name: '4b',
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
    })

    const formData = new FormData()
    formData.set('name', '  4b  ')

    await createClassAction(null, formData)
    expect(dbCreateClass).toHaveBeenCalledWith('school-456', '4b')
  })

  it('gibt Fehler zurück wenn DB-Insert fehlschlägt', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockAuthUser } }) },
    } as any)
    vi.mocked(getCurrentUser).mockResolvedValue(mockLP)
    vi.mocked(dbCreateClass).mockRejectedValue(new Error('DB down'))

    const formData = new FormData()
    formData.set('name', '3a')

    const result = await createClassAction(null, formData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Klasse konnte nicht angelegt werden')
    }
  })
})

describe('inviteLehrpersonToClass', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gibt fieldErrors zurück bei ungültiger E-Mail', async () => {
    const formData = new FormData()
    formData.set('email', 'keine-email')

    const result = await inviteLehrpersonToClass(null, formData)
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

    const result = await inviteLehrpersonToClass(null, formData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Nicht eingeloggt')
    }
  })

  it('gibt Dup-Fehler zurück wenn E-Mail bereits in der Schuleinheit existiert', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockAuthUser } }) },
    } as any)
    vi.mocked(getCurrentUser).mockResolvedValue(mockLP)
    mockDbSelectExisting()

    const formData = new FormData()
    formData.set('email', 'bereits-da@schule.ch')

    const result = await inviteLehrpersonToClass(null, formData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.fieldErrors?.email).toBeDefined()
    }
  })

  it('lädt zweite LP ein mit pendingRole=lehrperson und gleicher schoolId', async () => {
    const adminMock = mockAdminClientSuccess()
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockAuthUser } }) },
    } as any)
    vi.mocked(getCurrentUser).mockResolvedValue(mockLP)
    mockDbSelectEmpty()
    vi.mocked(createAdminClient).mockReturnValue(adminMock)

    const formData = new FormData()
    formData.set('email', 'kollegin@schule.ch')

    const result = await inviteLehrpersonToClass(null, formData)
    expect(result.success).toBe(true)

    expect(adminMock.auth.admin.inviteUserByEmail).toHaveBeenCalledWith(
      'kollegin@schule.ch',
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
      error: { message: 'meta update failed' },
    })

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockAuthUser } }) },
    } as any)
    vi.mocked(getCurrentUser).mockResolvedValue(mockLP)
    mockDbSelectEmpty()
    vi.mocked(createAdminClient).mockReturnValue(adminMock)

    const formData = new FormData()
    formData.set('email', 'neu@schule.ch')

    const result = await inviteLehrpersonToClass(null, formData)
    expect(result.success).toBe(false)
    expect(adminMock.auth.admin.deleteUser).toHaveBeenCalledWith('invited-user-789')
  })
})

