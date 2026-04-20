import { pgTable, uuid, text, timestamp, boolean, varchar } from 'drizzle-orm/pg-core'
import { schoolUnits } from './school-units'

export const classes = pgTable('classes', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').references(() => schoolUnits.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  // 6-stelliger Einladungscode für Lernende (Story 2.3) — alphanumerisch, ohne verwechselbare Zeichen
  inviteCode: varchar('invite_code', { length: 6 }).unique(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type Class = typeof classes.$inferSelect
export type NewClass = typeof classes.$inferInsert
