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
