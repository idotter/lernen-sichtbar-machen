import { pgTable, uuid, text, varchar, timestamp } from 'drizzle-orm/pg-core'

export const schoolUnits = pgTable('school_units', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  kanton: varchar('kanton', { length: 2 }),
  curriculumAdapter: varchar('curriculum_adapter', { length: 50 }).default('lp21').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type SchoolUnit = typeof schoolUnits.$inferSelect
export type NewSchoolUnit = typeof schoolUnits.$inferInsert
