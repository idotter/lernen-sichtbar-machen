// types/database.ts
// Drizzle-Inferenz-Typen — Single Source of Truth für alle DB-Typen
// Generiert aus lib/db/schema/ — nie manuell definieren

export type {
  SchoolUnit,
  NewSchoolUnit,
} from '@/lib/db/schema/school-units'

export type {
  Class,
  NewClass,
} from '@/lib/db/schema/classes'

export type {
  User,
  NewUser,
} from '@/lib/db/schema/users'

export type {
  Child,
  NewChild,
} from '@/lib/db/schema/children'

export type {
  LearningEntry,
  NewLearningEntry,
} from '@/lib/db/schema/learning-entries'

export type {
  Artefact,
  NewArtefact,
} from '@/lib/db/schema/artefacts'

export type {
  Lp21Mapping,
  NewLp21Mapping,
} from '@/lib/db/schema/lp21-mappings'

export type {
  FeedbackLink,
  NewFeedbackLink,
} from '@/lib/db/schema/feedback-links'

export type {
  AiAuditLog,
  NewAiAuditLog,
} from '@/lib/db/schema/audit-log'
