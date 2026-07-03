'use server'
import { revalidatePath } from 'next/cache'
import { getCurrentChild } from '@/lib/auth/children-session'
import {
  createLearningEntry,
  createLearningEntryWithArtefact,
  confirmKIQuestion,
} from '@/lib/db/queries/learning-entries'
import { getCurrentUser } from '@/lib/db/queries/users'
import { writeAuditLog } from '@/lib/db/queries/audit-log'
import { createClient as createSupabaseServer } from '@/lib/supabase/server'
import { createLernEntrySchema } from '@/lib/validators/learning-entry'
import { artefactUploadSchema } from '@/lib/validators/artefact'
import {
  lernschrittTextSchema,
  lernschrittFotoSchema,
  lernschrittLinkSchema,
} from '@/lib/validators/lernschritt'
import { uploadArtefakt } from '@/lib/storage/upload-artefakt'
import { inngest } from '@/lib/inngest/client'
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
 * Text-Lernschritt zu einem bestehenden Vorhaben hinzufügen.
 * Triggert nach dem Speichern ein `ai/generate-question` Event für die
 * sokratische Gegenfrage (asynchron via Inngest, blockiert die Response nicht).
 */
export async function addLernschritt(
  _prevState: CreateLernEntryResult | null,
  formData: FormData
): Promise<CreateLernEntryResult> {
  const childSession = await getCurrentChild()
  if (!childSession) return fail('Keine Kind-Session gefunden.')

  const parsed = lernschrittTextSchema.safeParse({
    text: formData.get('text'),
    parentId: formData.get('parentId'),
  })
  if (!parsed.success) return fromZodError(parsed.error) as CreateLernEntryResult

  const entry = await createLearningEntry({
    childId: childSession.child.id,
    classId: childSession.child.classId,
    schoolId: childSession.child.schoolId,
    type: 'schritt',
    status: 'aktiv',
    text: parsed.data.text,
    parentId: parsed.data.parentId,
  })

  await triggerGenerateQuestion({
    schoolId: childSession.child.schoolId,
    childId: childSession.child.id,
    classId: childSession.child.classId,
    actorId: childSession.child.id,
    learningEntryId: entry.id,
    learningStep: parsed.data.text,
  })

  revalidatePath('/lernlandkarte')
  return ok(entry)
}

/**
 * Bestätigt eine KI-Frage — wechselt visuell von gestrichelt zu solid (UX-DR8).
 * Nur Lehrpersonen/Schulleitung (authentifizierte User) dürfen bestätigen.
 * Schreibt Audit-Log (Story 4.4).
 */
export async function confirmKIQuestionAction(
  entryId: string
): Promise<ActionResult<LearningEntry>> {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail('Nicht angemeldet.')

  const dbUser = await getCurrentUser(user.id)
  if (!dbUser) return fail('User nicht gefunden.')

  const entry = await confirmKIQuestion(entryId, dbUser.id)
  if (!entry) return fail('KI-Frage nicht gefunden.')

  await writeAuditLog({
    schoolId: entry.schoolId,
    actorId: dbUser.id,
    eventType: 'ai/lp21-confirmation',
    payload: { entryId, action: 'confirm-ki-question' },
  })

  revalidatePath('/lernlandkarte')
  return ok(entry)
}

/** Fire-and-forget Inngest-Trigger; Fehler blockieren die UI nicht. */
async function triggerGenerateQuestion(params: {
  schoolId: string
  actorId: string
  childId: string
  classId: string
  learningEntryId: string
  learningStep: string
}): Promise<void> {
  try {
    await inngest.send({
      name: 'ai/generate-question',
      data: { ...params, previousEntries: [] },
    })
  } catch (err) {
    console.error('[inngest] send failed', err)
  }
}

/**
 * Foto-Lernschritt zu einem bestehenden Vorhaben hinzufügen.
 */
export async function addLernschrittMitFoto(
  _prevState: CreateLernEntryWithArtefaktResult | null,
  formData: FormData
): Promise<CreateLernEntryWithArtefaktResult> {
  const childSession = await getCurrentChild()
  if (!childSession) return fail('Keine Kind-Session gefunden.')

  const file = formData.get('file')
  if (!(file instanceof File)) return fail('Keine Datei übergeben.')

  const parsed = lernschrittFotoSchema.safeParse({
    parentId: formData.get('parentId'),
    file: { name: file.name, size: file.size, type: file.type },
    comment: typeof formData.get('comment') === 'string' ? formData.get('comment') : undefined,
  })
  if (!parsed.success) return fromZodError(parsed.error) as CreateLernEntryWithArtefaktResult

  try {
    const result = await createLearningEntryWithArtefact({
      child: childSession.child,
      text: parsed.data.comment ?? null,
      parentId: parsed.data.parentId,
      artefactType: 'bild',
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
    return fail(err instanceof Error ? err.message : 'Upload fehlgeschlagen.')
  }
}

/**
 * Link-Lernschritt zu einem bestehenden Vorhaben hinzufügen.
 */
export async function addLernschrittMitLink(
  _prevState: CreateLernEntryWithArtefaktResult | null,
  formData: FormData
): Promise<CreateLernEntryWithArtefaktResult> {
  const childSession = await getCurrentChild()
  if (!childSession) return fail('Keine Kind-Session gefunden.')

  const parsed = lernschrittLinkSchema.safeParse({
    parentId: formData.get('parentId'),
    url: formData.get('url'),
    comment: typeof formData.get('comment') === 'string' ? formData.get('comment') : undefined,
  })
  if (!parsed.success) return fromZodError(parsed.error) as CreateLernEntryWithArtefaktResult

  const result = await createLearningEntryWithArtefact({
    child: childSession.child,
    text: parsed.data.comment ?? null,
    parentId: parsed.data.parentId,
    artefactType: 'link',
    artefactUrl: parsed.data.url,
  })
  revalidatePath('/lernlandkarte')
  return ok(result)
}
