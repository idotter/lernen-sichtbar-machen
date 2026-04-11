import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core'
import { schoolUnits } from './school-units'
import { children } from './children'

export const feedbackLinks = pgTable('feedback_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  childId: uuid('child_id').references(() => children.id, { onDelete: 'cascade' }).notNull(),
  schoolId: uuid('school_id').references(() => schoolUnits.id, { onDelete: 'cascade' }).notNull(),
  // HMAC-signiertes Token — kryptografisch sicher, nicht erratbar
  token: text('token').notNull().unique(),
  // 30-Tage-TTL ab Erstellung
  expiresAt: timestamp('expires_at').notNull(),
  // Widerrufbar durch das Kind jederzeit
  revoked: boolean('revoked').default(false).notNull(),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type FeedbackLink = typeof feedbackLinks.$inferSelect
export type NewFeedbackLink = typeof feedbackLinks.$inferInsert
