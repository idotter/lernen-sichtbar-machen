// lib/db/schema/zod.ts
// Zod-Schemas aus Drizzle-Inferenz — single source of truth
// Verwendung: Server Actions für Validierung (Story 3.x+)

import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { schoolUnits } from './school-units'
import { classes } from './classes'
import { users } from './users'
import { children } from './children'
import { learningEntries } from './learning-entries'
import { artefacts } from './artefacts'
import { lp21Mappings } from './lp21-mappings'
import { feedbackLinks } from './feedback-links'
import { aiAuditLog } from './audit-log'

export const insertSchoolUnitSchema = createInsertSchema(schoolUnits)
export const selectSchoolUnitSchema = createSelectSchema(schoolUnits)

export const insertClassSchema = createInsertSchema(classes)
export const selectClassSchema = createSelectSchema(classes)

export const insertUserSchema = createInsertSchema(users)
export const selectUserSchema = createSelectSchema(users)

export const insertChildSchema = createInsertSchema(children)
export const selectChildSchema = createSelectSchema(children)

export const insertLearningEntrySchema = createInsertSchema(learningEntries)
export const selectLearningEntrySchema = createSelectSchema(learningEntries)

export const insertArtefactSchema = createInsertSchema(artefacts)
export const selectArtefactSchema = createSelectSchema(artefacts)

export const insertLp21MappingSchema = createInsertSchema(lp21Mappings)
export const selectLp21MappingSchema = createSelectSchema(lp21Mappings)

export const insertFeedbackLinkSchema = createInsertSchema(feedbackLinks)
export const selectFeedbackLinkSchema = createSelectSchema(feedbackLinks)

export const insertAiAuditLogSchema = createInsertSchema(aiAuditLog)
export const selectAiAuditLogSchema = createSelectSchema(aiAuditLog)
