import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { users, type User } from '@/lib/db/schema/users'
import type { UserRole } from '@/lib/navigation/config'

/**
 * Aktuellen User anhand Auth-UID laden.
 * PFLICHT: isDeleted-Filter gemäss Soft-Delete-Architektur (Epic-1-Retro).
 * RLS filtert is_deleted NICHT — muss auf Applikationsebene erfolgen.
 */
export async function getCurrentUser(userId: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.isDeleted, false)))
    .limit(1)
  return user ?? null
}

/**
 * Gibt alle aktiven Rollen eines Users zurück (Story 2.5).
 * MVP: Ein User hat genau eine Rolle — Array-Wrapper für Multi-Role-Kompatibilität.
 */
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const user = await getCurrentUser(userId)
  if (!user) return []
  return [user.role as UserRole]
}

/**
 * Alle aktiven (nicht soft-deleted) Users einer Schuleinheit laden.
 */
export async function getUsersBySchool(schoolId: string): Promise<User[]> {
  return db
    .select()
    .from(users)
    .where(and(eq(users.schoolId, schoolId), eq(users.isDeleted, false)))
}
