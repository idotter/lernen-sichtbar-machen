import { pgTable, uuid, text, timestamp, boolean, integer, pgEnum } from 'drizzle-orm/pg-core'
import { schoolUnits } from './school-units'
import { children } from './children'
import { learningEntries } from './learning-entries'

export const artefactTypeEnum = pgEnum('artefact_type', ['text', 'bild', 'link'])

export const artefacts = pgTable('artefacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  learningEntryId: uuid('learning_entry_id').references(() => learningEntries.id, { onDelete: 'cascade' }).notNull(),
  childId: uuid('child_id').references(() => children.id, { onDelete: 'cascade' }).notNull(),
  schoolId: uuid('school_id').references(() => schoolUnits.id, { onDelete: 'cascade' }).notNull(),
  type: artefactTypeEnum('type').notNull(),
  // URL zu Supabase Storage (Bucket: artefakte) oder externer Link
  url: text('url'),
  // Rohtext für type='text'
  content: text('content'),
  // Dateigrösse in Bytes (max. 10 MB = 10_485_760)
  fileSizeBytes: integer('file_size_bytes'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type Artefact = typeof artefacts.$inferSelect
export type NewArtefact = typeof artefacts.$inferInsert
