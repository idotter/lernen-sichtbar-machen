-- RLS-Policies für alle 9 Tabellen
-- Separate Migration — nicht von drizzle-kit verwaltet
-- Muss nach 0000_plain_nova.sql ausgeführt werden
--
-- Sicherheitsmodell:
-- - App-User (authenticated): Zugriff nur auf eigene school_id
-- - Service Role (Inngest Jobs): Kein RLS → explizite WHERE school_id = ... PFLICHT
-- - ai_audit_log: append-only (kein DELETE für authenticated)

-- ============================================================
-- RLS AKTIVIEREN
-- ============================================================

ALTER TABLE school_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE artefacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lp21_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HILFSFUNKTION: Aktuelle school_id aus Auth-Kontext
-- ============================================================

CREATE OR REPLACE FUNCTION get_current_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  -- UNION ALL mit expliziter Priorität — deterministisch: users vor children
  SELECT school_id FROM (
    SELECT school_id, 1 AS priority FROM users
      WHERE id = auth.uid() AND auth.uid() IS NOT NULL
    UNION ALL
    SELECT school_id, 2 AS priority FROM children
      WHERE supabase_user_id = auth.uid() AND auth.uid() IS NOT NULL
  ) ranked
  ORDER BY priority
  LIMIT 1
$$;

-- ============================================================
-- school_units: Schulleitung kann eigene Schuleinheit sehen
-- INSERT/UPDATE/DELETE: nur via service_role (Registrierungs-Flow)
-- ============================================================

CREATE POLICY "school_units_select_own" ON school_units
  FOR SELECT USING (id = get_current_school_id());

CREATE POLICY "school_units_no_insert" ON school_units
  FOR INSERT WITH CHECK (false);

CREATE POLICY "school_units_no_update" ON school_units
  FOR UPDATE USING (false);

CREATE POLICY "school_units_no_delete" ON school_units
  FOR DELETE USING (false);

-- ============================================================
-- classes: Alle Users einer Schuleinheit
-- ============================================================

CREATE POLICY "classes_school_isolation" ON classes
  FOR ALL USING (school_id = get_current_school_id());

-- ============================================================
-- users: LP/SL sehen User der eigenen Schuleinheit
-- ============================================================

CREATE POLICY "users_school_isolation" ON users
  FOR ALL USING (school_id = get_current_school_id());

-- ============================================================
-- children: LP/SL sehen Kinder ihrer Schuleinheit
-- Kinder sehen sich selbst
-- ============================================================

CREATE POLICY "children_school_isolation" ON children
  FOR ALL USING (
    school_id = get_current_school_id()
    OR supabase_user_id = auth.uid()
  );

-- ============================================================
-- learning_entries: Schul-Isolation + Kinder sehen nur eigene
-- ============================================================

CREATE POLICY "learning_entries_school_isolation" ON learning_entries
  FOR SELECT USING (school_id = get_current_school_id());

CREATE POLICY "learning_entries_child_write" ON learning_entries
  FOR INSERT WITH CHECK (
    school_id = get_current_school_id()
    AND child_id IN (SELECT id FROM children WHERE supabase_user_id = auth.uid())
  );

CREATE POLICY "learning_entries_child_update" ON learning_entries
  FOR UPDATE
  USING (child_id IN (SELECT id FROM children WHERE supabase_user_id = auth.uid()))
  WITH CHECK (
    school_id = get_current_school_id()
    AND child_id IN (SELECT id FROM children WHERE supabase_user_id = auth.uid())
  );

-- ============================================================
-- artefacts: Schul-Isolation
-- ============================================================

CREATE POLICY "artefacts_school_isolation" ON artefacts
  FOR SELECT USING (school_id = get_current_school_id());

CREATE POLICY "artefacts_child_write" ON artefacts
  FOR INSERT WITH CHECK (
    school_id = get_current_school_id()
    AND child_id IN (SELECT id FROM children WHERE supabase_user_id = auth.uid())
  );

CREATE POLICY "artefacts_child_update" ON artefacts
  FOR UPDATE
  USING (child_id IN (SELECT id FROM children WHERE supabase_user_id = auth.uid()))
  WITH CHECK (
    school_id = get_current_school_id()
    AND child_id IN (SELECT id FROM children WHERE supabase_user_id = auth.uid())
  );

-- ============================================================
-- lp21_mappings: LP kann sehen + bestätigen, KI schreibt via service_role
-- ============================================================

CREATE POLICY "lp21_mappings_school_isolation" ON lp21_mappings
  FOR SELECT USING (school_id = get_current_school_id());

CREATE POLICY "lp21_mappings_lp_confirm" ON lp21_mappings
  FOR UPDATE
  USING (
    school_id = get_current_school_id()
    AND auth.uid() IN (SELECT id FROM users WHERE role IN ('lehrperson', 'schulleitung'))
  )
  WITH CHECK (school_id = get_current_school_id());

-- ============================================================
-- feedback_links: Nur das Kind das den Link erstellt hat
-- FOR ALL aufgeteilt: INSERT braucht school_id-CHECK
-- ============================================================

CREATE POLICY "feedback_links_child_select" ON feedback_links
  FOR SELECT USING (
    child_id IN (SELECT id FROM children WHERE supabase_user_id = auth.uid())
  );

CREATE POLICY "feedback_links_child_insert" ON feedback_links
  FOR INSERT WITH CHECK (
    child_id IN (SELECT id FROM children WHERE supabase_user_id = auth.uid())
    AND school_id = get_current_school_id()
  );

CREATE POLICY "feedback_links_child_update" ON feedback_links
  FOR UPDATE
  USING (child_id IN (SELECT id FROM children WHERE supabase_user_id = auth.uid()))
  WITH CHECK (school_id = get_current_school_id());

CREATE POLICY "feedback_links_child_delete" ON feedback_links
  FOR DELETE USING (
    child_id IN (SELECT id FROM children WHERE supabase_user_id = auth.uid())
  );

CREATE POLICY "feedback_links_school_read" ON feedback_links
  FOR SELECT USING (school_id = get_current_school_id());

-- ============================================================
-- ai_audit_log: APPEND-ONLY
-- Kein DELETE für authenticated — EU AI Act Compliance
-- ============================================================

CREATE POLICY "ai_audit_log_school_select" ON ai_audit_log
  FOR SELECT USING (school_id = get_current_school_id());

CREATE POLICY "ai_audit_log_insert_only" ON ai_audit_log
  FOR INSERT WITH CHECK (
    school_id = get_current_school_id()
    AND actor_id = auth.uid()::text
  );

-- KEIN DELETE-Policy → DELETE schlägt für authenticated fehl
-- Service Role (Inngest) umgeht RLS vollständig → Schreibt via service_role Key
REVOKE DELETE ON ai_audit_log FROM authenticated;
