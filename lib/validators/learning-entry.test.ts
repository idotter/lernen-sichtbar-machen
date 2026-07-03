import { describe, it, expect } from 'vitest'
import { createLernEntrySchema } from './learning-entry'

describe('createLernEntrySchema', () => {
  it('akzeptiert 3-500 Zeichen', () => {
    expect(createLernEntrySchema.safeParse({ text: 'Was ist ein schwarzes Loch?' }).success).toBe(true)
  })

  it('lehnt Text unter 3 Zeichen ab', () => {
    const r = createLernEntrySchema.safeParse({ text: 'Hi' })
    expect(r.success).toBe(false)
  })

  it('lehnt Text über 500 Zeichen ab', () => {
    const r = createLernEntrySchema.safeParse({ text: 'a'.repeat(501) })
    expect(r.success).toBe(false)
  })

  it('trimmt Whitespace', () => {
    const r = createLernEntrySchema.safeParse({ text: '  Warum ist der Himmel blau?  ' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.text).toBe('Warum ist der Himmel blau?')
  })
})
