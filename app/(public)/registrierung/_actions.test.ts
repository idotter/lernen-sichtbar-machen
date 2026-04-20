import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// headers-Mock nicht mehr nötig — Origin kommt jetzt aus Env-Var

import { registerSchulleitung } from './_actions'
import { createClient } from '@/lib/supabase/server'

describe('registerSchulleitung', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gibt fieldErrors zurück bei ungültiger E-Mail', async () => {
    const formData = new FormData()
    formData.set('email', 'keine-gueltige-email')
    formData.set('passwort', 'password123')
    formData.set('anzeigeName', 'Max Muster')
    formData.set('schulName', 'Primarschule Zürich')

    const result = await registerSchulleitung(null, formData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.fieldErrors?.email).toBeDefined()
    }
  })

  it('gibt fieldErrors zurück wenn Passwort zu kurz ist', async () => {
    const formData = new FormData()
    formData.set('email', 'test@example.com')
    formData.set('passwort', 'kurz')
    formData.set('anzeigeName', 'Max Muster')
    formData.set('schulName', 'Primarschule Zürich')

    const result = await registerSchulleitung(null, formData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.fieldErrors?.passwort).toBeDefined()
    }
  })

  it('gibt fieldErrors zurück wenn Anzeigename zu kurz ist', async () => {
    const formData = new FormData()
    formData.set('email', 'test@example.com')
    formData.set('passwort', 'password123')
    formData.set('anzeigeName', 'X')
    formData.set('schulName', 'Primarschule Zürich')

    const result = await registerSchulleitung(null, formData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.fieldErrors?.anzeigeName).toBeDefined()
    }
  })

  it('gibt pendingConfirmation zurück bei erfolgreicher Registrierung', async () => {
    const mockSignUp = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-123' }, session: null },
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue({
      auth: { signUp: mockSignUp },
    } as any)

    const formData = new FormData()
    formData.set('email', 'test@example.com')
    formData.set('passwort', 'password123')
    formData.set('anzeigeName', 'Max Muster')
    formData.set('schulName', 'Primarschule Zürich')

    const result = await registerSchulleitung(null, formData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.pendingConfirmation).toBe(true)
    }
  })

  it('gibt Fehler zurück wenn Supabase signUp fehlschlägt', async () => {
    const mockSignUp = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'E-Mail bereits registriert' },
    })
    vi.mocked(createClient).mockResolvedValue({
      auth: { signUp: mockSignUp },
    } as any)

    const formData = new FormData()
    formData.set('email', 'test@example.com')
    formData.set('passwort', 'password123')
    formData.set('anzeigeName', 'Max Muster')
    formData.set('schulName', 'Primarschule Zürich')

    const result = await registerSchulleitung(null, formData)
    expect(result.success).toBe(false)
    if (!result.success) {
      // Sanitized error — keine rohen Supabase-Messages mehr
      expect(result.error).toContain('Registrierung fehlgeschlagen')
    }
  })
})
