import { and, eq, isNull, asc, sql } from 'drizzle-orm'
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
 * Alle Einträge inkl. Artefakte, gruppiert nach Vorhaben (Root-Entry mit Kindern).
 * Root = parentId IS NULL. Sortierung: Root nach createdAt DESC, Kinder ASC.
 */
export async function getTimelineWithArtefacts(childId: string): Promise<
  Array<LearningEntryWithArtefacts & { children: LearningEntryWithArtefacts[] }>
> {
  const [entries, allArtefacts] = await Promise.all([
    db
      .select()
      .from(learningEntries)
      .where(
        and(
          eq(learningEntries.childId, childId),
          eq(learningEntries.isDeleted, false)
        )
      )
      .orderBy(asc(learningEntries.createdAt)),
    db
      .select()
      .from(artefacts)
      .where(and(eq(artefacts.childId, childId), eq(artefacts.isDeleted, false))),
  ])

  const artefactsByEntry = new Map<string, Artefact[]>()
  for (const a of allArtefacts) {
    const list = artefactsByEntry.get(a.learningEntryId) ?? []
    list.push(a)
    artefactsByEntry.set(a.learningEntryId, list)
  }

  const withArtefacts: LearningEntryWithArtefacts[] = entries.map((e) => ({
    ...e,
    artefacts: artefactsByEntry.get(e.id) ?? [],
  }))

  const roots = withArtefacts.filter((e) => e.parentId === null)
  const childrenByParent = new Map<string, LearningEntryWithArtefacts[]>()
  for (const e of withArtefacts) {
    if (!e.parentId) continue
    const list = childrenByParent.get(e.parentId) ?? []
    list.push(e)
    childrenByParent.set(e.parentId, list)
  }

  return roots
    .slice()
    .reverse()
    .map((root) => ({ ...root, children: childrenByParent.get(root.id) ?? [] }))
}

/**
 * Bestätigt eine KI-Frage (setzt `ki_confirmed_at` + `ki_confirmed_by`).
 * Return: aktualisierter Eintrag oder `null` wenn nicht gefunden.
 */
export async function confirmKIQuestion(
  entryId: string,
  actorUserId: string
): Promise<LearningEntry | null> {
  const [row] = await db
    .update(learningEntries)
    .set({ kiConfirmedAt: sql`now()`, kiConfirmedBy: actorUserId })
    .where(and(eq(learningEntries.id, entryId), eq(learningEntries.type, 'ki_question')))
    .returning()
  return row ?? null
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
