import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { fromZodError, ok, fail, type ActionResult } from './action-result'

describe('ActionResult type', () => {
  it('success case hat data-Feld', () => {
    const result: ActionResult<string> = { success: true, data: 'test' }
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe('test')
  })

  it('error case hat error-String', () => {
    const result: ActionResult = { success: false, error: 'Fehler' }
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe('Fehler')
  })

  it('error case kann optionale fieldErrors enthalten', () => {
    const result: ActionResult = {
      success: false,
      error: 'Validierungsfehler',
      fieldErrors: { email: ['Ungültige E-Mail'] },
    }
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.fieldErrors?.email).toEqual(['Ungültige E-Mail'])
    }
  })
})

describe('fromZodError', () => {
  it('gibt fieldErrors aus ZodError zurück', () => {
    const schema = z.object({ name: z.string().min(1, 'Name erforderlich') })
    const result = schema.safeParse({ name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const actionResult = fromZodError(result.error)
      expect(actionResult.success).toBe(false)
      if (!actionResult.success) {
        expect(actionResult.error).toBe('Validierungsfehler')
        expect(actionResult.fieldErrors?.name).toBeDefined()
        expect(actionResult.fieldErrors?.name?.length).toBeGreaterThan(0)
      }
    }
  })

  it('gibt mehrere fieldErrors zurück', () => {
    const schema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
    })
    const result = schema.safeParse({ name: '', email: 'kein-email' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const actionResult = fromZodError(result.error)
      expect(actionResult.success).toBe(false)
      if (!actionResult.success) {
        expect(actionResult.fieldErrors?.name).toBeDefined()
        expect(actionResult.fieldErrors?.email).toBeDefined()
      }
    }
  })

  it('inkludiert formErrors (root-level refine) im error-String', () => {
    const schema = z.object({
      password: z.string(),
      confirm: z.string(),
    }).refine((d) => d.password === d.confirm, 'Passwörter stimmen nicht überein')
    const result = schema.safeParse({ password: 'abc', confirm: 'xyz' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const actionResult = fromZodError(result.error)
      expect(actionResult.success).toBe(false)
      if (!actionResult.success) {
        expect(actionResult.error).toBe('Passwörter stimmen nicht überein')
      }
    }
  })
})

describe('ok helper', () => {
  it('gibt success: true mit data zurück', () => {
    const r = ok('test')
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toBe('test')
  })

  it('funktioniert mit Objekten', () => {
    const r = ok({ id: 1, name: 'Test' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.id).toBe(1)
  })
})

describe('fail helper', () => {
  it('gibt success: false mit error zurück', () => {
    const r = fail('Unbekannter Fehler')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error).toBe('Unbekannter Fehler')
  })

  it('akzeptiert optionale fieldErrors', () => {
    const r = fail('Fehler', { feld: ['Pflichtfeld'] })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.fieldErrors?.feld).toEqual(['Pflichtfeld'])
  })
})
