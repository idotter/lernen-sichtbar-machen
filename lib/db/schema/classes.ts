import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core'
import { schoolUnits } from './school-units'

export const classes = pgTable('classes', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').references(() => schoolUnits.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type Class = typeof classes.$inferSelect
export type NewClass = typeof classes.$inferInsert
