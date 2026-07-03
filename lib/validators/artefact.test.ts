import { describe, it, expect } from 'vitest'
import { artefactFileSchema, artefactUploadSchema, MAX_FILE_SIZE } from './artefact'

describe('artefactFileSchema', () => {
  it('akzeptiert JPG unter 10 MB', () => {
    const r = artefactFileSchema.safeParse({
      name: 'foto.jpg',
      size: 1024,
      type: 'image/jpeg',
    })
    expect(r.success).toBe(true)
  })

  it('akzeptiert PDF, PNG, GIF', () => {
    for (const type of ['application/pdf', 'image/png', 'image/gif']) {
      const r = artefactFileSchema.safeParse({ name: 'x', size: 500, type })
      expect(r.success).toBe(true)
    }
  })

  it('lehnt unbekannten MIME-Typ ab', () => {
    const r = artefactFileSchema.safeParse({
      name: 'foo.svg',
      size: 500,
      type: 'image/svg+xml',
    })
    expect(r.success).toBe(false)
  })

  it('lehnt Dateien über 10 MB ab', () => {
    const r = artefactFileSchema.safeParse({
      name: 'gross.jpg',
      size: MAX_FILE_SIZE + 1,
      type: 'image/jpeg',
    })
    expect(r.success).toBe(false)
  })

  it('lehnt leere Datei ab', () => {
    const r = artefactFileSchema.safeParse({ name: 'x', size: 0, type: 'image/jpeg' })
    expect(r.success).toBe(false)
  })
})

describe('artefactUploadSchema', () => {
  const validFile = { name: 'x.jpg', size: 1024, type: 'image/jpeg' }

  it('akzeptiert Upload ohne Kommentar', () => {
    const r = artefactUploadSchema.safeParse({ file: validFile })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.comment).toBeUndefined()
  })

  it('trimmt und übernimmt Kommentar', () => {
    const r = artefactUploadSchema.safeParse({ file: validFile, comment: '  Hallo  ' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.comment).toBe('Hallo')
  })

  it('behandelt Whitespace-Kommentar als leer', () => {
    const r = artefactUploadSchema.safeParse({ file: validFile, comment: '   ' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.comment).toBeUndefined()
  })

  it('lehnt Kommentar über 500 Zeichen ab', () => {
    const r = artefactUploadSchema.safeParse({
      file: validFile,
      comment: 'a'.repeat(501),
    })
    expect(r.success).toBe(false)
  })
})
