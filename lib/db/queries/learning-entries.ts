import { and, eq, isNull, asc } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { learningEntries, type LearningEntry } from '@/lib/db/schema/learning-entries'
import { artefacts, type Artefact } from '@/lib/db/schema/artefacts'

export type LearningEntryWithArtefacts = LearningEntry & {
  artefacts: Artefact[]
}

/**
 * Aktive Lernvorhaben eines Kindes (Root-Entries ohne parentId).
 * Soft-Delete-Filter auf Kind und Entry.
 */
export async function getActiveLernvorhaben(childId: string): Promise<LearningEntry[]> {
  return db
    .select()
    .from(learningEntries)
    .where(
      and(
        eq(learningEntries.childId, childId),
        isNull(learningEntries.parentId),
        eq(learningEntries.isDeleted, false),
        eq(learningEntries.status, 'aktiv')
      )
    )
    .orderBy(asc(learningEntries.createdAt))
}

/**
 * Alle Einträge (Vorhaben + Schritte + KI-Fragen) eines Kindes für die Timeline.
 * Sortiert nach createdAt ASC.
 */
export async function getTimelineEntries(childId: string): Promise<LearningEntry[]> {
  return db
    .select()
    .from(learningEntries)
    .where(
      and(
        eq(learningEntries.childId, childId),
        eq(learningEntries.isDeleted, false)
      )
    )
    .orderBy(asc(learningEntries.createdAt))
}

/**
 * Neuen Lerneintrag anlegen (Vorhaben oder Schritt).
 */
export async function createLearningEntry(
  data: Omit<typeof learningEntries.$inferInsert, 'id' | 'createdAt' | 'isDeleted' | 'deletedAt'>
): Promise<LearningEntry> {
  const [entry] = await db
    .insert(learningEntries)
    .values(data)
    .returning()
  return entry
}

export interface CreateLearningEntryWithArtefactParams {
  child: { id: string; classId: string; schoolId: string }
  text: string | null
  parentId?: string | null
  artefactType?: 'bild' | 'link'
  artefactUrl?: string
  artefactContent?: string | null
  upload?: (entryId: string) => Promise<{
    publicUrl: string
    mimeType: string
    sizeBytes: number
  }>
}

/**
 * Erstellt ein Lernvorhaben mit Bild-Artefakt in einer Transaktion.
 * Upload läuft zwischen Entry-Insert und Artefakt-Insert; bei Upload-Fehler
 * wird die Transaktion zurückgerollt.
 */
export async function createLearningEntryWithArtefact({
  child,
  text,
  parentId = null,
  artefactType,
  artefactUrl,
  artefactContent = null,
  upload,
}: CreateLearningEntryWithArtefactParams): Promise<{ entry: LearningEntry; artefact: Artefact }> {
  return db.transaction(async (tx) => {
    const [entry] = await tx
      .insert(learningEntries)
      .values({
        childId: child.id,
        classId: child.classId,
        schoolId: child.schoolId,
        type: 'schritt',
        status: 'aktiv',
        text,
        parentId,
      })
      .returning()

    let type: 'bild' | 'link' = artefactType ?? 'bild'
    let url: string | null = artefactUrl ?? null
    let sizeBytes: number | null = null

    if (upload) {
      const uploaded = await upload(entry.id)
      type = 'bild'
      url = uploaded.publicUrl
      sizeBytes = uploaded.sizeBytes
    }

    const [artefact] = await tx
      .insert(artefacts)
      .values({
        learningEntryId: entry.id,
        childId: child.id,
        schoolId: child.schoolId,
        type,
        url,
        content: artefactContent,
        fileSizeBytes: sizeBytes,
      })
      .returning()

    return { entry, artefact }
  })
}
