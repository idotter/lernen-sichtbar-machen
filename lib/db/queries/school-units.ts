import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { schoolUnits, type SchoolUnit } from '@/lib/db/schema/school-units'

/**
 * Schuleinheit anhand ID laden.
 * school_units hat kein Soft-Delete — kein isDeleted-Filter nötig.
 */
export async function getSchoolUnit(schoolId: string): Promise<SchoolUnit | null> {
  const [unit] = await db
    .select()
    .from(schoolUnits)
    .where(eq(schoolUnits.id, schoolId))
    .limit(1)
  return unit ?? null
}
