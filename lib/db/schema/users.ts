import { pgTable, uuid, text, timestamp, pgEnum, boolean } from 'drizzle-orm/pg-core'
import { schoolUnits } from './school-units'

export const userRoleEnum = pgEnum('user_role', ['schulleitung', 'lehrperson'])

export const users = pgTable('users', {
  // PK = Supabase Auth UID — kein defaultRandom()
  id: uuid('id').primaryKey(),
  schoolId: uuid('school_id').references(() => schoolUnits.id, { onDelete: 'cascade' }).notNull(),
  role: userRoleEnum('role').notNull(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
