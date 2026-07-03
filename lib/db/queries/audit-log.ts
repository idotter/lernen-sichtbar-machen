import { and, desc, eq, gte, lte } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { aiAuditLog, type AiAuditLog } from '@/lib/db/schema/audit-log'

export type AiEventType =
  | 'ai/socratic-question'
  | 'ai/lp21-classification'
  | 'ai/lp21-confirmation'
  | 'ai/lp21-rejection'
  | 'ai/ki-rejected'
  | 'ai/ki-confirmed'

export interface WriteAuditLogParams {
  schoolId: string
  actorId: string
  eventType: AiEventType
  payload: Record<string, unknown>
}

/**
 * Append-only Insert in `ai_audit_log`. Wirft NICHT — Audit-Fehler dürfen
 * den KI-Call nicht abbrechen, aber werden geloggt.
 */
export async function writeAuditLog(params: WriteAuditLogParams): Promise<AiAuditLog | null> {
  try {
    const [row] = await db
      .insert(aiAuditLog)
      .values({
        schoolId: params.schoolId,
        actorId: params.actorId,
        eventType: params.eventType,
        payload: params.payload,
      })
      .returning()
    return row
  } catch (err) {
    console.error('[audit-log] write failed', err)
    return null
  }
}

export interface AuditEntriesFilter {
  from?: Date
  to?: Date
  eventType?: AiEventType
  limit?: number
  offset?: number
}

/**
 * Liefert Audit-Einträge einer Schule chronologisch (neueste zuerst).
 * Filter: Datumsbereich, Event-Type. Standard-Limit: 25.
 * schoolId ist PFLICHT — kein Cross-Tenant-Read.
 */
export async function getAuditEntries(
  schoolId: string,
  filter: AuditEntriesFilter = {}
): Promise<AiAuditLog[]> {
  const conditions = [eq(aiAuditLog.schoolId, schoolId)]
  if (filter.from) conditions.push(gte(aiAuditLog.createdAt, filter.from))
  if (filter.to) conditions.push(lte(aiAuditLog.createdAt, filter.to))
  if (filter.eventType) conditions.push(eq(aiAuditLog.eventType, filter.eventType))

  return db
    .select()
    .from(aiAuditLog)
    .where(and(...conditions))
    .orderBy(desc(aiAuditLog.createdAt))
    .limit(filter.limit ?? 25)
    .offset(filter.offset ?? 0)
}

export async function countAuditEntries(
  schoolId: string,
  filter: Pick<AuditEntriesFilter, 'from' | 'to' | 'eventType'> = {}
): Promise<number> {
  const conditions = [eq(aiAuditLog.schoolId, schoolId)]
  if (filter.from) conditions.push(gte(aiAuditLog.createdAt, filter.from))
  if (filter.to) conditions.push(lte(aiAuditLog.createdAt, filter.to))
  if (filter.eventType) conditions.push(eq(aiAuditLog.eventType, filter.eventType))

  const rows = await db
    .select({ id: aiAuditLog.id })
    .from(aiAuditLog)
    .where(and(...conditions))
  return rows.length
}
