'use server'
import { revalidatePath } from 'next/cache'
import { getCurrentChild } from '@/lib/auth/children-session'
import { createLearningEntry } from '@/lib/db/queries/learning-entries'
import { createLernEntrySchema } from '@/lib/validators/learning-entry'
import { ok, fail, fromZodError, type ActionResult } from '@/lib/utils/action-result'
import type { LearningEntry } from '@/lib/db/schema/learning-entries'

export type CreateLernEntryResult = ActionResult<LearningEntry>

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
