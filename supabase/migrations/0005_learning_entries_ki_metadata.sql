-- Story 4.3: KI-Metadata für learning_entries
-- - reasoning: Begründung der KI-Antwort (FR36, sichtbar im KIBadge-Popover)
-- - ki_confirmed_at: Zeitstempel der Bestätigung durch Lehrperson (UX-DR8)
-- - ki_confirmed_by: userId der bestätigenden Lehrperson

ALTER TABLE "learning_entries"
  ADD COLUMN IF NOT EXISTS "reasoning" text,
  ADD COLUMN IF NOT EXISTS "ki_confirmed_at" timestamp,
  ADD COLUMN IF NOT EXISTS "ki_confirmed_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
