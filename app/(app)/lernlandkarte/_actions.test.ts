import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth/children-session', () => ({ getCurrentChild: vi.fn() }))
vi.mock('@/lib/db/queries/learning-entries', () => ({
  createLearningEntry: vi.fn(),
  createLearningEntryWithArtefact: vi.fn(),
}))
vi.mock('@/lib/storage/upload-artefakt', () => ({ uploadArtefakt: vi.fn() }))

import {
  createLernEntry,
  addLernschritt,
  addLernschrittMitFoto,
  addLernschrittMitLink,
  createLernEntryWithArtefact,
} from './_actions'
import { getCurrentChild } from '@/lib/auth/children-session'
import {
  createLearningEntry,
  createLearningEntryWithArtefact,
} from '@/lib/db/queries/learning-entries'

const mockChild = {
  child: { id: 'child-1', classId: 'class-1', schoolId: 'school-1' },
}

function fd(entries: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(entries)) f.append(k, v)
  return f
}

describe('createLernEntry', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lehnt ab ohne Kind-Session', async () => {
    vi.mocked(getCurrentChild).mockResolvedValue(null)
    const r = await createLernEntry(null, fd({ text: 'Warum regnet es?' }))
    expect(r.success).toBe(false)
  })

  it('lehnt Text unter 3 Zeichen ab', async () => {
    vi.mocked(getCurrentChild).mockResolvedValue(mockChild as never)
    const r = await createLernEntry(null, fd({ text: 'Hi' }))
    expect(r.success).toBe(false)
  })

  it('erstellt Frage-Entry bei gültigem Input', async () => {
    vi.mocked(getCurrentChild).mockResolvedValue(mockChild as never)
    vi.mocked(createLearningEntry).mockResolvedValue({ id: 'e1', type: 'frage' } as never)
    const r = await createLernEntry(null, fd({ text: 'Warum ist Wasser nass?' }))
    expect(r.success).toBe(true)
    expect(createLearningEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        childId: 'child-1',
        schoolId: 'school-1',
        classId: 'class-1',
        type: 'frage',
        status: 'aktiv',
        text: 'Warum ist Wasser nass?',
        parentId: null,
      })
    )
  })
})

describe('createLernEntryWithArtefact', () => {
  beforeEach(() => vi.clearAllMocks())

  function makeFile(name = 'foto.jpg', type = 'image/jpeg', size = 1024): File {
    return new File([new Uint8Array(size)], name, { type })
  }

  it('lehnt ohne Kind-Session ab', async () => {
    vi.mocked(getCurrentChild).mockResolvedValue(null)
    const fd = new FormData()
    fd.append('file', makeFile())
    const r = await createLernEntryWithArtefact(null, fd)
    expect(r.success).toBe(false)
  })

  it('lehnt ohne Datei ab', async () => {
    vi.mocked(getCurrentChild).mockResolvedValue(mockChild as never)
    const r = await createLernEntryWithArtefact(null, new FormData())
    expect(r.success).toBe(false)
  })

  it('lehnt SVG (unbekannter MIME-Typ) ab', async () => {
    vi.mocked(getCurrentChild).mockResolvedValue(mockChild as never)
    const fd = new FormData()
    fd.append('file', makeFile('x.svg', 'image/svg+xml', 100))
    const r = await createLernEntryWithArtefact(null, fd)
    expect(r.success).toBe(false)
  })

  it('erstellt Entry + Artefakt bei gültiger Datei', async () => {
    vi.mocked(getCurrentChild).mockResolvedValue(mockChild as never)
    vi.mocked(createLearningEntryWithArtefact).mockResolvedValue({
      entry: { id: 'e1' },
      artefact: { id: 'a1' },
    } as never)
    const fd = new FormData()
    fd.append('file', makeFile('foto.jpg', 'image/jpeg', 500))
    fd.append('comment', '  Ein Vogel  ')
    const r = await createLernEntryWithArtefact(null, fd)
    expect(r.success).toBe(true)
    expect(createLearningEntryWithArtefact).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Ein Vogel' })
    )
  })

  it('gibt fail zurück bei Upload-Fehler', async () => {
    vi.mocked(getCurrentChild).mockResolvedValue(mockChild as never)
    vi.mocked(createLearningEntryWithArtefact).mockRejectedValue(
      new Error('Upload fehlgeschlagen: Netzwerk')
    )
    const fd = new FormData()
    fd.append('file', makeFile())
    const r = await createLernEntryWithArtefact(null, fd)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error).toContain('Upload')
  })
})

const PARENT_UUID = '11111111-1111-4111-8111-111111111111'

describe('addLernschritt', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lehnt ohne parentId ab', async () => {
    vi.mocked(getCurrentChild).mockResolvedValue(mockChild as never)
    const r = await addLernschritt(null, fd({ text: 'Neuer Schritt' }))
    expect(r.success).toBe(false)
  })

  it('lehnt ungültige UUID ab', async () => {
    vi.mocked(getCurrentChild).mockResolvedValue(mockChild as never)
    const r = await addLernschritt(null, fd({ text: 'Neuer Schritt', parentId: 'parent-1' }))
    expect(r.success).toBe(false)
  })

  it('erstellt schritt mit UUID parentId', async () => {
    vi.mocked(getCurrentChild).mockResolvedValue(mockChild as never)
    vi.mocked(createLearningEntry).mockResolvedValue({ id: 'e2', type: 'schritt' } as never)
    const r = await addLernschritt(null, fd({ text: 'Ich habe recherchiert', parentId: PARENT_UUID }))
    expect(r.success).toBe(true)
    expect(createLearningEntry).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'schritt', parentId: PARENT_UUID })
    )
  })
})

describe('addLernschrittMitFoto', () => {
  beforeEach(() => vi.clearAllMocks())

  function makeFile(name = 'foto.jpg', type = 'image/jpeg', size = 1024): File {
    return new File([new Uint8Array(size)], name, { type })
  }

  it('erstellt Schritt + Bild-Artefakt', async () => {
    vi.mocked(getCurrentChild).mockResolvedValue(mockChild as never)
    vi.mocked(createLearningEntryWithArtefact).mockResolvedValue({
      entry: { id: 'e1' },
      artefact: { id: 'a1' },
    } as never)
    const f = new FormData()
    f.append('file', makeFile())
    f.append('parentId', PARENT_UUID)
    f.append('comment', 'Foto vom Vulkan')
    const r = await addLernschrittMitFoto(null, f)
    expect(r.success).toBe(true)
    expect(createLearningEntryWithArtefact).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: PARENT_UUID, artefactType: 'bild', text: 'Foto vom Vulkan' })
    )
  })

  it('lehnt ohne parentId ab', async () => {
    vi.mocked(getCurrentChild).mockResolvedValue(mockChild as never)
    const f = new FormData()
    f.append('file', makeFile())
    const r = await addLernschrittMitFoto(null, f)
    expect(r.success).toBe(false)
  })
})

describe('addLernschrittMitLink', () => {
  beforeEach(() => vi.clearAllMocks())

  it('erstellt Schritt mit Link-Artefakt', async () => {
    vi.mocked(getCurrentChild).mockResolvedValue(mockChild as never)
    vi.mocked(createLearningEntryWithArtefact).mockResolvedValue({
      entry: { id: 'e1' },
      artefact: { id: 'a1' },
    } as never)
    const r = await addLernschrittMitLink(
      null,
      fd({ parentId: PARENT_UUID, url: 'https://example.com', comment: 'Quelle' })
    )
    expect(r.success).toBe(true)
    expect(createLearningEntryWithArtefact).toHaveBeenCalledWith(
      expect.objectContaining({
        parentId: PARENT_UUID,
        artefactType: 'link',
        artefactUrl: 'https://example.com',
        text: 'Quelle',
      })
    )
  })

  it('lehnt ungültige URL ab', async () => {
    vi.mocked(getCurrentChild).mockResolvedValue(mockChild as never)
    const r = await addLernschrittMitLink(
      null,
      fd({ parentId: PARENT_UUID, url: 'nicht-url' })
    )
    expect(r.success).toBe(false)
  })
})
