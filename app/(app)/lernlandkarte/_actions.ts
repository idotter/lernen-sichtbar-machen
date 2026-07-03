'use server'
import { revalidatePath } from 'next/cache'
import { getCurrentChild } from '@/lib/auth/children-session'
import {
  createLearningEntry,
  createLearningEntryWithArtefact,
} from '@/lib/db/queries/learning-entries'
import { createLernEntrySchema } from '@/lib/validators/learning-entry'
import { artefactUploadSchema } from '@/lib/validators/artefact'
import { uploadArtefakt } from '@/lib/storage/upload-artefakt'
import { ok, fail, fromZodError, type ActionResult } from '@/lib/utils/action-result'
import type { LearningEntry } from '@/lib/db/schema/learning-entries'
import type { Artefact } from '@/lib/db/schema/artefacts'

export type CreateLernEntryResult = ActionResult<LearningEntry>
export type CreateLernEntryWithArtefaktResult = ActionResult<{
  entry: LearningEntry
  artefact: Artefact
}>

/**
 * Neues Lernvorhaben per Freitext-Einstieg erstellen.
 */
export async function createLernEntry(
  _prevState: CreateLernEntryResult | null,
  formData: FormData
): Promise<CreateLernEntryResult> {
  const childSession = await getCurrentChild()
  if (!childSession) return fail('Keine Kind-Session gefunden.')

  const raw = { text: formData.get('text') }
  const parsed = createLernEntrySchema.safeParse(raw)
  if (!parsed.success) return fromZodError(parsed.error) as CreateLernEntryResult

  const entry = await createLearningEntry({
    childId: childSession.child.id,
    classId: childSession.child.classId,
    schoolId: childSession.child.schoolId,
    type: 'frage',
    status: 'aktiv',
    text: parsed.data.text,
    parentId: null,
  })

  revalidatePath('/lernlandkarte')
  return ok(entry)
}

/**
 * Lernvorhaben per Bild-Einstieg erstellen (Bild + optionaler Kommentar).
 * Zweistufig: (1) Learning Entry anlegen, (2) Datei in Storage hochladen,
 * (3) Artefakt-Row anlegen. Bei Upload-Fehler wird der Entry entfernt.
 */
export async function createLernEntryWithArtefact(
  _prevState: CreateLernEntryWithArtefaktResult | null,
  formData: FormData
): Promise<CreateLernEntryWithArtefaktResult> {
  const childSession = await getCurrentChild()
  if (!childSession) return fail('Keine Kind-Session gefunden.')

  const file = formData.get('file')
  if (!(file instanceof File)) return fail('Keine Datei übergeben.')

  const comment = formData.get('comment')
  const parsed = artefactUploadSchema.safeParse({
    file: { name: file.name, size: file.size, type: file.type },
    comment: typeof comment === 'string' ? comment : undefined,
  })
  if (!parsed.success) return fromZodError(parsed.error) as CreateLernEntryWithArtefaktResult

  try {
    const result = await createLearningEntryWithArtefact({
      child: childSession.child,
      text: parsed.data.comment ?? null,
      upload: async (entryId) =>
        uploadArtefakt({
          schoolId: childSession.child.schoolId,
          childId: childSession.child.id,
          entryId,
          file,
        }),
    })
    revalidatePath('/lernlandkarte')
    return ok(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload fehlgeschlagen.'
    return fail(message)
  }
}

/**
 * Lernschritt zu einem bestehenden Vorhaben hinzufügen.
 */
export async function addLernschritt(
  _prevState: CreateLernEntryResult | null,
  formData: FormData
): Promise<CreateLernEntryResult> {
  const childSession = await getCurrentChild()
  if (!childSession) return fail('Keine Kind-Session gefunden.')

  const raw = { text: formData.get('text'), parentId: formData.get('parentId') }
  const parsed = createLernEntrySchema.safeParse({ text: raw.text })
  if (!parsed.success) return fromZodError(parsed.error) as CreateLernEntryResult

  if (!raw.parentId || typeof raw.parentId !== 'string') {
    return fail('Vorhaben-ID fehlt.')
  }

  const entry = await createLearningEntry({
    childId: childSession.child.id,
    classId: childSession.child.classId,
    schoolId: childSession.child.schoolId,
    type: 'schritt',
    status: 'aktiv',
    text: parsed.data.text,
    parentId: raw.parentId,
  })

  revalidatePath('/lernlandkarte')
  return ok(entry)
}
