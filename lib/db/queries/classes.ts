import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { classes, type Class, type NewClass } from '@/lib/db/schema/classes'

/**
 * Alle aktiven Klassen einer Schuleinheit laden.
 * PFLICHT: isDeleted-Filter gemäss Soft-Delete-Architektur (Epic-1-Retro).
 * RLS `classes_school_isolation` filtert auf school_id, Soft-Delete auf Applikationsebene.
 */
export async function getClassesBySchool(schoolId: string): Promise<Class[]> {
  return db
    .select()
    .from(classes)
    .where(and(eq(classes.schoolId, schoolId), eq(classes.isDeleted, false)))
}

/**
 * Einzelne Klasse anhand ID laden (inkl. Soft-Delete-Filter).
 */
export async function getClassById(classId: string): Promise<Class | null> {
  const [row] = await db
    .select()
    .from(classes)
    .where(and(eq(classes.id, classId), eq(classes.isDeleted, false)))
    .limit(1)
  return row ?? null
}

/**
 * Neue Klasse für eine Schuleinheit anlegen.
 * RLS erlaubt INSERT für authentifizierte User derselben Schule.
 */
export async function createClass(schoolId: string, name: string): Promise<Class> {
  const values: NewClass = { schoolId, name }
  const [row] = await db.insert(classes).values(values).returning()
  return row
}
