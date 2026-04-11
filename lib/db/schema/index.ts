// lib/db/schema/index.ts
// Re-Export aller Schemas in Migrations-Reihenfolge (FK-Abhängigkeiten)
// Reihenfolge: school_units → classes → users → children → learning_entries
//              → artefacts → lp21_mappings → feedback_links → ai_audit_log

export * from './school-units'
export * from './classes'
export * from './users'
export * from './children'
export * from './learning-entries'
export * from './artefacts'
export * from './lp21-mappings'
export * from './feedback-links'
export * from './audit-log'
