import { describe, it, expect } from 'vitest'
import {
  lernschrittTextSchema,
  lernschrittFotoSchema,
  lernschrittLinkSchema,
} from './lernschritt'

const UUID = '00000000-0000-4000-8000-000000000000'
const FILE = { name: 'x.jpg', size: 1024, type: 'image/jpeg' as const }

describe('lernschrittTextSchema', () => {
  it('akzeptiert gültigen Input', () => {
    const r = lernschrittTextSchema.safeParse({ parentId: UUID, text: 'Ich habe recherchiert' })
    expect(r.success).toBe(true)
  })
  it('lehnt ungültige parentId ab', () => {
    const r = lernschrittTextSchema.safeParse({ parentId: 'nicht-uuid', text: 'Hallo Welt' })
    expect(r.success).toBe(false)
  })
  it('lehnt Text unter 3 Zeichen ab', () => {
    expect(lernschrittTextSchema.safeParse({ parentId: UUID, text: 'ok' }).success).toBe(false)
  })
})

describe('lernschrittFotoSchema', () => {
  it('akzeptiert Foto ohne Kommentar', () => {
    const r = lernschrittFotoSchema.safeParse({ parentId: UUID, file: FILE })
    expect(r.success).toBe(true)
  })
  it('trimmt Kommentar', () => {
    const r = lernschrittFotoSchema.safeParse({
      parentId: UUID,
      file: FILE,
      comment: '  Notiz  ',
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.comment).toBe('Notiz')
  })
  it('lehnt ohne parentId ab', () => {
    expect(lernschrittFotoSchema.safeParse({ file: FILE }).success).toBe(false)
  })
})

describe('lernschrittLinkSchema', () => {
  it('akzeptiert gültige URL', () => {
    const r = lernschrittLinkSchema.safeParse({
      parentId: UUID,
      url: 'https://example.com',
    })
    expect(r.success).toBe(true)
  })
  it('lehnt keine URL ab', () => {
    const r = lernschrittLinkSchema.safeParse({ parentId: UUID, url: 'nicht-url' })
    expect(r.success).toBe(false)
  })
  it('behandelt Whitespace-Kommentar als undefined', () => {
    const r = lernschrittLinkSchema.safeParse({
      parentId: UUID,
      url: 'https://x.com',
      comment: '   ',
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.comment).toBeUndefined()
  })
})
