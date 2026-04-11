-- Migration 0002: Soft-Delete für classes + users, FK + Konsistenz-CHECKs
-- Hinzugefügt nach Code Review (Story 1.2, 2026-04-11)
-- Muss nach 0001_rls_policies.sql ausgeführt werden

-- ============================================================
-- Soft-Delete: classes
-- ============================================================

ALTER TABLE classes ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;
ALTER TABLE classes ADD COLUMN "deleted_at" timestamp;

-- ============================================================
-- Soft-Delete: users
-- ============================================================

ALTER TABLE users ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;
ALTER TABLE users ADD COLUMN "deleted_at" timestamp;

-- ============================================================
-- FK: lp21_mappings.confirmed_by_user_id → users.id
-- SET NULL bei User-Löschung — Audit-Trail bleibt erhalten
-- ============================================================

ALTER TABLE lp21_mappings
  ADD CONSTRAINT "lp21_mappings_confirmed_by_user_id_users_id_fk"
  FOREIGN KEY ("confirmed_by_user_id")
  REFERENCES "public"."users"("id")
  ON DELETE SET NULL ON UPDATE no action;

-- ============================================================
-- CHECK: Soft-Delete Konsistenz (is_deleted=true → deleted_at NOT NULL)
-- ============================================================

ALTER TABLE classes
  ADD CONSTRAINT "classes_soft_delete_consistency"
  CHECK (is_deleted = false OR deleted_at IS NOT NULL);

ALTER TABLE users
  ADD CONSTRAINT "users_soft_delete_consistency"
  CHECK (is_deleted = false OR deleted_at IS NOT NULL);

ALTER TABLE children
  ADD CONSTRAINT "children_soft_delete_consistency"
  CHECK (is_deleted = false OR deleted_at IS NOT NULL);

ALTER TABLE learning_entries
  ADD CONSTRAINT "learning_entries_soft_delete_consistency"
  CHECK (is_deleted = false OR deleted_at IS NOT NULL);

ALTER TABLE artefacts
  ADD CONSTRAINT "artefacts_soft_delete_consistency"
  CHECK (is_deleted = false OR deleted_at IS NOT NULL);

-- ============================================================
-- CHECK: feedback_links — revoked=true erfordert revoked_at
-- ============================================================

ALTER TABLE feedback_links
  ADD CONSTRAINT "feedback_links_revoked_consistency"
  CHECK (revoked = false OR revoked_at IS NOT NULL);

-- ============================================================
-- CHECK: lp21_mappings — confirmed=true erfordert confirmedAt + confirmedByUserId
-- ============================================================

ALTER TABLE lp21_mappings
  ADD CONSTRAINT "lp21_mappings_confirmation_consistency"
  CHECK (
    confirmed = false
    OR (confirmed_at IS NOT NULL AND confirmed_by_user_id IS NOT NULL)
  );

-- ============================================================
-- CHECK: artefacts — mindestens url ODER content NOT NULL
--        Dateigrösse wenn angegeben: 1 Byte – 10 MB
-- ============================================================

ALTER TABLE artefacts
  ADD CONSTRAINT "artefacts_content_required"
  CHECK (url IS NOT NULL OR content IS NOT NULL);

ALTER TABLE artefacts
  ADD CONSTRAINT "artefacts_file_size_bounds"
  CHECK (file_size_bytes IS NULL OR (file_size_bytes > 0 AND file_size_bytes <= 10485760));
