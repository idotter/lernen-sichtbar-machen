import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { children, type Child, type NewChild } from '@/lib/db/schema/children'
import { classes, type Class } from '@/lib/db/schema/classes'

/**
 * Alle aktiven Kinder einer Klasse laden.
 * PFLICHT: isDeleted-Filter (Soft-Delete-Architektur, Epic-1-Retro).
 */
export async function getChildrenByClass(classId: string): Promise<Child[]> {
  return db
    .select()
    .from(children)
    .where(and(eq(children.classId, classId), eq(children.isDeleted, false)))
}

/**
 * Einzelnes Kind anhand ID laden (inkl. Soft-Delete-Filter).
 */
export async function getChildById(childId: string): Promise<Child | null> {
  const [row] = await db
    .select()
    .from(children)
    .where(and(eq(children.id, childId), eq(children.isDeleted, false)))
    .limit(1)
  return row ?? null
}

/**
 * Klasse anhand Einladungscode suchen (Kind-Login-Flow).
 * Kind gibt Code ein → Klasse wird gefunden → Kind kann sich registrieren.
 * PFLICHT: isDeleted-Filter.
 */
export async function getClassByInviteCode(inviteCode: string): Promise<Class | null> {
  const [row] = await db
    .select()
    .from(classes)
    .where(and(eq(classes.inviteCode, inviteCode), eq(classes.isDeleted, false)))
    .limit(1)
  return row ?? null
}

/**
 * Neues Kind anlegen. Caller ist verantwortlich für: pinHash bereits gehashed,
 * schoolId aus Klasse abgeleitet. `supabaseUserId` wird automatisch auf die neue
 * `children.id` gesetzt (Patch P3) damit RLS-Policies mit `supabase_user_id = auth.uid()`
 * korrekt funktionieren.
 */
export async function createChild(values: Omit<NewChild, 'supabaseUserId'>): Promise<Child> {
  const [row] = await db.insert(children).values(values).returning()
  // supabaseUserId = children.id: Self-Reference sodass JWT `sub` = auth.uid() = supabase_user_id
  const [updated] = await db
    .update(children)
    .set({ supabaseUserId: row.id })
    .where(eq(children.id, row.id))
    .returning()
  return updated
}

/**
 * Kind anhand (classId, displayName) für Login-Flow suchen.
 * Patch P5: Case-insensitiv via `LOWER()` — "Anna" und "anna" treffen dieselbe Zeile.
 * DB-seitig abgesichert via partieller UNIQUE-Index (Migration 0004).
 */
export async function findChildForLogin(classId: string, displayName: string): Promise<Child | null> {
  const [row] = await db
    .select()
    .from(children)
    .where(
      and(
        eq(children.classId, classId),
        sql`LOWER(${children.displayName}) = LOWER(${displayName})`,
        eq(children.isDeleted, false)
      )
    )
    .limit(1)
  return row ?? null
}
