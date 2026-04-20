// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest'

// SUPABASE_JWT_SECRET wird für JWT-Tests gebraucht
beforeAll(() => {
  if (!process.env.SUPABASE_JWT_SECRET) {
    process.env.SUPABASE_JWT_SECRET = 'test-secret-at-least-32-chars-long-please'
  }
})

import {
  hashPin,
  verifyPin,
  generateInviteCode,
  createChildSession,
  verifyChildSession,
} from './children-auth'

describe('hashPin / verifyPin', () => {
  it('hashPin erzeugt niemals den Plaintext zurück', async () => {
    const hash = await hashPin('1234')
    expect(hash).not.toBe('1234')
    expect(hash.length).toBeGreaterThan(10)
  })

  it('verifyPin bestätigt korrekte PIN', async () => {
    const hash = await hashPin('4711')
    expect(await verifyPin('4711', hash)).toBe(true)
  })

  it('verifyPin lehnt falsche PIN ab', async () => {
    const hash = await hashPin('4711')
    expect(await verifyPin('0000', hash)).toBe(false)
  })

  it('zweimal dasselbe Passwort erzeugt unterschiedliche Hashes (Salt)', async () => {
    const h1 = await hashPin('1234')
    const h2 = await hashPin('1234')
    expect(h1).not.toBe(h2)
  })
})

describe('generateInviteCode', () => {
  it('erzeugt genau 6 Zeichen', () => {
    for (let i = 0; i < 10; i++) {
      expect(generateInviteCode()).toHaveLength(6)
    }
  })

  it('enthält nur erlaubte Zeichen (keine 0, O, 1, I, l)', () => {
    const verbotene = /[01OIl]/
    for (let i = 0; i < 50; i++) {
      const code = generateInviteCode()
      expect(code).not.toMatch(verbotene)
      expect(code).toMatch(/^[A-Z2-9]+$/)
    }
  })

  it('erzeugt unterschiedliche Codes (extrem hohe Kollisionsfreiheit)', () => {
    const codes = new Set<string>()
    for (let i = 0; i < 100; i++) {
      codes.add(generateInviteCode())
    }
    // Bei 32^6 möglichen Codes sind 100 eindeutige höchst wahrscheinlich
    expect(codes.size).toBe(100)
  })
})

describe('createChildSession / verifyChildSession', () => {
  const payload = {
    sub: 'child-123',
    role: 'kind' as const,
    schoolId: 'school-456',
    classId: 'class-789',
  }

  it('erzeugter Token kann wieder verifiziert werden', async () => {
    const token = await createChildSession(payload)
    const verified = await verifyChildSession(token)
    expect(verified).not.toBeNull()
    expect(verified?.sub).toBe('child-123')
    expect(verified?.role).toBe('kind')
    expect(verified?.schoolId).toBe('school-456')
    expect(verified?.classId).toBe('class-789')
  })

  it('ungültiger Token wird abgelehnt', async () => {
    const verified = await verifyChildSession('nonsense.token.here')
    expect(verified).toBeNull()
  })

  it('leerer Token wird abgelehnt', async () => {
    expect(await verifyChildSession('')).toBeNull()
  })

  it('verifyChildSession lehnt Token mit falschem role-Claim ab', async () => {
    // Manuell einen Token mit role='lehrperson' signieren — sollte als Kind-Session ungültig sein
    const { SignJWT } = await import('jose')
    const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET!)
    const fremdToken = await new SignJWT({ role: 'lehrperson', school_id: 'x', class_id: 'y' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-1')
      .setIssuer('supabase')
      .setAudience('authenticated')
      .setExpirationTime('1h')
      .sign(secret)
    expect(await verifyChildSession(fremdToken)).toBeNull()
  })
})
