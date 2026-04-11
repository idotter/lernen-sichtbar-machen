import { describe, it, expect } from 'vitest'
import type { ActionResult } from './action-result'

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
