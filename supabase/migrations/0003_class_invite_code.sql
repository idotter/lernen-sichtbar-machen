-- Story 2.3: Einladungscode für Lernende
-- classes.invite_code (varchar 6, unique, nullable) — LP generiert Code, Kinder registrieren sich damit

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS invite_code VARCHAR(6) UNIQUE;

-- Index für Code-Lookup (Kind-Login)
CREATE INDEX IF NOT EXISTS idx_classes_invite_code ON classes(invite_code) WHERE invite_code IS NOT NULL;
