-- Story 2.3 Code-Review Patch P4:
-- Partial UNIQUE-Index verhindert TOCTOU-Race bei Kind-Registrierung mit gleichem Namen.
-- Case-insensitiv durch LOWER() — korrespondiert zu Fix P5 in queries/children.ts.

CREATE UNIQUE INDEX IF NOT EXISTS idx_children_unique_name_per_class
  ON children (class_id, LOWER(display_name))
  WHERE is_deleted = false;
