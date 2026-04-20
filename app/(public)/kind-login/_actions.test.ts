// @vitest-environment node
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

beforeAll(() => {
  if (!process.env.SUPABASE_JWT_SECRET) {
    process.env.SUPABASE_JWT_SECRET = 'test-secret-at-least-32-chars-long-please'
  }
})

vi.mock('@/lib/db/queries/children', () => ({
  getClassByInviteCode: vi.fn(),
  createChild: vi.fn(),
  findChildForLogin: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    set: vi.fn(),
  }),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

import { validateInviteCode, registerChild, loginChild } from './_actions'
import {
  getClassByInviteCode,
  createChild,
  findChildForLogin,
} from '@/lib/db/queries/children'
import { hashPin } from '@/lib/auth/children-auth'

const klasse = {
  id: 'class-1',
  schoolId: 'school-1',
  name: 'Klasse 5b',
  inviteCode: 'ABC234',
  isDeleted: false,
  deletedAt: null,
  createdAt: new Date(),
}

describe('validateInviteCode', () => {
  beforeEach(() => vi.clearAllMocks())

  it('validiert Code-Format: zu kurz → fieldErrors', async () => {
    const fd = new FormData()
    fd.set('code', 'ABC')
    const result = await validateInviteCode(null, fd)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.fieldErrors?.code).toBeDefined()
  })

  it('validiert Code-Format: Sonderzeichen → fieldErrors', async () => {
    const fd = new FormData()
    fd.set('code', 'ABC-23')
    const result = await validateInviteCode(null, fd)
    expect(result.success).toBe(false)
  })

  it('ungültiger Code (Klasse nicht gefunden) → fail', async () => {
    vi.mocked(getClassByInviteCode).mockResolvedValue(null)
    const fd = new FormData()
    fd.set('code', 'XYZ234')
    const result = await validateInviteCode(null, fd)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.fieldErrors?.code).toBeDefined()
  })

  it('gültiger Code → ok mit { valid: true } (kein Leak von Klassendaten, Patch P17)', async () => {
    vi.mocked(getClassByInviteCode).mockResolvedValue(klasse)
    const fd = new FormData()
    fd.set('code', 'ABC234')
    const result = await validateInviteCode(null, fd)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ valid: true })
    }
  })

  it('Code wird automatisch uppercase', async () => {
    vi.mocked(getClassByInviteCode).mockResolvedValue(klasse)
    const fd = new FormData()
    fd.set('code', 'abc234')
    const result = await validateInviteCode(null, fd)
    expect(result.success).toBe(true)
    expect(getClassByInviteCode).toHaveBeenCalledWith('ABC234')
  })
})

describe('registerChild', () => {
  beforeEach(() => vi.clearAllMocks())

  function buildForm(data: { code?: string; displayName?: string; pin?: string } = {}) {
    const fd = new FormData()
    fd.set('code', data.code ?? 'ABC234')
    fd.set('displayName', data.displayName ?? 'Anna')
    fd.set('pin', data.pin ?? '1234')
    return fd
  }

  it('PIN zu kurz → fieldErrors', async () => {
    const result = await registerChild(null, buildForm({ pin: '12' }))
    expect(result.success).toBe(false)
    if (!result.success) expect(result.fieldErrors?.pin).toBeDefined()
  })

  it('PIN mit Buchstaben → fieldErrors', async () => {
    const result = await registerChild(null, buildForm({ pin: '12ab' }))
    expect(result.success).toBe(false)
  })

  it('Name zu kurz → fieldErrors', async () => {
    const result = await registerChild(null, buildForm({ displayName: 'A' }))
    expect(result.success).toBe(false)
  })

  it('Name bereits in Klasse vergeben → fail mit fieldError', async () => {
    vi.mocked(getClassByInviteCode).mockResolvedValue(klasse)
    vi.mocked(findChildForLogin).mockResolvedValue({
      id: 'existing-1',
      classId: 'class-1',
      schoolId: 'school-1',
      displayName: 'Anna',
      pinHash: 'hashed',
      supabaseUserId: null,
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
    })
    const result = await registerChild(null, buildForm({ displayName: 'Anna' }))
    expect(result.success).toBe(false)
    if (!result.success) expect(result.fieldErrors?.displayName).toBeDefined()
  })

  it('ungültiger Code → fail', async () => {
    vi.mocked(getClassByInviteCode).mockResolvedValue(null)
    const result = await registerChild(null, buildForm())
    expect(result.success).toBe(false)
  })

  it('erfolgreiche Registrierung → redirect /lernlandkarte', async () => {
    vi.mocked(getClassByInviteCode).mockResolvedValue(klasse)
    vi.mocked(findChildForLogin).mockResolvedValue(null)
    vi.mocked(createChild).mockResolvedValue({
      id: 'new-child-1',
      classId: 'class-1',
      schoolId: 'school-1',
      displayName: 'Anna',
      pinHash: 'hashed',
      supabaseUserId: null,
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
    })

    await expect(registerChild(null, buildForm())).rejects.toThrow('REDIRECT:/lernlandkarte')
    expect(createChild).toHaveBeenCalledWith(
      expect.objectContaining({
        classId: 'class-1',
        schoolId: 'school-1',
        displayName: 'Anna',
      })
    )
  })
})

describe('loginChild', () => {
  beforeEach(() => vi.clearAllMocks())

  function buildForm(data: { code?: string; displayName?: string; pin?: string } = {}) {
    const fd = new FormData()
    fd.set('code', data.code ?? 'ABC234')
    fd.set('displayName', data.displayName ?? 'Anna')
    fd.set('pin', data.pin ?? '1234')
    return fd
  }

  it('ungültiger Code → fail', async () => {
    vi.mocked(getClassByInviteCode).mockResolvedValue(null)
    const result = await loginChild(null, buildForm())
    expect(result.success).toBe(false)
  })

  it('Name nicht gefunden → unified error ohne Feld-Zuordnung (Patch P12)', async () => {
    vi.mocked(getClassByInviteCode).mockResolvedValue(klasse)
    vi.mocked(findChildForLogin).mockResolvedValue(null)
    const result = await loginChild(null, buildForm())
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Name oder PIN')
      // Bewusst KEIN fieldErrors — verhindert Enumeration existierender Namen
      expect(result.fieldErrors).toBeUndefined()
    }
  })

  it('falsche PIN → unified error ohne Feld-Zuordnung (Patch P12)', async () => {
    vi.mocked(getClassByInviteCode).mockResolvedValue(klasse)
    const pinHash = await hashPin('5678') // echter Hash der ECHTEN PIN
    vi.mocked(findChildForLogin).mockResolvedValue({
      id: 'c1',
      classId: 'class-1',
      schoolId: 'school-1',
      displayName: 'Anna',
      pinHash,
      supabaseUserId: null,
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
    })
    const result = await loginChild(null, buildForm({ pin: '1234' })) // falsche PIN
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Name oder PIN')
      expect(result.fieldErrors).toBeUndefined()
    }
  })

  it('korrekte PIN → redirect /lernlandkarte', async () => {
    vi.mocked(getClassByInviteCode).mockResolvedValue(klasse)
    const pinHash = await hashPin('1234')
    vi.mocked(findChildForLogin).mockResolvedValue({
      id: 'c1',
      classId: 'class-1',
      schoolId: 'school-1',
      displayName: 'Anna',
      pinHash,
      supabaseUserId: null,
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
    })
    await expect(loginChild(null, buildForm({ pin: '1234' }))).rejects.toThrow('REDIRECT:/lernlandkarte')
  })
})
