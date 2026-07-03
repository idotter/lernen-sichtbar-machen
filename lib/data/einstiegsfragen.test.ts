import { describe, it, expect } from 'vitest'
import {
  EINSTIEGSFRAGEN,
  einstiegsfrageSchema,
  getEinstiegsfrageById,
} from './einstiegsfragen'

describe('EINSTIEGSFRAGEN', () => {
  it('enthält 4-6 Einträge', () => {
    expect(EINSTIEGSFRAGEN.length).toBeGreaterThanOrEqual(4)
    expect(EINSTIEGSFRAGEN.length).toBeLessThanOrEqual(6)
  })

  it('alle Einträge erfüllen das Schema (u.a. max 15 Wörter)', () => {
    for (const frage of EINSTIEGSFRAGEN) {
      const r = einstiegsfrageSchema.safeParse(frage)
      expect(r.success, JSON.stringify(frage)).toBe(true)
    }
  })

  it('hat eindeutige IDs', () => {
    const ids = EINSTIEGSFRAGEN.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('findet Frage per ID', () => {
    expect(getEinstiegsfrageById('ef-vulkan')?.text).toContain('Vulkan')
    expect(getEinstiegsfrageById('nicht-existent')).toBeUndefined()
  })
})

describe('einstiegsfrageSchema', () => {
  const valid = { id: 'x', text: 'Warum?', icon: '❓', category: 'natur' as const }

  it('lehnt Fragen über 15 Wörter ab', () => {
    const text = Array(16).fill('wort').join(' ')
    const r = einstiegsfrageSchema.safeParse({ ...valid, text })
    expect(r.success).toBe(false)
  })

  it('lehnt unbekannte Kategorien ab', () => {
    const r = einstiegsfrageSchema.safeParse({ ...valid, category: 'sport' })
    expect(r.success).toBe(false)
  })
})
