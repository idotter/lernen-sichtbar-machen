import { db } from '@/lib/db/client'
import { aiAuditLog, type AiAuditLog } from '@/lib/db/schema/audit-log'

export type AiEventType =
  | 'ai/socratic-question'
  | 'ai/lp21-classification'
  | 'ai/lp21-confirmation'
  | 'ai/lp21-rejection'

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
