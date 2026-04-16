import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { users, type User } from '@/lib/db/schema/users'

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
