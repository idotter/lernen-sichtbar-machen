import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core'
import { schoolUnits } from './school-units'
import { learningEntries } from './learning-entries'
import { users } from './users'

export const lp21Mappings = pgTable('lp21_mappings', {
  id: uuid('id').primaryKey().defaultRandom(),
  learningEntryId: uuid('learning_entry_id').references(() => learningEntries.id, { onDelete: 'cascade' }).notNull(),
  schoolId: uuid('school_id').references(() => schoolUnits.id, { onDelete: 'cascade' }).notNull(),
  // LP21-Code z.B. "NMG.5.2" — aus public/lp21/lp21-kompetenzraster.json
  lp21Code: text('lp21_code').notNull(),
  lp21Label: text('lp21_label'),
  // KI-vorgeschlagen (gestrichelt) vs. LP-bestätigt (solid)
  suggestedByAi: boolean('suggested_by_ai').default(true).notNull(),
  confirmed: boolean('confirmed').default(false).notNull(),
  confirmedAt: timestamp('confirmed_at'),
  confirmedByUserId: uuid('confirmed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type Lp21Mapping = typeof lp21Mappings.$inferSelect
export type NewLp21Mapping = typeof lp21Mappings.$inferInsert
