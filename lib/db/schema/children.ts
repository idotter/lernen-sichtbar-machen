import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core'
import { schoolUnits } from './school-units'
import { classes } from './classes'

export const children = pgTable('children', {
  id: uuid('id').primaryKey().defaultRandom(),
  classId: uuid('class_id').references(() => classes.id, { onDelete: 'cascade' }).notNull(),
  schoolId: uuid('school_id').references(() => schoolUnits.id, { onDelete: 'cascade' }).notNull(),
  displayName: text('display_name').notNull(),
  // bcrypt/argon2 — NIEMALS plaintext speichern
  pinHash: text('pin_hash').notNull(),
  // Wird nach Custom JWT-Erstellung gesetzt (Story 2.3)
  supabaseUserId: uuid('supabase_user_id').unique(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type Child = typeof children.$inferSelect
export type NewChild = typeof children.$inferInsert
