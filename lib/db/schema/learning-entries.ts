import { pgTable, uuid, text, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core'
import { schoolUnits } from './school-units'
import { classes } from './classes'
import { children } from './children'

export const learningEntryTypeEnum = pgEnum('learning_entry_type', ['frage', 'schritt', 'ki_question'])
export const learningEntryStatusEnum = pgEnum('learning_entry_status', ['aktiv', 'abgeschlossen'])

export const learningEntries = pgTable('learning_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  childId: uuid('child_id').references(() => children.id, { onDelete: 'cascade' }).notNull(),
  classId: uuid('class_id').references(() => classes.id, { onDelete: 'cascade' }).notNull(),
  schoolId: uuid('school_id').references(() => schoolUnits.id, { onDelete: 'cascade' }).notNull(),
  type: learningEntryTypeEnum('type').notNull(),
  status: learningEntryStatusEnum('status').notNull().default('aktiv'),
  text: text('text'),
  // parentId verknüpft Lernschritte und KI-Fragen mit dem auslösenden Vorhaben
  parentId: uuid('parent_id'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type LearningEntry = typeof learningEntries.$inferSelect
export type NewLearningEntry = typeof learningEntries.$inferInsert
