import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { schoolUnits } from './school-units'

// APPEND-ONLY — kein DELETE-Recht für App-User (via RLS)
// EU AI Act Compliance: unveränderlicher Audit-Log aller KI-Entscheidungen
export const aiAuditLog = pgTable('ai_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').references(() => schoolUnits.id).notNull(),
  // Wer hat ausgelöst: childId oder userId
  actorId: text('actor_id').notNull(),
  // z.B. 'ai/classify-lp21', 'ai/generate-feedback-suggestion'
  eventType: text('event_type').notNull(),
  // Vollständige Event-Daten für Nachvollziehbarkeit
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // KEIN is_deleted — append-only, kein Soft-Delete, kein DELETE
})

export type AiAuditLog = typeof aiAuditLog.$inferSelect
export type NewAiAuditLog = typeof aiAuditLog.$inferInsert
