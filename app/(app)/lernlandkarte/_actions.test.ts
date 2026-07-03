import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth/children-session', () => ({ getCurrentChild: vi.fn() }))
vi.mock('@/lib/db/queries/learning-entries', () => ({
  createLearningEntry: vi.fn(),
  createLearningEntryWithArtefact: vi.fn(),
}))
vi.mock('@/lib/storage/upload-artefakt', () => ({ uploadArtefakt: vi.fn() }))
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: vi.fn() } }))

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
import { inngest } from '@/lib/inngest/client'

const CHILD_UUID = '22222222-2222-4222-8222-222222222222'
const CLASS_UUID = '33333333-3333-4333-8333-333333333333'
const SCHOOL_UUID = '44444444-4444-4444-8444-444444444444'
const mockChild = {
  child: { id: CHILD_UUID, classId: CLASS_UUID, schoolId: SCHOOL_UUID },
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
        childId: CHILD_UUID,
        schoolId: SCHOOL_UUID,
        classId: CLASS_UUID,
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

  it('erstellt schritt mit UUID parentId und triggert Inngest-Event', async () => {
    vi.mocked(getCurrentChild).mockResolvedValue(mockChild as never)
    vi.mocked(createLearningEntry).mockResolvedValue({ id: 'e2', type: 'schritt' } as never)
    const r = await addLernschritt(null, fd({ text: 'Ich habe recherchiert', parentId: PARENT_UUID }))
    expect(r.success).toBe(true)
    expect(createLearningEntry).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'schritt', parentId: PARENT_UUID })
    )
    expect(inngest.send).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'ai/generate-question',
        data: expect.objectContaining({
          schoolId: SCHOOL_UUID,
          childId: CHILD_UUID,
          learningStep: 'Ich habe recherchiert',
        }),
      })
    )
  })

  it('Lernschritt wird gespeichert auch wenn Inngest-Send scheitert', async () => {
    vi.mocked(getCurrentChild).mockResolvedValue(mockChild as never)
    vi.mocked(createLearningEntry).mockResolvedValue({ id: 'e3', type: 'schritt' } as never)
    vi.mocked(inngest.send).mockRejectedValue(new Error('inngest down'))
    const r = await addLernschritt(null, fd({ text: 'Weiter recherchiert', parentId: PARENT_UUID }))
    expect(r.success).toBe(true)
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
